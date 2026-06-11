import {
  DEFAULT_MIN_CLEARANCE_PCT,
  DEFAULT_MIN_MA_SPREAD_PCT,
  simulateTrades,
} from "./tradeSignals.js";

const DEFAULT_FAST = 21;
const DEFAULT_SLOW = 50;

const DAYS_1Y = 252;
const MIN_TRADES_3Y = 3;
const MIN_TRADES_1Y = 2;
const DEFAULT_TOP_N = 3;

const SPREAD_PCT_MIN = 0;
const SPREAD_PCT_MAX = 3;
const CLEARANCE_PCT_MIN = 0;
const CLEARANCE_PCT_MAX = 1.5;
const GRID_STEP_PCT = 0.25;

function sliceLastBars(bars, count) {
  if (bars.length <= count) return bars;
  return bars.slice(-count);
}

function closedTradeReturnPct(trades) {
  const closed = trades.filter((t) => !t.open);
  if (!closed.length) return null;
  let factor = 1;
  for (const t of closed) {
    factor *= t.exitPrice / t.entryPrice;
  }
  return (factor - 1) * 100;
}

function evaluateWindow(
  bars,
  fast,
  slow,
  maType,
  minSpreadPct,
  minClearancePct,
  minTrades
) {
  const { trades } = simulateTrades(bars, fast, slow, maType, {
    openGate: true,
    minSpreadPct,
    minClearancePct,
  });
  const closed = trades.filter((t) => !t.open);
  if (closed.length < minTrades) return null;
  return { returnPct: closedTradeReturnPct(trades), trades: closed.length };
}

function pctPointsToFraction(pctPoints) {
  return pctPoints / 100;
}

export function formatPct(v) {
  if (v == null) return "n/a";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

/**
 * Grid-search min spread % and min clearance %; rank by min(3y, 1y compounded return).
 */
export function optimizeOpenGate(
  bars,
  {
    topN = DEFAULT_TOP_N,
    fast = DEFAULT_FAST,
    slow = DEFAULT_SLOW,
    maType = "ema",
  } = {}
) {
  if (!bars?.length) {
    return { top: [], baseline: null, totalPairs: 0, barCount: 0 };
  }

  const bars1y = sliceLastBars(bars, DAYS_1Y);
  const results = [];

  for (
    let spreadPt = SPREAD_PCT_MIN;
    spreadPt <= SPREAD_PCT_MAX + 1e-9;
    spreadPt += GRID_STEP_PCT
  ) {
    for (
      let clearancePt = CLEARANCE_PCT_MIN;
      clearancePt <= CLEARANCE_PCT_MAX + 1e-9;
      clearancePt += GRID_STEP_PCT
    ) {
      const minSpreadPct = pctPointsToFraction(spreadPt);
      const minClearancePct = pctPointsToFraction(clearancePt);

      const r3y = evaluateWindow(
        bars,
        fast,
        slow,
        maType,
        minSpreadPct,
        minClearancePct,
        MIN_TRADES_3Y
      );
      const r1y = evaluateWindow(
        bars1y,
        fast,
        slow,
        maType,
        minSpreadPct,
        minClearancePct,
        MIN_TRADES_1Y
      );
      if (!r3y || !r1y) continue;

      results.push({
        spreadPct: spreadPt,
        clearancePct: clearancePt,
        r3y: r3y.returnPct,
        r1y: r1y.returnPct,
        minReturn: Math.min(r3y.returnPct, r1y.returnPct),
        n3y: r3y.trades,
        n1y: r1y.trades,
      });
    }
  }

  results.sort((a, b) => b.minReturn - a.minReturn);

  const baselineSpreadPt = DEFAULT_MIN_MA_SPREAD_PCT * 100;
  const baselineClearancePt = DEFAULT_MIN_CLEARANCE_PCT * 100;
  const baseline = results.find(
    (r) =>
      Math.abs(r.spreadPct - baselineSpreadPt) < 1e-9 &&
      Math.abs(r.clearancePct - baselineClearancePt) < 1e-9
  );
  const baselineRank = baseline ? results.indexOf(baseline) + 1 : null;

  return {
    top: results.slice(0, topN),
    baseline: baseline ? { ...baseline, rank: baselineRank } : null,
    totalPairs: results.length,
    barCount: bars.length,
    from: bars[0].date,
    to: bars[bars.length - 1].date,
  };
}
