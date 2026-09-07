import { buildSmaIndexCacheForPeriods } from "./ma.js";
import { simulateMaCrossoverWithMaCache } from "./maCrossoverSignals.js";

const FAST_MIN = 8;
const FAST_MAX = 30;
const SLOW_MIN = 30;
const SLOW_MAX = 100;
const GRID_STEP = 2;
const DEFAULT = { fast: 21, slow: 50 };

/** 1-share P/L: closed exits + open leg marked at markPrice (last close). */
export function runningTotalWithMtm(trades, markPrice) {
  let total = 0;
  let any = false;
  for (const t of trades) {
    if (!t.open) {
      total += t.exitPrice - t.entryPrice;
      any = true;
    } else if (markPrice != null && t.entryPrice) {
      total += markPrice - t.entryPrice;
      any = true;
    }
  }
  return any ? total : null;
}

/**
 * Grid-search SMA crossover pairs.
 * Score = sum of 1-share P/L (exit − entry); open trade marked at last close.
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
