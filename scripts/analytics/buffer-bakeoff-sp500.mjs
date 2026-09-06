/**
 * Exit-buffer bakeoff over the S&P 500.
 *
 * Sweeps `exitBufferPct` while holding every other open/close rule fixed, then
 * writes docs/reports/buffer-bakeoff-sp500.md. Buffer 0 reproduces the Chart tab with
 * Exit buffer % set to none.
 *
 *   node scripts/buffer-bakeoff-sp500.mjs
 *
 * Prerequisites:
 *   - Network once at start to fetch the S&P 500 constituent list
 *   - MySQL reachable with backend/.env configured
 *   - daily_stock_data populated (npm run get-bulk-price-data)
 *   - symbol_daily_scan populated (npm run analyze-symbols) so each symbol uses
 *     its optimized fast/slow periods; symbols without a scan row fall back to 21/50
 *
 * Price/scan data: MySQL only — no FMP calls, no HTTP API for bars.
 * Symbol universe: public S&P 500 constituents JSON (same source as legacy get-symbols.mjs).
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { simulateTrades } from "../../frontend/src/tradeSignals.js";
import { closePool } from "../../backend/src/db.js";
import {
  loadBarsForSymbol,
  loadOptimizedMaForSymbol,
} from "../../backend/src/scanData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.join(
  __dirname,
  "..",
  "..",
  "docs",
  "reports",
  "buffer-bakeoff-sp500.md"
);

/** Same index feed used by scripts/get-symbols.mjs (legacy). */
const SP500_CONSTITUENTS_URL =
  "https://yfiua.github.io/index-constituents/constituents-sp500.json";

const BUFFERS = [0, 0.5, 1, 1.5, 2, 3, 4, 5];
const DEFAULT_MA = { fast: 21, slow: 50 };
const MA_TYPE = "sma";
const HISTORY_YEARS = Number(process.env.HISTORY_YEARS) || 3;

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

