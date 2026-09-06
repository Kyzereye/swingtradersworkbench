/**
 * ADX(14) regime-gate bakeoff.
 *
 * Sweeps the ADX entry threshold while holding every other open/close rule
 * fixed, then writes docs/reports/regime-gate-bakeoff-<universe>.md. The `off` column
 * reproduces the Chart tab with Exit buffer % set to none — the same baseline
 * the exit-buffer bakeoffs used, so the two reports are comparable line for line.
 *
 *   node scripts/regime-gate-bakeoff.mjs --universe=dow30   # smoke test
 *   node scripts/regime-gate-bakeoff.mjs                    # S&P 500 (default)
 *
 * Also accepts --symbol AAPL[,TSLA] and --limit N for quick single-symbol runs.
 *
 * Prerequisites:
 *   - MySQL reachable with backend/.env configured
 *   - daily_stock_data populated (npm run get-bulk-price-data)
 *   - symbol_daily_scan populated (npm run analyze-symbols) so each symbol uses
 *     its optimized fast/slow periods; symbols without a scan row fall back to 21/50
 *   - network once at start for --universe=sp500 (constituent list)
 *
 * Price/scan data: MySQL only — no FMP calls, no HTTP API for bars.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { computeAdxSeries } from "../../frontend/src/adx.js";
import { simulateTrades } from "../../frontend/src/tradeSignals.js";
import { closePool } from "../../backend/src/db.js";
import {
  loadBarsForSymbol,
  loadOptimizedMaForSymbol,
} from "../../backend/src/scanData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Same index feed used by scripts/get-symbols.mjs (legacy). */
const SP500_CONSTITUENTS_URL =
  "https://yfiua.github.io/index-constituents/constituents-sp500.json";

const DOW30 = [
  "AAPL", "AMGN", "AMZN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS",
  "DOW", "GS", "HD", "HON", "IBM", "JNJ", "JPM", "KO", "MCD", "MMM",
  "MRK", "MSFT", "NKE", "NVDA", "PG", "SHW", "TRV", "UNH", "V", "VZ", "WMT",
];

/** null = gate off (today's behavior). Entry needs ADX(14) > threshold. */
const THRESHOLDS = [null, 15, 20, 25, 30];
const ADX_PERIOD = 14;
const DEFAULT_MA = { fast: 21, slow: 50 };
const MA_TYPE = "sma";
const EXIT_BUFFER_PCT = 0;
const HISTORY_YEARS = Number(process.env.HISTORY_YEARS) || 3;

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

/** Compounded percent return from closed trades (same formula as the nightly scan). */
function compoundedReturnPct(closed) {
  if (!closed.length) return null;
  let factor = 1;
  for (const t of closed) {
    factor *= t.exitPrice / t.entryPrice;
  }
  return (factor - 1) * 100;
}

function winRatePct(closed) {
  if (!closed.length) return null;
  const wins = closed.filter((t) => t.exitPrice > t.entryPrice).length;
  return (wins / closed.length) * 100;
}

function utcNoon(dateStr) {
  return new Date(`${dateStr}T12:00:00Z`);
}

function avgCalendarDays(closed) {
  if (!closed.length) return null;
  let total = 0;
  for (const t of closed) {
    total += (utcNoon(t.exitDate) - utcNoon(t.entryDate)) / 86_400_000;
  }
  return total / closed.length;
}

/**
 * Bars held / total bars. Counts the still-open trade — it is real exposure,
 * even though it is excluded from the return math. The denominator is constant
 * across thresholds so the columns compare directly.
 */
