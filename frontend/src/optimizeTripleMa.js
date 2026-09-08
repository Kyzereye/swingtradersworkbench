import { buildSmaIndexCacheForPeriods } from "./ma.js";
import { simulateTripleMaWithMaCache } from "./tripleMaSignals.js";
import { runningTotalWithMtm } from "./util/tradePnl.js";

const FAST_MIN = 8;
const FAST_MAX = 28;
const MED_MIN = 16;
const MED_MAX = 48;
const SLOW_MIN = 30;
const SLOW_MAX = 100;
const GRID_STEP = 2;
const DEFAULT = { fast: 10, medium: 20, slow: 50 };

/** ~2 trading years — stored ranking metrics only (not pair selection). */
export const SCORE_BARS = 504;

export function scoreWindowStart(bars) {
  if (!bars?.length) return null;
  if (bars.length <= SCORE_BARS) return bars[0].date;
  return bars[bars.length - SCORE_BARS].date;
}

/**
 * Grid-search triple MA periods (fast < medium < slow) over full history.
 * Score = 1-share $ P/L; open marked at last close.
 */
export function optimizeTripleMa(bars) {
  if (!bars?.length) {
    return {
      best: { ...DEFAULT, runningTotal: null, trades: null },
      usedDefault: true,
    };
  }

  const markPrice = bars[bars.length - 1].close;
  const periods = [];
  for (let f = FAST_MIN; f <= FAST_MAX; f += GRID_STEP) periods.push(f);
  for (let m = MED_MIN; m <= MED_MAX; m += GRID_STEP) periods.push(m);
  for (let s = SLOW_MIN; s <= SLOW_MAX; s += GRID_STEP) periods.push(s);
  periods.push(DEFAULT.fast, DEFAULT.medium, DEFAULT.slow);

  const maCache = buildSmaIndexCacheForPeriods(bars, periods);
  let best = null;

  for (let fast = FAST_MIN; fast <= FAST_MAX; fast += GRID_STEP) {
    for (let medium = MED_MIN; medium <= MED_MAX; medium += GRID_STEP) {
      if (medium <= fast) continue;
      for (let slow = SLOW_MIN; slow <= SLOW_MAX; slow += GRID_STEP) {
        if (slow <= medium) continue;
        const { trades } = simulateTripleMaWithMaCache(
          bars,
          fast,
          medium,
          slow,
          maCache
        );
        const runningTotal = runningTotalWithMtm(trades, markPrice);
        if (runningTotal == null) continue;
        if (!best || runningTotal > best.runningTotal) {
          best = { fast, medium, slow, runningTotal, trades };
        }
      }
    }
  }

  if (!best) {
    const { trades } = simulateTripleMaWithMaCache(
      bars,
      DEFAULT.fast,
      DEFAULT.medium,
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
