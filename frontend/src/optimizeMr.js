import {
  simulateMeanRevertTrades,
  simulateUpperMeanRevertTrades,
} from "./meanRevertSignals.js";

const MR_MA_MIN = 10;
const MR_MA_MAX = 60;
const MR_DEV_MIN = 1;
const MR_DEV_MAX = 15;
const DAYS_1Y = 252;
const MIN_TRADES_3Y = 3;
const MIN_TRADES_1Y = 2;
const DEFAULT_TOP_N = 3;

function sliceLastBars(bars, count) {
  if (bars.length <= count) return bars;
  return bars.slice(-count);
}

function closedLongReturnPct(trades) {
  const closed = trades.filter((t) => !t.open);
  if (!closed.length) return null;
  let factor = 1;
  for (const t of closed) {
    factor *= t.exitPrice / t.entryPrice;
  }
  return (factor - 1) * 100;
}

function closedShortReturnPct(trades) {
  const closed = trades.filter((t) => !t.open);
  if (!closed.length) return null;
  let factor = 1;
  for (const t of closed) {
    factor *= t.entryPrice / t.exitPrice;
  }
  return (factor - 1) * 100;
}

function evaluateLowerWindow(bars, maPeriod, deviationPct, minTrades) {
  const { trades } = simulateMeanRevertTrades(bars, maPeriod, deviationPct);
  const closed = trades.filter((t) => !t.open);
  if (closed.length < minTrades) return null;
  return { returnPct: closedLongReturnPct(trades), trades: closed.length };
}

function evaluateUpperWindow(bars, maPeriod, deviationPct, minTrades) {
  const { trades } = simulateUpperMeanRevertTrades(bars, maPeriod, deviationPct);
  const closed = trades.filter((t) => !t.open);
  if (closed.length < minTrades) return null;
  return { returnPct: closedShortReturnPct(trades), trades: closed.length };
}

function optimizeMrGrid(bars, evaluateWindow, { topN = DEFAULT_TOP_N } = {}) {
  if (!bars?.length) {
    return { top: [], baseline: null, totalPairs: 0, barCount: 0 };
  }

  const bars1y = sliceLastBars(bars, DAYS_1Y);
  const results = [];

  for (let maPeriod = MR_MA_MIN; maPeriod <= MR_MA_MAX; maPeriod++) {
    for (let deviationPct = MR_DEV_MIN; deviationPct <= MR_DEV_MAX; deviationPct++) {
      const r3y = evaluateWindow(bars, maPeriod, deviationPct, MIN_TRADES_3Y);
      const r1y = evaluateWindow(bars1y, maPeriod, deviationPct, MIN_TRADES_1Y);
      if (!r3y || !r1y) continue;

      results.push({
        maPeriod,
        deviationPct,
        r3y: r3y.returnPct,
        r1y: r1y.returnPct,
        minReturn: Math.min(r3y.returnPct, r1y.returnPct),
        n3y: r3y.trades,
        n1y: r1y.trades,
      });
    }
  }

  results.sort((a, b) => b.minReturn - a.minReturn);

  const baseline = results.find((r) => r.maPeriod === 21 && r.deviationPct === 3);
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

/** Lower-band long MR; rank by min(3y, 1y compounded return). */
export function optimizeMr(bars, options) {
  return optimizeMrGrid(bars, evaluateLowerWindow, options);
}

/** Upper-band fade MR; rank by min(3y, 1y compounded short return). */
export function optimizeUpperMr(bars, options) {
  return optimizeMrGrid(bars, evaluateUpperWindow, options);
}