function timeInMarketPct(trades, indexByDate, barCount) {
  if (!barCount) return null;
  let held = 0;
  for (const t of trades) {
    const start = indexByDate.get(t.entryDate);
    if (start == null) continue;
    const end = t.open ? barCount - 1 : indexByDate.get(t.exitDate);
    if (end == null) continue;
    held += end - start;
  }
  return (held / barCount) * 100;
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

function sum(values) {
  return values.reduce((a, b) => a + b, 0);
}

// ---------- formatting ----------

function fmtSigned(v, digits = 1) {
  if (v == null || !Number.isFinite(v)) return "n/a";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

function fmtPlain(v, digits = 1) {
  if (v == null || !Number.isFinite(v)) return "n/a";
  return v.toFixed(digits);
}

function fmtPct(v, digits = 1) {
  if (v == null || !Number.isFinite(v)) return "n/a";
  return `${v.toFixed(digits)}%`;
}

function fmtThreshold(threshold) {
  return threshold == null ? "off" : `ADX > ${threshold}`;
}

// ---------- per-symbol evaluation ----------

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

  const adxSeries = computeAdxSeries(bars, ADX_PERIOD);
  const indexByDate = new Map(bars.map((b, i) => [b.date, i]));

  const rows = THRESHOLDS.map((threshold) => {
    const { trades, markers, entriesBlocked } = simulateTrades(bars, fast, slow, MA_TYPE, {
      exitBufferPct: EXIT_BUFFER_PCT,
      adxSeries,
      adxMin: threshold,
    });
    const closed = trades.filter((t) => !t.open);
    return {
      threshold,
      trades: closed.length,
      markerCount: markers.length,
      openTrades: trades.length - closed.length,
      returnPct: compoundedReturnPct(closed),
      winRatePct: winRatePct(closed),
      avgDays: avgCalendarDays(closed),
      entriesBlocked,
      timeInMarketPct: timeInMarketPct(trades, indexByDate, bars.length),
    };
  });

  // Equivalence check: the `off` row must match a run with no gate options at
  // all. A report built on a broken baseline is worse than no report.
  const base = simulateTrades(bars, fast, slow, MA_TYPE, {
    exitBufferPct: EXIT_BUFFER_PCT,
  });
  const baseClosed = base.trades.filter((t) => !t.open);
  const offRow = rows.find((r) => r.threshold == null);
  const baseReturn = compoundedReturnPct(baseClosed);
  const returnsMatch =
    (baseReturn == null && offRow.returnPct == null) ||
    (baseReturn != null &&
      offRow.returnPct != null &&
      Math.abs(baseReturn - offRow.returnPct) < 1e-9);
  if (
    baseClosed.length !== offRow.trades ||
    base.markers.length !== offRow.markerCount ||
    offRow.entriesBlocked !== 0 ||
    !returnsMatch
  ) {
    return {
      symbol: sym,
      status: "mismatch",
      reason:
        `off row does not reproduce the ungated baseline ` +
        `(trades ${offRow.trades} vs ${baseClosed.length}, ` +
        `markers ${offRow.markerCount} vs ${base.markers.length}, ` +
        `blocked ${offRow.entriesBlocked}, ` +
        `return ${fmtSigned(offRow.returnPct)} vs ${fmtSigned(baseReturn)})`,
    };
  }

  return {
    symbol: sym,
    status: "ok",
    fast,
    slow,
    usedDefaultMa: !optimized,
    barCount: bars.length,
    fromDate: bars[0].date,
    toDate: bars[bars.length - 1].date,
    rows,
  };
}

// ---------- aggregation ----------

function cellFor(result, threshold) {
  return result.rows.find((r) => r.threshold === threshold);
}

function summarize(results) {
  return THRESHOLDS.map((threshold) => {
    const cells = results.map((r) => cellFor(r, threshold));
    const returns = cells.map((c) => c.returnPct).filter((v) => v != null);
    const winRates = cells.map((c) => c.winRatePct).filter((v) => v != null);
    const days = cells.map((c) => c.avgDays).filter((v) => v != null);
    const counts = cells.map((c) => c.trades);
    const blocked = cells.map((c) => c.entriesBlocked);
    const timeIn = cells.map((c) => c.timeInMarketPct).filter((v) => v != null);

    let improved = 0;
    let worsened = 0;
    let fewerTrades = 0;
    for (const result of results) {
      const base = cellFor(result, null);
      const cell = cellFor(result, threshold);
      if (base.returnPct != null && cell.returnPct != null) {
        if (cell.returnPct > base.returnPct) improved++;
        else if (cell.returnPct < base.returnPct) worsened++;
      }
      if (cell.trades < base.trades) fewerTrades++;
    }

    return {
      threshold,
      medianReturn: median(returns),
      meanReturn: mean(returns),
      medianTrades: median(counts),
      meanTrades: mean(counts),
      medianWinRate: median(winRates),
      medianAvgDays: median(days),
      medianBlocked: median(blocked),
      totalBlocked: sum(blocked),
      medianTimeInMarket: median(timeIn),
      improved,
      worsened,
      fewerTrades,
      excluded: cells.length - returns.length,
    };
  });
}

/**
 * Decision rule, fixed before the run: adopt a threshold only if it beats `off`
 * on median return AND improves more symbols than it worsens.
 */
function buildConclusion(summary) {
  const base = summary.find((s) => s.threshold == null);
  if (!base || base.medianReturn == null) {
    return "No symbol produced a closed trade with the gate off, so there is no baseline to compare against.";
  }

  const gated = summary.filter((s) => s.threshold != null);
  const qualifying = gated
    .filter(
      (s) =>
        s.medianReturn != null &&
        s.medianReturn > base.medianReturn &&
        s.improved > s.worsened
    )
    .sort((a, b) => b.medianReturn - a.medianReturn);

  const lines = [];
  lines.push(
    "**Decision rule, fixed before the run:** adopt a threshold only if it beats `off` on " +
      "median return **and** improves more symbols than it worsens. Both conditions, or nothing changes."
  );

  if (qualifying.length) {
    const best = qualifying[0];
    lines.push(
      `**${fmtThreshold(best.threshold)} clears both bars.** Median return ${fmtSigned(best.medianReturn)} ` +
        `vs ${fmtSigned(base.medianReturn)} with the gate off ` +
        `(${fmtSigned(best.medianReturn - base.medianReturn)} difference in median), ` +
        `improving ${best.improved} of ${best.improved + best.worsened} comparable symbols and worsening ${best.worsened}.`
    );
    lines.push(
      `It blocked a median of ${fmtPlain(best.medianBlocked, 0)} entry signals per symbol ` +
        `(${best.totalBlocked} in total) and cut median time in market from ` +
        `${fmtPct(base.medianTimeInMarket)} to ${fmtPct(best.medianTimeInMarket)}, ` +
        `with median trade count ${fmtPlain(best.medianTrades)} vs ${fmtPlain(base.medianTrades)}. ` +
        `Check that the return gain is larger than what the lost exposure alone would explain before adopting it.`
    );
    if (qualifying.length > 1) {
      lines.push(
        `Also clearing both bars: ${qualifying
          .slice(1)
          .map((s) => `${fmtThreshold(s.threshold)} (${fmtSigned(s.medianReturn)}, ${s.improved} up / ${s.worsened} down)`)
          .join(", ")}.`
      );
    }
  } else {
    const bestMedian = gated
      .filter((s) => s.medianReturn != null)
      .sort((a, b) => b.medianReturn - a.medianReturn)[0];
    const majority = gated.filter((s) => s.improved > s.worsened);
    lines.push(
      "**No threshold clears both bars, so nothing is wired into the nightly scan.** " +
        `Baseline median is ${fmtSigned(base.medianReturn)} with the gate off.`
    );
    lines.push(
      bestMedian
        ? `Best median among the gated runs: ${fmtThreshold(bestMedian.threshold)} at ${fmtSigned(bestMedian.medianReturn)} ` +
            `(${bestMedian.improved} up / ${bestMedian.worsened} down).`
        : "No gated threshold produced a comparable median."
    );
    lines.push(
      majority.length
        ? `Thresholds that helped more symbols than they hurt: ${majority
            .map((s) => `${fmtThreshold(s.threshold)} (${s.improved} up / ${s.worsened} down)`)
            .join(", ")}.`
        : "No threshold improved more symbols than it worsened."
    );
  }

  lines.push(
    "Read median return next to time in market: a gate that lifts the median purely by sitting out " +
      "is buying that median with lost exposure, not with edge. Median is the headline number because " +
      "a single outlier symbol can dominate the mean; compare the two columns before acting on either."
  );

  return lines.join("\n\n");
}

// ---------- report ----------

function buildReport({ universe, results, skipped, summary, elapsedSec, symbolCount }) {
  const from = results.map((r) => r.fromDate).sort()[0] ?? "n/a";
  const to = results.map((r) => r.toDate).sort().slice(-1)[0] ?? "n/a";
  const defaultMaSymbols = results.filter((r) => r.usedDefaultMa).map((r) => r.symbol);
  const label = universe === "dow30" ? "Dow 30" : "S&P 500";

  const out = [];

  out.push(`# ADX regime-gate bakeoff — ${label}`);
  out.push("");
  out.push(
    `Generated ${new Date().toISOString()} in ${elapsedSec}s by \`scripts/regime-gate-bakeoff.mjs\`.`
  );
  out.push("");

  out.push("## Run");
  out.push("");
  out.push("```bash");
  out.push(
    universe === "dow30"
      ? "node scripts/regime-gate-bakeoff.mjs --universe=dow30"
      : "node scripts/regime-gate-bakeoff.mjs"
  );
  out.push("```");
  out.push("");
  out.push("Prerequisites: MySQL reachable with `backend/.env` configured, `daily_stock_data`");
  out.push("populated (`npm run get-bulk-price-data`), and `symbol_daily_scan` populated");
  out.push("(`npm run analyze-symbols`) so each symbol uses its optimized MA periods.");
  if (universe === "sp500") {
    out.push("Also needs network once at start to fetch the S&P 500 constituent list.");
  }
  out.push("");
  out.push("| Setting | Value |");
  out.push("| --- | --- |");
  out.push(
    `| Universe | ${
      universe === "dow30" ? "Dow 30 (hardcoded list)" : `S&P 500 constituents (${SP500_CONSTITUENTS_URL})`
    } |`
  );
  out.push(`| History window | \`HISTORY_YEARS\` = ${HISTORY_YEARS} |`);
  out.push(`| Bar dates observed | ${from} → ${to} |`);
  out.push(`| Symbols requested | ${symbolCount} |`);
  out.push(`| Symbols analyzed | ${results.length} |`);
  out.push(`| Symbols skipped | ${skipped.length} |`);
  out.push(`| MA type | ${MA_TYPE.toUpperCase()} |`);
  out.push("| Open confirm | single (one close above fast) |");
  out.push(`| Exit buffer % | ${EXIT_BUFFER_PCT} (none) |`);
  out.push(
    `| MA periods | per-symbol from \`symbol_daily_scan\`, else ${DEFAULT_MA.fast}/${DEFAULT_MA.slow} |`
  );
  out.push(`| ADX period | ${ADX_PERIOD} (Wilder) |`);
  out.push(
    `| Thresholds tested | ${THRESHOLDS.map((t) => (t == null ? "off" : t)).join(", ")} |`
  );
  out.push("");
  out.push(
    "Only the ADX entry threshold varies. The gate is one additional AND condition on **new opens**:"
  );
  out.push(
    "an open also requires ADX(14) above the threshold on the signal bar. It never forces a close — a"
  );
  out.push(
    "falling ADX while in a position changes nothing. Every other open/close rule is unchanged, and"
  );
  out.push(
    "signals come from `simulateTrades` in `frontend/src/tradeSignals.js` — the same engine the Chart"
  );
  out.push(
    "tab and nightly scan use. Each symbol's `off` row is asserted against a run with no gate options"
  );
  out.push(
    "at all (trade count and compounded return) before this report is written, so `off` is the same"
  );
  out.push("baseline the exit-buffer bakeoffs reported at buffer 0.");
  out.push("");
  out.push(
    "MA periods are **not** co-tuned with the threshold — `docs/improvements.md` flags that as the overfitting trap."
  );
  out.push("");

  if (defaultMaSymbols.length) {
    const shown = defaultMaSymbols.slice(0, 40).join(", ");
    const more =
      defaultMaSymbols.length > 40 ? ` … (+${defaultMaSymbols.length - 40} more)` : "";
    out.push(
      `Fell back to ${DEFAULT_MA.fast}/${DEFAULT_MA.slow} (no \`symbol_daily_scan\` row): ${shown}${more}.`
    );
    out.push("");
  }

  out.push("## Summary per threshold");
  out.push("");
  out.push(
    "| Threshold | Median return | Mean return | Median trades | Mean trades | Median win rate | Median hold (days) | Median blocked | Total blocked | Median time in market | Improved vs off | Worsened vs off | Fewer trades vs off | No closed trades |"
  );
  out.push(
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const s of summary) {
    const isBase = s.threshold == null;
    out.push(
      `| ${fmtThreshold(s.threshold)} | ${fmtSigned(s.medianReturn)} | ${fmtSigned(s.meanReturn)} | ` +
        `${fmtPlain(s.medianTrades)} | ${fmtPlain(s.meanTrades)} | ${fmtPlain(s.medianWinRate)}% | ` +
        `${fmtPlain(s.medianAvgDays)} | ${fmtPlain(s.medianBlocked, 0)} | ${s.totalBlocked} | ` +
        `${fmtPct(s.medianTimeInMarket)} | ${isBase ? "—" : s.improved} | ` +
        `${isBase ? "—" : s.worsened} | ${isBase ? "—" : s.fewerTrades} | ${s.excluded} |`
    );
  }
  out.push("");
  out.push(
    "Symbols with no closed trades at a threshold have no defined return or win rate; those cells are"
  );
  out.push(
    "excluded from the medians and means (counted in the last column) so that a gate which merely"
  );
  out.push("suppresses trading cannot look good on a smaller, luckier sample.");
  out.push("");
  out.push(
    "**Entries blocked** counts signal bars where every core open condition passed and only the ADX"
  );
  out.push(
    "gate failed. **Time in market** is bars held ÷ total bars, counting a still-open position as"
  );
  out.push("exposure even though it is excluded from the return math.");
  out.push("");

  out.push("## Conclusion");
  out.push("");
  out.push(buildConclusion(summary));
  out.push("");

  out.push("## Per-symbol appendix");
  out.push("");
  for (const r of results) {
    out.push(
      `### ${r.symbol} — ${r.fast}/${r.slow} SMA${r.usedDefaultMa ? " (default)" : ""}, ` +
        `${r.barCount} bars, ${r.fromDate} → ${r.toDate}`
    );
    out.push("");
    out.push(
      "| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |"
    );
    out.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const row of r.rows) {
      out.push(
        `| ${fmtThreshold(row.threshold)} | ${row.trades} | ${fmtSigned(row.returnPct)} | ` +
          `${row.winRatePct == null ? "n/a" : `${fmtPlain(row.winRatePct)}%`} | ` +
          `${fmtPlain(row.avgDays)} | ${row.entriesBlocked} | ${fmtPct(row.timeInMarketPct)} | ` +
          `${row.openTrades} |`
      );
    }
    out.push("");
  }

  out.push("## Skipped symbols");
  out.push("");
  if (!skipped.length) {
    out.push("None — every requested symbol had enough history to analyze.");
  } else {
    out.push("| Symbol | Reason |");
    out.push("| --- | --- |");
    for (const s of skipped) {
      out.push(`| ${s.symbol} | ${s.reason} |`);
    }
  }
  out.push("");

  return out.join("\n");
}

