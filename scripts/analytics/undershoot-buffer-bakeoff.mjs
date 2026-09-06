/**
 * Per-symbol undershoot buffer bakeoff.
 *
 * For each symbol, measure how far price typically closes below the fast MA
 * on exit→re-entry events (see docs/undershoot-buffer-task.md), turn that into
 * a per-symbol exit buffer, and compare it to buffer 0.
 *
 *   node scripts/analytics/undershoot-buffer-bakeoff.mjs
 *   node scripts/analytics/undershoot-buffer-bakeoff.mjs --universe=dow30
 *   node scripts/analytics/undershoot-buffer-bakeoff.mjs --symbol AAPL
 *
 * Writes docs/reports/undershoot-buffer-<universe|symbols>.md
 *
 * Prerequisites: MySQL + backend/.env, daily_stock_data, symbol_daily_scan.
 * S&P run needs network once for the constituent list.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  bufferFromUndershoot,
  computeUndershootEvents,
} from "../../frontend/src/undershootBuffer.js";
import { simulateTrades } from "../../frontend/src/tradeSignals.js";
import { closePool } from "../../backend/src/db.js";
import {
  loadBarsForSymbol,
  loadOptimizedMaForSymbol,
} from "../../backend/src/scanData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SP500_CONSTITUENTS_URL =
  "https://yfiua.github.io/index-constituents/constituents-sp500.json";

const DOW30 = [
  "AAPL", "AMGN", "AMZN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS",
  "DOW", "GS", "HD", "HON", "IBM", "JNJ", "JPM", "KO", "MCD", "MMM",
  "MRK", "MSFT", "NKE", "NVDA", "PG", "SHW", "TRV", "UNH", "V", "VZ", "WMT",
];

const DEFAULT_MA = { fast: 21, slow: 50 };
const MA_TYPE = "sma";
const HISTORY_YEARS = Number(process.env.HISTORY_YEARS) || 3;

/** Below this many events, use buffer 0 for that symbol. */
const MIN_EVENTS = 3;
/** Cap so one deep event does not set a huge buffer. */
const MAX_BUFFER_PCT = 5;

// ---------- args ----------

