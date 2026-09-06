/**
 * Per-symbol pullback tendency report.
 *
 * Measures how deep each symbol's normal uptrend pullbacks are and how often
 * they close below the fast MA, then asks whether that tendency (a) persists
 * across time and (b) relates to what the strategy actually earned. Writes
 * docs/reports/pullback-tendency-<universe>.md.
 *
 * This is a DIAGNOSTIC. No open/close rule changes, no exit buffer — the
 * buffer lost in both directions (docs/improvement-options.md §1) and is not
 * revisited here. simulateTrades is called with its defaults only.
 *
 *   node scripts/pullback-tendency.mjs --symbol AAPL        # single-symbol check
 *   node scripts/pullback-tendency.mjs --universe=dow30     # smoke test
 *   node scripts/pullback-tendency.mjs                      # S&P 500 (default)
 *
 * Also accepts --limit N.
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

import {
  computePullbackTendency,
  summarizeWindow,
} from "../../frontend/src/pullbackTendency.js";
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

const DEFAULT_MA = { fast: 21, slow: 50 };
const MA_TYPE = "sma";
const HISTORY_YEARS = Number(process.env.HISTORY_YEARS) || 3;
const MIN_DEPTH_PCT = 1;
const DEPTH_FLOORS = [0.5, 1, 2];
const ATR_PERIOD = 14;
const QUINTILES = 5;
const TERCILES = 3;

/**
 * The tendency metrics carried through persistence, quintiles and stratification.
 * `dir` records which end of the metric the "clean uptrend" hypothesis predicts
 * earns more, so the conclusion can state a direction instead of eyeballing it.
 */
const METRICS = [
  { key: "medianDepthPct", label: "Median pullback depth %", predicts: "low" },
  { key: "medianDepthAtr", label: "Median depth (ATR units)", predicts: "low" },
  { key: "barPierceRate", label: "Bar pierce rate %", predicts: "low" },
  { key: "episodePierceRateRecovered", label: "Episode pierce rate % (recovered)", predicts: "low" },
  { key: "breakSharePct", label: "Break share % of episodes", predicts: "low" },
];

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

// ---------- statistics ----------

/** Average ranks, ties shared — the input to Spearman. */
function rankArray(values) {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const shared = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[order[k][1]] = shared;
    i = j + 1;
  }
  return ranks;
}

/**
 * Spearman rank correlation. Rank rather than Pearson because per-symbol
 * returns are heavy-tailed — one outlier symbol would otherwise set the answer,
 * the same reason every report in docs/ leads with medians.
 */
function spearman(xs, ys) {
  const pairs = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    pairs.push([x, y]);
  }
  if (pairs.length < 3) return { rho: null, n: pairs.length };
  const rx = rankArray(pairs.map((p) => p[0]));
  const ry = rankArray(pairs.map((p) => p[1]));
  const n = rx.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i] - mx;
    const b = ry[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return { rho: null, n };
  return { rho: num / Math.sqrt(dx * dy), n };
}