// ---------- main ----------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let symbols = await loadUniverse(args);
  if (args.limit) symbols = symbols.slice(0, args.limit);

  const reportPath = path.join(
    __dirname,
    "..",
    "..",
    "docs",
    "reports",
    `regime-gate-bakeoff-${args.universe}.md`
  );

  console.log(
    `ADX regime-gate bakeoff — ${args.universe} — ${symbols.length} symbol(s) × ${THRESHOLDS.length} threshold(s)\n`
  );

  const results = [];
  const skipped = [];
  const mismatches = [];
  const t0 = Date.now();

  for (const sym of symbols) {
    try {
      const r = await evaluateSymbol(sym);
      if (r.status === "ok") {
        results.push(r);
        const base = cellFor(r, null);
        console.log(
          `${sym.padEnd(6)} ${r.fast}/${r.slow}  ${String(base.trades).padStart(3)} trades  ` +
            `off ${fmtSigned(base.returnPct)}`
        );
      } else if (r.status === "mismatch") {
        mismatches.push(r);
        console.error(`${sym.padEnd(6)} EQUIVALENCE FAILURE: ${r.reason}`);
      } else {
        skipped.push(r);
        console.log(`${sym.padEnd(6)} skipped (${r.reason})`);
      }
    } catch (err) {
      skipped.push({ symbol: sym, reason: `error: ${err.message || err}` });
      console.error(`${sym.padEnd(6)} ERROR: ${err.message || err}`);
    }
  }

  if (mismatches.length) {
    console.error(
      `\n${mismatches.length} symbol(s) failed the off-equivalence check ` +
        `(${mismatches.map((m) => m.symbol).join(", ")}). No report written — ` +
        `the gate has changed ungated behavior and must be fixed first.`
    );
    process.exitCode = 1;
    return;
  }

  if (!results.length) {
    console.error("\nNo symbols produced results — nothing to report.");
    process.exitCode = 1;
    return;
  }

  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);
  const summary = summarize(results);
  const report = buildReport({
    universe: args.universe,
    results,
    skipped,
    summary,
    elapsedSec,
    symbolCount: symbols.length,
  });

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${report}\n`);

  console.log(
    `\nDone in ${elapsedSec}s — analyzed: ${results.length}, skipped: ${skipped.length}`
  );
  console.log(`Report: ${path.relative(process.cwd(), reportPath)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
