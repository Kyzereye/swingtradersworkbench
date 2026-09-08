import { buildSmaIndexCacheForPeriods } from "./ma.js";
import { simulateMaCrossoverWithMaCache } from "./maCrossoverSignals.js";
import { runningTotalWithMtm } from "./util/tradePnl.js";

export { runningTotalWithMtm } from "./util/tradePnl.js";

const FAST_MIN = 10;
const FAST_MAX = 50;
const SLOW_MIN = 10;
const SLOW_MAX = 100;
const GRID_STEP = 2;
const DEFAULT = { fast: 21, slow: 50 };

/** ~2 trading years — used only for top-performers ranking metrics. */
export const SCORE_BARS = 504;

export function scoreWindowStart(bars) {
  if (!bars?.length) return null;
  if (bars.length <= SCORE_BARS) return bars[0].date;
  return bars[bars.length - SCORE_BARS].date;
}

/**
 * Grid-search SMA crossover pairs over full history.
 * Score = sum of 1-share $ P/L; open marked at last close.
 * Highest score wins; fallback 21/50.
 */
export function optimizeMaCrossover(bars) {
  if (!bars?.length) {
    return {
      best: { ...DEFAULT, runningTotal: null, trades: null },
      usedDefault: true,
    };
  }

  const markPrice = bars[bars.length - 1].close;
  const periods = [];
  for (let f = FAST_MIN; f <= FAST_MAX; f += GRID_STEP) periods.push(f);
  for (let s = SLOW_MIN; s <= SLOW_MAX; s += GRID_STEP) periods.push(s);
  periods.push(DEFAULT.fast, DEFAULT.slow);

  const maCache = buildSmaIndexCacheForPeriods(bars, periods);
  let best = null;

  for (let fast = FAST_MIN; fast <= FAST_MAX; fast += GRID_STEP) {
    for (let slow = SLOW_MIN; slow <= SLOW_MAX; slow += GRID_STEP) {
      if (slow <= fast) continue;
      const { trades } = simulateMaCrossoverWithMaCache(
        bars,
        fast,
        slow,
        maCache
      );
      const runningTotal = runningTotalWithMtm(trades, markPrice);
      if (runningTotal == null) continue;
      if (!best || runningTotal > best.runningTotal) {
        best = { fast, slow, runningTotal, trades };
      }
    }
  }

  if (!best) {
    const { trades } = simulateMaCrossoverWithMaCache(
      bars,
      DEFAULT.fast,
      DEFAULT.slow,
      maCache
    );
    return {
      best: {
        ...DEFAULT,
        runningTotal: runningTotalWithMtm(trades, markPrice),
        trades,
      },
      usedDefault: true,
    };
  }
  return { best, usedDefault: false };
}
