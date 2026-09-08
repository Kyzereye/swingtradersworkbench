import { simulateMacd } from "./macdSignals.js";
import { runningTotalWithMtm } from "./util/tradePnl.js";

const FAST_MIN = 6;
const FAST_MAX = 18;
const SLOW_MIN = 18;
const SLOW_MAX = 40;
const SIGNAL_MIN = 5;
const SIGNAL_MAX = 15;
const GRID_STEP = 2;
const DEFAULT = { fast: 12, slow: 26, signal: 9 };

/** ~2 trading years — ranking metrics only (not period selection). */
export const SCORE_BARS = 504;

export function scoreWindowStart(bars) {
  if (!bars?.length) return null;
  if (bars.length <= SCORE_BARS) return bars[0].date;
  return bars[bars.length - SCORE_BARS].date;
}

/**
 * Grid-search MACD periods (fast < slow) over full history.
 * Score = 1-share $ P/L; open marked at last close.
 * Defaults 12 / 26 / 9.
 */
export function optimizeMacd(bars) {
  if (!bars?.length) {
    return {
      best: { ...DEFAULT, runningTotal: null, trades: null },
      usedDefault: true,
    };
  }

  const markPrice = bars[bars.length - 1].close;
  let best = null;

  for (let fast = FAST_MIN; fast <= FAST_MAX; fast += GRID_STEP) {
    for (let slow = SLOW_MIN; slow <= SLOW_MAX; slow += GRID_STEP) {
      if (slow <= fast) continue;
      for (
        let signal = SIGNAL_MIN;
        signal <= SIGNAL_MAX;
        signal += GRID_STEP
      ) {
        const { trades } = simulateMacd(bars, fast, slow, signal);
        const runningTotal = runningTotalWithMtm(trades, markPrice);
        if (runningTotal == null) continue;
        if (!best || runningTotal > best.runningTotal) {
          best = { fast, slow, signal, runningTotal, trades };
        }
      }
    }
  }

  if (!best) {
    const { trades } = simulateMacd(
      bars,
      DEFAULT.fast,
      DEFAULT.slow,
      DEFAULT.signal
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