function parseArgs(argv) {
  const out = { universe: "sp500", symbols: null, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.includes("=") ? arg.split(/=(.*)/s) : [arg, null];
    const value = inline ?? argv[i + 1];
    if (flag === "--universe") {
      out.universe = String(value || "").toLowerCase();
      if (inline == null) i++;
    } else if (flag === "--symbol") {
      out.symbols = String(value || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (inline == null) i++;
    } else if (flag === "--limit") {
      out.limit = Math.max(1, Number.parseInt(String(value), 10) || 0) || null;
      if (inline == null) i++;
    }
  }
  if (out.universe !== "dow30" && out.universe !== "sp500") {
    throw new Error(`--universe must be dow30 or sp500 (got "${out.universe}")`);
  }
  return out;
}

async function loadSp500Symbols() {
  const res = await fetch(SP500_CONSTITUENTS_URL);
  const body = await res.text();
  if (!res.ok) {
    throw new Error(
      `S&P 500 constituents fetch failed (${res.status}): ${body.slice(0, 200)}`
    );
  }
  const data = JSON.parse(body);
  if (!Array.isArray(data)) {
    throw new Error("S&P 500 JSON: expected an array");
  }
  const symbols = [
    ...new Set(
      data
        .map((entry) => String(entry.Symbol ?? entry.symbol ?? "").trim().toUpperCase())
        .filter(Boolean)
    ),
  ].sort();
  if (!symbols.length) {
    throw new Error("S&P 500 JSON: no symbols found");
  }
  return symbols;
}

async function loadUniverse(args) {
  if (args.symbols?.length) return args.symbols;
  if (args.universe === "dow30") return DOW30;
  console.log("Fetching S&P 500 constituents…");
  return loadSp500Symbols();
}

// ---------- metrics ----------

function compoundedReturnPct(closed) {
  if (!closed.length) return null;
  let factor = 1;
  for (const t of closed) {
    factor *= t.exitPrice / t.entryPrice;
  }
  return (factor - 1) * 100;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function runSim(bars, fast, slow, bufferPct) {
  const { trades } = simulateTrades(bars, fast, slow, MA_TYPE, {
    exitBufferPct: bufferPct,
  });
  const closed = trades.filter((t) => !t.open);
  return {
    trades: closed.length,
    returnPct: compoundedReturnPct(closed),
  };
}

function fmtSigned(v, digits = 1) {
  if (v == null || !Number.isFinite(v)) return "n/a";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

function fmtPlain(v, digits = 2) {
  if (v == null || !Number.isFinite(v)) return "n/a";
  return v.toFixed(digits);
}

/** Buffer % only; note only when capped or forced to 0. */
function fmtBufferCell(pct, reason) {
  const num = fmtPlain(pct);
  if (!reason) return num;
  if (reason.startsWith("fewer than") || reason.startsWith("capped")) {
    return `${num} (${reason})`;
  }
  return num;
}

// ---------- per-symbol ----------

async function evaluateSymbol(sym) {
  const bars = await loadBarsForSymbol(sym);
  if (!bars.length) {
    return { symbol: sym, status: "skip", reason: "no bars in daily_stock_data" };
  }

  const optimized = await loadOptimizedMaForSymbol(sym);
  const fast = optimized?.fast ?? DEFAULT_MA.fast;
  const slow = optimized?.slow ?? DEFAULT_MA.slow;

  if (bars.length <= slow) {
    return {
      symbol: sym,
      status: "skip",
      reason: `only ${bars.length} bars, slow period ${slow} never resolves`,
    };
  }

  const measured = computeUndershootEvents(bars, fast, slow);
  const fromMean = bufferFromUndershoot(measured, {
    useMedian: false,
    minEvents: MIN_EVENTS,
    maxBufferPct: MAX_BUFFER_PCT,
  });
  const fromMedian = bufferFromUndershoot(measured, {
    useMedian: true,
    minEvents: MIN_EVENTS,
    maxBufferPct: MAX_BUFFER_PCT,
  });

  const base = runSim(bars, fast, slow, 0);
  const meanBuf = runSim(bars, fast, slow, fromMean.bufferPct);
  const medianBuf = runSim(bars, fast, slow, fromMedian.bufferPct);

  return {
    symbol: sym,
    status: "ok",
    fast,
    slow,
    usedDefaultMa: !optimized,
    barCount: bars.length,
    fromDate: bars[0].date,
    toDate: bars[bars.length - 1].date,
    eventCount: measured.eventCount,
    discardedTrendBreak: measured.discardedTrendBreak,
    meanUndershootPct: measured.meanUndershootPct,
    medianUndershootPct: measured.medianUndershootPct,
    meanBufferPct: fromMean.bufferPct,
    meanBufferReason: fromMean.reason,
    medianBufferPct: fromMedian.bufferPct,
    medianBufferReason: fromMedian.reason,
    baseReturnPct: base.returnPct,
    baseTrades: base.trades,
    meanReturnPct: meanBuf.returnPct,
    meanTrades: meanBuf.trades,
    medianReturnPct: medianBuf.returnPct,
    medianTrades: medianBuf.trades,
  };
}

function delta(a, b) {
  if (a == null || b == null) return null;
  return a - b;
}

function scoreVsBase(results, returnKey) {
  let improved = 0;
  let worsened = 0;
  let same = 0;
  let fewerTrades = 0;
  const returns = [];
  const tradeCounts = [];
  const deltas = [];

  for (const r of results) {
    const base = r.baseReturnPct;
    const next = r[returnKey];
    returns.push(next);
    tradeCounts.push(
      returnKey === "meanReturnPct" ? r.meanTrades : r.medianTrades
    );
    if (base == null || next == null) continue;
    const d = next - base;
    deltas.push(d);
    if (d > 1e-9) improved += 1;
    else if (d < -1e-9) worsened += 1;
    else same += 1;
    const trades =
      returnKey === "meanReturnPct" ? r.meanTrades : r.medianTrades;
    if (trades < r.baseTrades) fewerTrades += 1;
  }

  return {
    medianReturn: median(returns.filter((v) => v != null)),
    meanReturn: mean(returns.filter((v) => v != null)),
    medianTrades: median(tradeCounts),
    improved,
    worsened,
    same,
    fewerTrades,
    medianDelta: median(deltas),
  };
}

// ---------- report ----------

function buildReport(args, results, skipped, startedAt) {
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  const slug = args.symbols?.length ? "symbols" : args.universe;
  const tooFew = results.filter((r) => r.eventCount < MIN_EVENTS);
  const baseScore = {
    medianReturn: median(results.map((r) => r.baseReturnPct).filter((v) => v != null)),
    medianTrades: median(results.map((r) => r.baseTrades)),
  };
  const meanScore = scoreVsBase(results, "meanReturnPct");
  const medianScore = scoreVsBase(results, "medianReturnPct");

  const lines = [];
  lines.push(`# Undershoot buffer bakeoff — ${slug}`);
  lines.push("");
  lines.push(
    `Generated ${new Date().toISOString()} in ${elapsedSec}s by \`scripts/analytics/undershoot-buffer-bakeoff.mjs\`.`
  );
  lines.push("");
  lines.push("## What we are testing");
  lines.push("");
  lines.push(
    "When price closes below the fast MA, the system exits. When it closes back above,"
  );
  lines.push(
    "the system can enter again. That out-and-back-in cycle is the problem."
  );
  lines.push("");
  lines.push(
    "For each stock we measure how far the close typically goes **below** the fast MA"
  );
  lines.push(
    "on those events, then use that percentage as that stock’s exit buffer."
  );
  lines.push(
    'Example: average undershoot 2% → exit only when close is under fast MA by 2%.'
  );
  lines.push("");
  lines.push("We compare:");
  lines.push("");
  lines.push("- **Buffer 0** — current rules (exit at the fast MA).");
  lines.push(
    "- **Average buffer** — per-symbol buffer from the average undershoot %."
  );
  lines.push(
    "- **Median buffer** — same idea, using the median undershoot % instead."
  );
  lines.push("");
  lines.push("## Event definition");
  lines.push("");
  lines.push(
    "1. Price closes below the fast MA (trade close), then later closes above the fast MA again (trade open). That pair is one **event**."
  );
  lines.push(
    "2. During the event, record how far below the fast MA the **close** went (worst %, as a percent of the fast MA)."
  );
  lines.push(
    "3. If the fast MA goes below the slow MA during the event, drop that event — the chart is no longer in an uptrend."
  );
  lines.push(
    "4. An event still open at the end of the history is not counted."
  );
  lines.push("");
  lines.push("## Settings");
  lines.push("");
  lines.push("| Setting | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Universe | ${slug} |`);
  lines.push(`| History years | ${HISTORY_YEARS} |`);
  lines.push(`| Symbols analyzed | ${results.length} |`);
  lines.push(`| Symbols skipped | ${skipped.length} |`);
  lines.push("| MA type | SMA |");
  lines.push("| MA periods | per-symbol from scan, else 21/50 |");
  lines.push("| Undershoot price | daily **close** (same as the exit rule) |");
  lines.push(
    `| Min events to use a buffer | **${MIN_EVENTS}** — fewer than this → buffer 0 |`
  );
  lines.push(
    `| Max buffer cap | **${MAX_BUFFER_PCT}%** — average/median above this is capped |`
  );
  lines.push("");
  lines.push(
    `${tooFew.length} symbol(s) had fewer than ${MIN_EVENTS} events and used buffer 0.`
  );
  lines.push("");
  lines.push("## Headline result");
  lines.push("");
  lines.push(
    "Decision guide (same idea as other bakeoffs): beat buffer 0 on **median return**, and have **more symbols improved than worsened**."
  );
  lines.push("");
  lines.push("| Rule | Median return | Median trades | Improved | Worsened | Same | Fewer trades | Median Δ vs buffer 0 |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  lines.push(
    `| Buffer 0 | ${fmtSigned(baseScore.medianReturn)} | ${fmtPlain(baseScore.medianTrades, 0)} | — | — | — | — | — |`
  );
  lines.push(
    `| Average undershoot buffer | ${fmtSigned(meanScore.medianReturn)} | ${fmtPlain(meanScore.medianTrades, 0)} | ${meanScore.improved} | ${meanScore.worsened} | ${meanScore.same} | ${meanScore.fewerTrades} | ${fmtSigned(meanScore.medianDelta)} |`
  );
  lines.push(
    `| Median undershoot buffer | ${fmtSigned(medianScore.medianReturn)} | ${fmtPlain(medianScore.medianTrades, 0)} | ${medianScore.improved} | ${medianScore.worsened} | ${medianScore.same} | ${medianScore.fewerTrades} | ${fmtSigned(medianScore.medianDelta)} |`
  );
  lines.push("");
  lines.push("## How to read this");
  lines.push("");
  lines.push(
    "- **Improved / worsened** — count of symbols whose compounded closed-trade return went up or down vs buffer 0."
  );
  lines.push(
    "- **Fewer trades** — symbols that took fewer closed trades with the buffer (often means fewer out-and-back-in cycles)."
  );
  lines.push(
    "- If median return is worse, or more symbols worsen than improve, do **not** put this in the nightly scan."
  );
  lines.push("");
  lines.push("## Per-symbol results");
  lines.push("");
  lines.push("### Column legend");
  lines.push("");
  lines.push("| Column | Meaning |");
  lines.push("| --- | --- |");
  lines.push("| Events | How many exit→re-entry events were counted for this stock |");
  lines.push(
    "| Avg % / Med % | Average / median of how far the close went below the fast MA on those events |"
  );
  lines.push(
    "| Avg buffer / Med buffer | Buffer % actually used in the sim (same as Avg % / Med % unless capped or forced to 0) |"
  );
  lines.push(
    "| Return (no buffer) | Compounded return with current rules — exit at the fast MA |"
  );
  lines.push(
    "| Return (avg buffer) | Compounded return using that stock’s average undershoot as the exit buffer |"
  );
  lines.push(
    "| Change (avg) | Return (avg buffer) minus Return (no buffer). Positive = average buffer helped |"
  );
  lines.push(
    "| Return (med buffer) | Compounded return using that stock’s median undershoot as the exit buffer |"
  );
  lines.push(
    "| Change (med) | Return (med buffer) minus Return (no buffer). Positive = median buffer helped |"
  );
  lines.push(
    "| Trades (none / avg / med) | Closed trade counts under no buffer, then average buffer, then median buffer |"
  );
  lines.push("");
  lines.push(
    "| Symbol | Fast/Slow | Events | Avg % | Med % | Avg buffer | Med buffer | Return (no buffer) | Return (avg buffer) | Change (avg) | Return (med buffer) | Change (med) | Trades (none / avg / med) |"
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");

  const sorted = [...results].sort((a, b) => a.symbol.localeCompare(b.symbol));
  for (const r of sorted) {
    const dMean = delta(r.meanReturnPct, r.baseReturnPct);
    const dMed = delta(r.medianReturnPct, r.baseReturnPct);
    lines.push(
      `| ${r.symbol} | ${r.fast}/${r.slow}${r.usedDefaultMa ? "*" : ""} | ${r.eventCount} | ${fmtPlain(r.meanUndershootPct)} | ${fmtPlain(r.medianUndershootPct)} | ${fmtBufferCell(r.meanBufferPct, r.meanBufferReason)} | ${fmtBufferCell(r.medianBufferPct, r.medianBufferReason)} | ${fmtSigned(r.baseReturnPct)} | ${fmtSigned(r.meanReturnPct)} | ${fmtSigned(dMean)} | ${fmtSigned(r.medianReturnPct)} | ${fmtSigned(dMed)} | ${r.baseTrades} / ${r.meanTrades} / ${r.medianTrades} |`
    );
  }
  lines.push("");
  lines.push(
    "\\* = used default 21/50 (no optimized scan row). Buffer cells only add a note when the value was capped or forced to 0 for too few events."
  );
  lines.push("");

  if (tooFew.length) {
    lines.push("## Symbols forced to buffer 0 (too few events)");
    lines.push("");
    lines.push(
      tooFew.map((r) => `${r.symbol} (${r.eventCount} events)`).join(", ")
    );
    lines.push("");
  }

  if (skipped.length) {
    lines.push("## Skipped symbols");
    lines.push("");
    for (const s of skipped) {
      lines.push(`- ${s.symbol}: ${s.reason}`);
    }
    lines.push("");
  }

  lines.push("## Next step");
  lines.push("");
  lines.push(
    "Read the headline table. If average or median buffer clearly beats buffer 0, write a short keep/drop note. Do not change the nightly scan until then."
  );
  lines.push("");

  return lines.join("\n");
}

// ---------- main ----------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let symbols = await loadUniverse(args);
  if (args.limit) symbols = symbols.slice(0, args.limit);

  const reportSlug = args.symbols?.length ? "symbols" : args.universe;
  const reportPath = path.join(
    __dirname,
    "..",
    "..",
    "docs",
    "reports",
    `undershoot-buffer-${reportSlug}.md`
  );

  console.log(
    `Undershoot buffer bakeoff — ${reportSlug} — ${symbols.length} symbol(s)\n`
  );

  const startedAt = Date.now();
  const results = [];
  const skipped = [];

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const row = await evaluateSymbol(sym);
    if (row.status === "skip") {
      skipped.push(row);
      console.log(`${sym.padEnd(6)} skip — ${row.reason}`);
      continue;
    }
    results.push(row);
    console.log(
      `${sym.padEnd(6)} ${String(row.eventCount).padStart(3)} events  ` +
        `avg ${fmtPlain(row.meanUndershootPct).padStart(5)}%  ` +
        `buf ${fmtPlain(row.meanBufferPct).padStart(5)}%  ` +
        `ret0 ${fmtSigned(row.baseReturnPct).padStart(7)}  ` +
        `retBuf ${fmtSigned(row.meanReturnPct).padStart(7)}`
    );
  }

  if (!results.length) {
    throw new Error("No symbols produced results — check MySQL / scan data.");
  }

  const report = buildReport(args, results, skipped, startedAt);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${report}\n`);
  console.log(`\nReport: ${path.relative(process.cwd(), reportPath)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