/** Split rows into k equal-count buckets ascending by keyFn; nulls dropped. */
function bucketBy(rows, keyFn, k) {
  const valid = rows.filter((r) => {
    const v = keyFn(r);
    return v != null && Number.isFinite(v);
  });
  const sorted = [...valid].sort((a, b) => keyFn(a) - keyFn(b));
  const out = [];
  for (let i = 0; i < k; i++) {
    const lo = Math.floor((i * sorted.length) / k);
    const hi = Math.floor(((i + 1) * sorted.length) / k);
    out.push(sorted.slice(lo, hi));
  }
  return out;
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

function fmtRho(v) {
  if (v == null || !Number.isFinite(v)) return "n/a";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(3)}`;
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

  const opts = { minDepthPct: MIN_DEPTH_PCT, atrPeriod: ATR_PERIOD };
  const full = computePullbackTendency(bars, fast, slow, opts);

  // Halves come from partitioning the SINGLE full-history walk by peak index,
  // not from re-walking a slice. Re-walking restarts the segment state at the
  // slice edge, re-anchors the peak on a mid-segment bar and invents episodes
  // the full run never saw — which is also why episode counts across halves are
  // additive here by construction rather than by assertion.
  const usableStart = slow;
  const mid = usableStart + Math.floor((bars.length - usableStart) / 2);
  const half1 = summarizeWindow(full, usableStart, mid);
  const half2 = summarizeWindow(full, mid, bars.length);

  // Noise-floor sensitivity: does the metric survive a different definition of
  // "too shallow to count"?
  const floors = DEPTH_FLOORS.map((floor) => {
    const t = computePullbackTendency(bars, fast, slow, { ...opts, minDepthPct: floor });
    return { floor, episodeCount: t.episodeCount, medianDepthPct: t.medianDepthPct };
  });

  // Two returns. The optimized pair is what the dashboard shows but is
  // selection-biased (docs/ma-optimization-review.md §5); fixed 21/50 involves
  // no per-symbol selection at all and is the control.
  const optRun = simulateTrades(bars, fast, slow, MA_TYPE);
  const optClosed = optRun.trades.filter((t) => !t.open);
  const fixedRun = simulateTrades(bars, DEFAULT_MA.fast, DEFAULT_MA.slow, MA_TYPE);
  const fixedClosed = fixedRun.trades.filter((t) => !t.open);

  return {
    symbol: sym,
    status: "ok",
    fast,
    slow,
    usedDefaultMa: !optimized,
    barCount: bars.length,
    fromDate: bars[0].date,
    toDate: bars[bars.length - 1].date,
    full,
    half1,
    half2,
    floors,
    optReturnPct: compoundedReturnPct(optClosed),
    optTrades: optClosed.length,
    optWinRate: winRatePct(optClosed),
    optAvgDays: avgCalendarDays(optClosed),
    fixedReturnPct: compoundedReturnPct(fixedClosed),
    fixedTrades: fixedClosed.length,
    medianAtrPct: full.medianAtrPct,
  };
}

// ---------- self-check ----------

/**
 * Per-symbol definition checks. These are things that cannot be true if the
 * walk is correct — not statistical expectations. A symbol that trips one is
 * noted and excluded from the aggregates; the run continues, because one odd
 * symbol must never cost a 500-symbol job.
 *
 * Deliberately NOT checked:
 *   - Episode counts adding across halves. Only meaningful because halves are
 *     partitioned from one walk; asserting it tested the harness, not the data.
 *   - Pooled median depth >= recovered-only median. That assumed break episodes
 *     are always the deep ones. They are not: when fast and slow sit close
 *     together a segment can break on a shallow wobble, so a small gap the other
 *     way is ordinary. Reported below as a note instead.
 */
function checkSymbol(r) {
  const issues = [];
  const t = r.full;

  if (t.recoveredCount + t.breakCount !== t.episodeCount) {
    issues.push(
      `recovered+break (${t.recoveredCount}+${t.breakCount}) != episodeCount (${t.episodeCount})`
    );
  }
  if (t.barPierceRate != null && (t.barPierceRate < 0 || t.barPierceRate > 100)) {
    issues.push(`bar pierce rate out of range (${t.barPierceRate})`);
  }
  for (const e of t.episodes) {
    if (!(e.depthPct >= MIN_DEPTH_PCT)) {
      issues.push(`episode at ${e.peakDate} is below the ${MIN_DEPTH_PCT}% floor`);
      break;
    }
    if (e.troughIndex < e.peakIndex) {
      issues.push(`trough precedes peak at ${e.peakDate}`);
      break;
    }
    // close <= slow while fast > slow implies close < fast.
    if (e.breakPierceImplied && !e.pierced) {
      issues.push(`break at ${e.breakDate} implies a pierce but is not flagged`);
      break;
    }
  }
  return issues;
}

/** Informational only — never excludes a symbol. */
const BREAK_DEPTH_NOTE_RATIO = 0.6;

function breakDepthNote(r) {
  const t = r.full;
  if (t.medianDepthPctBreak == null || t.medianDepthPctRecovered == null) return null;
  if (t.medianDepthPctBreak >= t.medianDepthPctRecovered * BREAK_DEPTH_NOTE_RATIO) return null;
  return {
    symbol: r.symbol,
    breakMedian: t.medianDepthPctBreak,
    recoveredMedian: t.medianDepthPctRecovered,
    breakCount: t.breakCount,
  };
}

// ---------- aggregation ----------

function persistenceRows(results) {
  return METRICS.map((m) => {
    const { rho, n } = spearman(
      results.map((r) => r.half1[m.key]),
      results.map((r) => r.half2[m.key])
    );
    return { ...m, rho, n };
  });
}

function quintileRows(results, metric) {
  const buckets = bucketBy(results, (r) => r.full[metric.key], QUINTILES);
  return buckets.map((rows, i) => ({
    index: i + 1,
    n: rows.length,
    metricMedian: median(rows.map((r) => r.full[metric.key]).filter((v) => v != null)),
    optReturn: median(rows.map((r) => r.optReturnPct).filter((v) => v != null)),
    fixedReturn: median(rows.map((r) => r.fixedReturnPct).filter((v) => v != null)),
    trades: median(rows.map((r) => r.optTrades)),
    holdDays: median(rows.map((r) => r.optAvgDays).filter((v) => v != null)),
    atrPct: median(rows.map((r) => r.medianAtrPct).filter((v) => v != null)),
  }));
}

/**
 * The control that matters: ATR% scales returns without improving accuracy
 * (docs/improvement-options.md §3), so an unstratified relationship between a
 * depth metric and return may be nothing but volatility restated.
 */
function atrStratifiedRows(results, metric) {
  const atrBuckets = bucketBy(results, (r) => r.medianAtrPct, QUINTILES);
  return atrBuckets.map((rows, i) => {
    const terciles = bucketBy(rows, (r) => r.full[metric.key], TERCILES);
    return {
      index: i + 1,
      n: rows.length,
      atrMedian: median(rows.map((r) => r.medianAtrPct).filter((v) => v != null)),
      terciles: terciles.map((t) => ({
        n: t.length,
        optReturn: median(t.map((r) => r.optReturnPct).filter((v) => v != null)),
        fixedReturn: median(t.map((r) => r.fixedReturnPct).filter((v) => v != null)),
      })),
    };
  });
}

function summarize(results) {
  const persistence = persistenceRows(results);
  const quintiles = METRICS.map((m) => ({ metric: m, rows: quintileRows(results, m) }));
  const stratified = METRICS.map((m) => ({ metric: m, rows: atrStratifiedRows(results, m) }));

  const tautology = spearman(
    results.map((r) => r.full.barPierceRate),
    results.map((r) => r.optTrades)
  );
  const depthVsAtr = spearman(
    results.map((r) => r.full.medianDepthPct),
    results.map((r) => r.medianAtrPct)
  );
  const directReturn = METRICS.map((m) => ({
    ...m,
    opt: spearman(
      results.map((r) => r.full[m.key]),
      results.map((r) => r.optReturnPct)
    ),
    fixed: spearman(
      results.map((r) => r.full[m.key]),
      results.map((r) => r.fixedReturnPct)
    ),
  }));

  return { persistence, quintiles, stratified, tautology, depthVsAtr, directReturn };
}

// ---------- conclusion ----------

const PERSISTENCE_MIN_RHO = 0.3;

function buildConclusion(summary, results) {
  const lines = [];
  const persistent = summary.persistence.filter(
    (p) => p.rho != null && p.rho >= PERSISTENCE_MIN_RHO
  );
  const notPersistent = summary.persistence.filter(
    (p) => p.rho == null || p.rho < PERSISTENCE_MIN_RHO
  );

  lines.push(
    `**Persistence gate (rho >= ${PERSISTENCE_MIN_RHO} between the two halves).** ` +
      (persistent.length
        ? `Passed by: ${persistent.map((p) => `${p.label} (${fmtRho(p.rho)})`).join(", ")}.`
        : "No metric passed. On this sample pullback tendency does not persist across time, " +
          "which is decisive: a characteristic that does not repeat cannot rank or filter " +
          "anything, however well it correlates in-sample.") +
      (notPersistent.length && persistent.length
        ? ` Failed by: ${notPersistent.map((p) => `${p.label} (${fmtRho(p.rho)})`).join(", ")} — ` +
          "treat those as noise regardless of what the quintile tables show."
        : "")
  );

  lines.push(
    `**Is it just volatility?** Median pullback depth vs median ATR%: ${fmtRho(summary.depthVsAtr.rho)} ` +
      `(n=${summary.depthVsAtr.n}). The closer that sits to +1, the more the raw depth metric is ` +
      "ATR wearing a different hat, and the more the within-ATR-quintile tables are the only ones worth reading."
  );

  lines.push(
    `**Tautology check.** Bar pierce rate vs trade count: ${fmtRho(summary.tautology.rho)} ` +
      `(n=${summary.tautology.n}). Pierce rate is close to "how often the exit rule fires", so a ` +
      "high correlation here means the metric is largely restating trade count rather than adding information."
  );

  for (const d of summary.directReturn) {
    lines.push(
      `**${d.label}** vs return: optimized ${fmtRho(d.opt.rho)}, fixed 21/50 ${fmtRho(d.fixed.rho)}. ` +
        (d.opt.rho != null && d.fixed.rho != null && Math.sign(d.opt.rho) !== Math.sign(d.fixed.rho)
          ? "**The sign flips between the two return columns** — the optimized relationship is a " +
            "grid-search artefact, not a property of the symbol."
          : "Both columns agree in sign, so the relationship is not purely an artefact of the per-symbol MA fit.")
    );
  }

  const anyBucketNegative = summary.quintiles.some((q) =>
    q.rows.some((r) => r.optReturn != null && r.optReturn < 0)
  );
  lines.push(
    anyBucketNegative
      ? "At least one tendency bucket has a negative median return, so a filter is at least arguable — " +
        "check that the same bucket is negative in the fixed 21/50 column before believing it."
      : "**Every tendency bucket has a positive median return.** That is the same shape every prior " +
        "gate ran into (docs/improvement-options.md §1): blocking a profitable bucket deletes " +
        "expectancy. If this metric is used at all, it is a ranking key under scarce slots, not a filter."
  );

  lines.push(
    "Median is the headline number because a single outlier symbol can dominate the mean, and " +
      "Spearman is used throughout for the same reason."
  );

  return lines.join("\n\n");
}

// ---------- report ----------

function buildReport({ universe, results, skipped, summary, elapsedSec, symbolCount, flagged }) {
  const from = results.map((r) => r.fromDate).sort()[0] ?? "n/a";
  const to = results.map((r) => r.toDate).sort().slice(-1)[0] ?? "n/a";
  const defaultMaSymbols = results.filter((r) => r.usedDefaultMa).map((r) => r.symbol);
  const label = universe === "dow30" ? "Dow 30" : "S&P 500";

  const out = [];

  out.push(`# Pullback tendency — ${label}`);
  out.push("");
  out.push(
    `Generated ${new Date().toISOString()} in ${elapsedSec}s by \`scripts/pullback-tendency.mjs\`.`
  );
  out.push("");

  out.push("## Run");
  out.push("");
  out.push("```bash");
  out.push(
    universe === "dow30"
      ? "node scripts/pullback-tendency.mjs --universe=dow30"
      : "node scripts/pullback-tendency.mjs"
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
  out.push(`| Symbols flagged | ${flagged.length} |`);
  out.push(`| MA type | ${MA_TYPE.toUpperCase()} |`);
  out.push(
    `| MA periods | per-symbol from \`symbol_daily_scan\`, else ${DEFAULT_MA.fast}/${DEFAULT_MA.slow} |`
  );
  out.push(`| Noise floor | ${MIN_DEPTH_PCT}% (sensitivity at ${DEPTH_FLOORS.join(" / ")}%) |`);
  out.push(`| ATR period | ${ATR_PERIOD} (Wilder) |`);
  out.push("");
  out.push(
    "**No rule changed.** `simulateTrades` is called with its defaults — SMA, single confirm, exit"
  );
  out.push(
    "buffer 0 — so the return columns are the same numbers the nightly scan and Chart tab produce."
  );
  out.push("The exit buffer lost in both directions and is not revisited here.");
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

  out.push("## Definitions");
  out.push("");
  out.push(
    "**Trend-intact segment** — a maximal run of bars with close above the slow MA and fast above"
  );
  out.push("slow. A decline outside one of these is a downtrend, not a pullback.");
  out.push("");
  out.push(
    "**Pullback episode** — inside a segment, price trading below the running peak of `high`. The"
  );
  out.push(
    "episode ends on a new high (**recovered**) or when the segment breaks (**break**). Depth is"
  );
  out.push(
    "peak → trough, in percent and in ATR units at the peak bar. Dips shallower than the noise floor"
  );
  out.push(
    "are discarded, but the peak is **not** reset when one is — so a shallow dip that deepens without"
  );
  out.push("an intervening new high is one deep episode, not zero.");
  out.push("");
  out.push("**Depth pools, pierce rate splits.** The two conventions differ on purpose:");
  out.push("");
  out.push(
    "- Depth statistics **include break episodes**. Segment-ending dips are often the deep ones and"
  );
  out.push(
    "  cluster in exactly the choppy names this metric exists to identify — excluding them would tend"
  );
  out.push(
    "  to make a symbol look *shallower* the worse it actually behaves. They are not *always* deep:"
  );
  out.push(
    "  when fast and slow sit close together a segment can break on a shallow wobble, which is why"
  );
  out.push("  this is a reporting split and not an assertable invariant.");
  out.push(
    "- The headline pierce rate uses **recovered episodes only**. A break by close ≤ slow while"
  );
  out.push(
    "  fast > slow implies close < slow < fast, so break episodes are pierced *by construction*;"
  );
  out.push(
    "  pooling them would manufacture a pierce rate that only tracks how often trends end. The"
  );
  out.push("  all-episode rate is shown beside it so the gap is visible.");
  out.push("");
  out.push(
    "**Unresolved episodes** — one open at the window edge has no final trough, so it is not recorded."
  );
  out.push(
    "That drops in the same direction as excluding breaks would, so the count is reported per symbol"
  );
  out.push("rather than dropped silently.");
  out.push("");

  out.push("## Persistence");
  out.push("");
  out.push(
    "Spearman rho between each symbol's first-half and second-half measurement, across symbols."
  );
  out.push(
    "Both halves cover the same number of measurable bars; the MAs and ATR still warm up on full"
  );
  out.push("history, so the second half sees the values a full-history run would.");
  out.push("");
  out.push(
    "**This is the gating result.** A tendency that does not repeat cannot rank or filter anything,"
  );
  out.push("no matter how well it correlates in-sample.");
  out.push("");
  out.push("| Metric | Spearman rho (half 1 → half 2) | n | Passes ≥ 0.3 |");
  out.push("| --- | --- | --- | --- |");
  for (const p of summary.persistence) {
    const pass = p.rho != null && p.rho >= PERSISTENCE_MIN_RHO ? "yes" : "**no**";
    out.push(`| ${p.label} | ${fmtRho(p.rho)} | ${p.n} | ${pass} |`);
  }
  out.push("");

  out.push("## Tendency vs return");
  out.push("");
  out.push(
    "Symbols sorted into quintiles by each metric (1 = lowest). Two return columns: the per-symbol"
  );
  out.push(
    "**optimized** pair, which is what the dashboard shows but is selection-biased across 431 grid"
  );
  out.push(
    "candidates, and a **fixed 21/50** control that involves no per-symbol selection at all. A"
  );
  out.push("relationship present only in the optimized column is a fitting artefact.");
  out.push("");
  if (results.length / QUINTILES < 5) {
    out.push(
      `> **Small sample.** ${results.length} symbols is about ` +
        `${(results.length / QUINTILES).toFixed(1)} per quintile — indicative at best.`
    );
    out.push("");
  }
  for (const q of summary.quintiles) {
    out.push(`### ${q.metric.label}`);
    out.push("");
    out.push(
      "| Quintile | n | Metric median | Median return (optimized) | Median return (fixed 21/50) | Median trades | Median hold (days) | Median ATR% |"
    );
    out.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const r of q.rows) {
      out.push(
        `| ${r.index} | ${r.n} | ${fmtPlain(r.metricMedian, 2)} | ${fmtSigned(r.optReturn)} | ` +
          `${fmtSigned(r.fixedReturn)} | ${fmtPlain(r.trades, 0)} | ${fmtPlain(r.holdDays)} | ` +
          `${fmtPct(r.atrPct, 2)} |`
      );
    }
    out.push("");
  }

  out.push("## Within ATR quintiles");
  out.push("");
  out.push(
    "The control that matters. ATR% scales returns without improving accuracy, so a relationship"
  );
  out.push(
    "that vanishes inside a volatility bucket was volatility all along. Each row is one ATR quintile;"
  );
  out.push(
    "inside it symbols are split into terciles by the metric (T1 = lowest). Optimized return first,"
  );
  out.push("fixed 21/50 in parentheses.");
  out.push("");
  const perCell = results.length / (QUINTILES * TERCILES);
  if (perCell < 5) {
    out.push(
      `> **This table is not interpretable on this sample.** ${results.length} symbols across ` +
        `${QUINTILES} ATR quintiles x ${TERCILES} terciles leaves about ${perCell.toFixed(1)} symbols ` +
        "per cell, so each number is one or two names rather than a median. Stratification needs a " +
        "few hundred symbols — run the S&P universe before reading anything here."
    );
    out.push("");
  }
  for (const s of summary.stratified) {
    out.push(`### ${s.metric.label}`);
    out.push("");
    out.push("| ATR quintile | n | Median ATR% | T1 (low) | T2 | T3 (high) |");
    out.push("| --- | --- | --- | --- | --- | --- |");
    for (const r of s.rows) {
      const cells = r.terciles.map(
        (t) => `${fmtSigned(t.optReturn)} (${fmtSigned(t.fixedReturn)}) n=${t.n}`
      );
      out.push(
        `| ${r.index} | ${r.n} | ${fmtPct(r.atrMedian, 2)} | ${cells[0] ?? "n/a"} | ` +
          `${cells[1] ?? "n/a"} | ${cells[2] ?? "n/a"} |`
      );
    }
    out.push("");
  }

  out.push("## Tautology check");
  out.push("");
  out.push(
    `Bar pierce rate vs trade count: **${fmtRho(summary.tautology.rho)}** (n=${summary.tautology.n}).`
  );
  out.push(
    "Pierce rate is close to \"how often the exit rule fires\", so this is reported rather than"
  );
  out.push("assumed away — a high value means the metric largely restates trade count.");
  out.push("");
  out.push(
    `Median pullback depth vs median ATR%: **${fmtRho(summary.depthVsAtr.rho)}** (n=${summary.depthVsAtr.n}).`
  );
  out.push("The closer to +1, the more the raw depth metric is simply volatility.");
  out.push("");
  out.push("| Metric | rho vs optimized return | rho vs fixed 21/50 return | n |");
  out.push("| --- | --- | --- | --- |");
  for (const d of summary.directReturn) {
    out.push(`| ${d.label} | ${fmtRho(d.opt.rho)} | ${fmtRho(d.fixed.rho)} | ${d.opt.n} |`);
  }
  out.push("");

  out.push("## Conclusion");
  out.push("");
  out.push(buildConclusion(summary, results));
  out.push("");

  out.push("## Per-symbol appendix");
  out.push("");
  out.push(
    "| Symbol | MA | Episodes | Rec / Brk | Median depth % | Median depth (ATR) | Pierce % (rec) | Pierce % (all) | Bar pierce % | Break share % | Unresolved | Return (opt) | Return (21/50) | Trades |"
  );
  out.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of results) {
    const t = r.full;
    out.push(
      `| ${r.symbol} | ${r.fast}/${r.slow}${r.usedDefaultMa ? " (d)" : ""} | ${t.episodeCount} | ` +
        `${t.recoveredCount} / ${t.breakCount} | ${fmtPlain(t.medianDepthPct, 2)} | ` +
        `${fmtPlain(t.medianDepthAtr, 2)} | ${fmtPlain(t.episodePierceRateRecovered)} | ` +
        `${fmtPlain(t.episodePierceRateAll)} | ${fmtPlain(t.barPierceRate)} | ` +
        `${fmtPlain(t.breakSharePct)} | ${t.unresolved ? fmtPlain(t.unresolved.depthPctSoFar, 2) + "%" : "—"} | ` +
        `${fmtSigned(r.optReturnPct)} | ${fmtSigned(r.fixedReturnPct)} | ${r.optTrades} |`
    );
  }
  out.push("");
  out.push("`(d)` marks a symbol that fell back to the default MA pair.");
  out.push("");

  out.push("## Noise-floor sensitivity");
  out.push("");
  out.push(
    "Episode count and median depth at each floor, medianed across symbols. If the ranking moves a"
  );
  out.push("lot between floors, the metric is fragile and the choice of floor is doing the work.");
  out.push("");
  out.push("| Floor | Median episodes/symbol | Median depth % |");
  out.push("| --- | --- | --- |");
  for (let i = 0; i < DEPTH_FLOORS.length; i++) {
    const counts = results.map((r) => r.floors[i].episodeCount);
    const depths = results.map((r) => r.floors[i].medianDepthPct).filter((v) => v != null);
    out.push(
      `| ${DEPTH_FLOORS[i]}% | ${fmtPlain(median(counts), 0)} | ${fmtPlain(median(depths), 2)} |`
    );
  }
  out.push("");

  const notes = results.map(breakDepthNote).filter(Boolean);
  out.push("## Break-depth notes");
  out.push("");
  out.push(
    `Symbols whose break episodes are typically much shallower than their recovered ones (median`
  );
  out.push(
    `below ${Math.round(BREAK_DEPTH_NOTE_RATIO * 100)}% of the recovered median). Informational, not a`
  );
  out.push(
    "problem: it means the trend tends to end on a small wobble rather than a deep dip, which is what"
  );
  out.push("a fast MA sitting close to the slow one produces.");
  out.push("");
  if (!notes.length) {
    out.push("None.");
  } else {
    out.push("| Symbol | Median depth, break | Median depth, recovered | Break episodes |");
    out.push("| --- | --- | --- | --- |");
    for (const nte of notes) {
      out.push(
        `| ${nte.symbol} | ${fmtPct(nte.breakMedian, 2)} | ${fmtPct(nte.recoveredMedian, 2)} | ${nte.breakCount} |`
      );
    }
  }
  out.push("");

  out.push("## Flagged symbols");
  out.push("");
  out.push(
    "Symbols excluded from every table above because a definition check failed on them. These are"
  );
  out.push(
    "impossibilities rather than unusual data, so a non-empty list means a bug in the walk — but one"
  );
  out.push("odd symbol never stops the run.");
  out.push("");
  if (!flagged.length) {
    out.push("None — every analyzed symbol passed the definition checks.");
  } else {
    out.push("| Symbol | Reason |");
    out.push("| --- | --- |");
    for (const f of flagged) {
      out.push(`| ${f.symbol} | ${f.reasons.join("; ")} |`);
    }
  }
  out.push("");

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

  // An explicit --symbol run is a spot-check, not a universe run: give it its
  // own file so a quick AAPL check cannot clobber a full S&P report.
  const reportSlug = args.symbols?.length ? "symbols" : args.universe;
  const reportPath = path.join(
    __dirname,
    "..",
    "..",
    "docs",
    "reports",
    `pullback-tendency-${reportSlug}.md`
  );

  console.log(`Pullback tendency — ${args.universe} — ${symbols.length} symbol(s)\n`);

  const results = [];
  const skipped = [];
  const flagged = [];
  const t0 = Date.now();

  for (const sym of symbols) {
    try {
      const r = await evaluateSymbol(sym);
      if (r.status === "ok") {
        const issues = checkSymbol(r);
        if (issues.length) {
          flagged.push({ symbol: sym, reasons: issues });
          console.warn(`${sym.padEnd(6)} flagged (${issues[0]}) — excluded, continuing`);
          continue;
        }
        results.push(r);
        console.log(
          `${sym.padEnd(6)} ${r.fast}/${r.slow}  ${String(r.full.episodeCount).padStart(3)} eps  ` +
            `depth ${fmtPlain(r.full.medianDepthPct, 2).padStart(5)}%  ` +
            `pierce ${fmtPlain(r.full.barPierceRate).padStart(5)}%  ` +
            `ret ${fmtSigned(r.optReturnPct)}`
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
    universe: args.universe,
    results,
    skipped,
    summary,
    elapsedSec,
    symbolCount: symbols.length,
    flagged,
  });

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${report}\n`);

  console.log(
    `\nDone in ${elapsedSec}s — analyzed: ${results.length}, ` +
      `skipped: ${skipped.length}, flagged: ${flagged.length}`
  );
  console.log(`Report: ${path.relative(process.cwd(), reportPath)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