function fmtBuffer(buffer) {
  return buffer === 0 ? "0 (none)" : `${buffer}%`;
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

  const rows = BUFFERS.map((buffer) => {
    const { trades } = simulateTrades(bars, fast, slow, MA_TYPE, {
      exitBufferPct: buffer,
    });
    const closed = trades.filter((t) => !t.open);
    return {
      buffer,
      trades: closed.length,
      openTrades: trades.length - closed.length,
      returnPct: compoundedReturnPct(closed),
      winRatePct: winRatePct(closed),
      avgDays: avgCalendarDays(closed),
    };
  });

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

function cellFor(result, buffer) {
  return result.rows.find((r) => r.buffer === buffer);
}

function summarize(results) {
  return BUFFERS.map((buffer) => {
    const cells = results.map((r) => cellFor(r, buffer));
    const returns = cells.map((c) => c.returnPct).filter((v) => v != null);
    const winRates = cells.map((c) => c.winRatePct).filter((v) => v != null);
    const days = cells.map((c) => c.avgDays).filter((v) => v != null);
    const counts = cells.map((c) => c.trades);

    let improved = 0;
    let worsened = 0;
    let fewerTrades = 0;
    for (const result of results) {
      const base = cellFor(result, 0);
      const cell = cellFor(result, buffer);
      if (base.returnPct != null && cell.returnPct != null) {
        if (cell.returnPct > base.returnPct) improved++;
        else if (cell.returnPct < base.returnPct) worsened++;
      }
      if (cell.trades < base.trades) fewerTrades++;
    }

    return {
      buffer,
      medianReturn: median(returns),
      meanReturn: mean(returns),
      medianTrades: median(counts),
      meanTrades: mean(counts),
      medianWinRate: median(winRates),
      medianAvgDays: median(days),
      improved,
      worsened,
      fewerTrades,
      excluded: cells.length - returns.length,
    };
  });
}

function buildConclusion(summary) {
  const base = summary.find((s) => s.buffer === 0);
  if (!base || base.medianReturn == null) {
    return "No symbol produced a closed trade at buffer 0, so there is no baseline to compare against.";
  }

  const ranked = summary
    .filter((s) => s.medianReturn != null)
    .sort((a, b) => b.medianReturn - a.medianReturn);
  const best = ranked[0];
  const majority = summary.filter((s) => s.buffer !== 0 && s.improved > s.worsened);

  const lines = [];

  if (best.buffer === 0) {
    const runnerUp = ranked.find((s) => s.buffer !== 0);
    const runnerUpText = runnerUp
      ? `the best non-zero buffer is ${fmtBuffer(runnerUp.buffer)} at ${fmtSigned(runnerUp.medianReturn)}`
      : "no non-zero buffer produced a comparable median";
    lines.push(
      `**No buffer beat 0 on median return.** Baseline median is ${fmtSigned(base.medianReturn)}; ` +
        `${runnerUpText}. On this sample the exact fast-MA exit holds up.`
    );
  } else {
    const tradeDelta = best.medianTrades - base.medianTrades;
    lines.push(
      `**Best median return: buffer ${fmtBuffer(best.buffer)}** at ${fmtSigned(best.medianReturn)} ` +
        `vs ${fmtSigned(base.medianReturn)} at buffer 0 ` +
        `(${fmtSigned(best.medianReturn - base.medianReturn)} difference in median).`
    );
    lines.push(
      `It improved ${best.improved} of ${best.improved + best.worsened} comparable symbols and worsened ${best.worsened}, ` +
        `with median trade count ${fmtPlain(best.medianTrades)} vs ${fmtPlain(base.medianTrades)} ` +
        `(${tradeDelta === 0 ? "no change" : `${tradeDelta > 0 ? "+" : ""}${fmtPlain(tradeDelta)}`}) ` +
        `and median hold ${fmtPlain(best.medianAvgDays)} vs ${fmtPlain(base.medianAvgDays)} calendar days.`
    );
  }

  if (majority.length) {
    lines.push(
      `Buffers that helped more symbols than they hurt: ${majority
        .map((s) => `${fmtBuffer(s.buffer)} (${s.improved} up / ${s.worsened} down)`)
        .join(", ")}.`
    );
  } else {
    lines.push("No non-zero buffer improved more symbols than it worsened.");
  }

  lines.push(
    "Median is the headline number because a single outlier symbol can dominate the mean; " +
      "compare the two columns before acting on either."
  );

  return lines.join("\n\n");
}

// ---------- report ----------

function buildReport({ results, skipped, summary, elapsedSec, symbolCount }) {
  const from = results.map((r) => r.fromDate).sort()[0] ?? "n/a";
  const to = results.map((r) => r.toDate).sort().slice(-1)[0] ?? "n/a";
  const defaultMaSymbols = results.filter((r) => r.usedDefaultMa).map((r) => r.symbol);

  const out = [];

  out.push("# Exit-buffer bakeoff — S&P 500");
  out.push("");
  out.push(
    `Generated ${new Date().toISOString()} in ${elapsedSec}s by \`scripts/buffer-bakeoff-sp500.mjs\`.`
  );
  out.push("");

  out.push("## Run");
  out.push("");
  out.push("```bash");
  out.push("node scripts/buffer-bakeoff-sp500.mjs");
  out.push("```");
  out.push("");
  out.push("Prerequisites: network to fetch the S&P 500 list, MySQL with `backend/.env`,");
  out.push("`daily_stock_data` populated (`npm run get-bulk-price-data`), and");
  out.push("`symbol_daily_scan` populated (`npm run analyze-symbols`) for optimized MA periods.");
  out.push("");
  out.push("| Setting | Value |");
  out.push("| --- | --- |");
  out.push(`| Universe | S&P 500 constituents (${SP500_CONSTITUENTS_URL}) |`);
  out.push(`| History window | \`HISTORY_YEARS\` = ${HISTORY_YEARS} |`);
  out.push(`| Bar dates observed | ${from} → ${to} |`);
  out.push(`| Symbols requested | ${symbolCount} |`);
  out.push(`| Symbols analyzed | ${results.length} |`);
  out.push(`| Symbols skipped | ${skipped.length} |`);
  out.push(`| MA type | ${MA_TYPE.toUpperCase()} |`);
  out.push("| Open confirm | single (one close above fast) |");
  out.push(`| MA periods | per-symbol from \`symbol_daily_scan\`, else ${DEFAULT_MA.fast}/${DEFAULT_MA.slow} |`);
  out.push(`| Buffers tested | ${BUFFERS.join(", ")} |`);
  out.push("");
  out.push(
    "Only `exitBufferPct` varies. Every other open/close rule is unchanged, and signals come from"
  );
  out.push(
    "`simulateTrades` in `frontend/src/tradeSignals.js` — the same engine the Chart tab and nightly"
  );
  out.push("scan use, so buffer 0 matches the Chart with Exit buffer % set to none.");
  out.push("");

  if (defaultMaSymbols.length) {
    const shown = defaultMaSymbols.slice(0, 40).join(", ");
    const more =
      defaultMaSymbols.length > 40
        ? ` … (+${defaultMaSymbols.length - 40} more)`
        : "";
    out.push(
      `Fell back to ${DEFAULT_MA.fast}/${DEFAULT_MA.slow} (no \`symbol_daily_scan\` row): ${shown}${more}.`
    );
    out.push("");
  }

  out.push("## Summary per buffer");
  out.push("");
  out.push(
    "| Buffer | Median return | Mean return | Median trades | Mean trades | Median win rate | Median hold (days) | Improved vs 0 | Worsened vs 0 | Fewer trades vs 0 | No closed trades |"
  );
  out.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const s of summary) {
    out.push(
      `| ${fmtBuffer(s.buffer)} | ${fmtSigned(s.medianReturn)} | ${fmtSigned(s.meanReturn)} | ` +
        `${fmtPlain(s.medianTrades)} | ${fmtPlain(s.meanTrades)} | ${fmtPlain(s.medianWinRate)}% | ` +
        `${fmtPlain(s.medianAvgDays)} | ${s.buffer === 0 ? "—" : s.improved} | ` +
        `${s.buffer === 0 ? "—" : s.worsened} | ${s.buffer === 0 ? "—" : s.fewerTrades} | ${s.excluded} |`
    );
  }
  out.push("");
  out.push(
    "Symbols with no closed trades at a buffer have no defined return or win rate; those cells are"
  );
  out.push(
    "excluded from the medians and means (counted in the last column) so that a buffer which merely"
  );
  out.push("suppresses trading cannot look good on a smaller, luckier sample.");
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
    out.push("| Buffer | Trades | Return % | Win rate | Avg hold (days) | Still open |");
    out.push("| --- | --- | --- | --- | --- | --- |");
    for (const row of r.rows) {
      out.push(
        `| ${fmtBuffer(row.buffer)} | ${row.trades} | ${fmtSigned(row.returnPct)} | ` +
          `${row.winRatePct == null ? "n/a" : `${fmtPlain(row.winRatePct)}%`} | ` +
          `${fmtPlain(row.avgDays)} | ${row.openTrades} |`
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
  console.log("Fetching S&P 500 constituents…");
  const symbols = await loadSp500Symbols();
  console.log(
    `Exit-buffer bakeoff — S&P 500 — ${symbols.length} symbol(s) × ${BUFFERS.length} buffer(s)\n`
  );

  const results = [];
  const skipped = [];
  const t0 = Date.now();

  for (const sym of symbols) {
    try {
      const r = await evaluateSymbol(sym);
      if (r.status === "ok") {
        results.push(r);
        const base = cellFor(r, 0);
        console.log(
          `${sym.padEnd(6)} ${r.fast}/${r.slow}  ${String(base.trades).padStart(3)} trades  ` +
            `base ${fmtSigned(base.returnPct)}`
        );
      } else {
        skipped.push(r);
        console.log(`${sym.padEnd(6)} skipped (${r.reason})`);
      }
    } catch (err) {
      skipped.push({ symbol: sym, reason: `error: ${err.message || err}` });
      console.error(`${sym.padEnd(6)} ERROR: ${err.message || err}`);
    }
  }

  if (!results.length) {
    console.error("\nNo symbols produced results — nothing to report.");
    process.exitCode = 1;
    return;
  }

  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);
  const summary = summarize(results);
  const report = buildReport({
    results,
    skipped,
    summary,
    elapsedSec,
    symbolCount: symbols.length,
  });

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${report}\n`);

  console.log(
    `\nDone in ${elapsedSec}s — analyzed: ${results.length}, skipped: ${skipped.length}`
  );
  console.log(`Report: ${path.relative(process.cwd(), REPORT_PATH)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
