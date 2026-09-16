import { simulateFibonacci } from "./fibonacciSignals.js";
import { runningTotalWithMtm } from "./util/tradePnl.js";

const SWING_NS = [5, 8, 10, 15];
const ENTRY_LEVELS = [0.382, 0.5, 0.618, 0.786];
const EXTENSION_TARGETS = [1.272, 1.618, 2.0];
const DEFAULT = { swingN: 10, entryLevel: 0.618, extensionTarget: 1.618 };

/** ~2 trading years — ranking metrics only (not period selection). */
export const SCORE_BARS = 504;

export function scoreWindowStart(bars) {
  if (!bars?.length) return null;
  if (bars.length <= SCORE_BARS) return bars[0].date;
  return bars[bars.length - SCORE_BARS].date;
}

/**
 * Grid-search Fibonacci swingN / entryLevel / extensionTarget over full
 * history. Score = 1-share $ P/L; open marked at last close.
 * Defaults 10 / 0.618 / 1.618.
 */
export function optimizeFibonacci(bars) {
  if (!bars?.length) {
    return {
      best: { ...DEFAULT, runningTotal: null, trades: null },
      usedDefault: true,
    };
  }

  const markPrice = bars[bars.length - 1].close;
  let best = null;

  for (const swingN of SWING_NS) {
    for (const entryLevel of ENTRY_LEVELS) {
      for (const extensionTarget of EXTENSION_TARGETS) {
        const { trades } = simulateFibonacci(
          bars,
          swingN,
          entryLevel,
          extensionTarget
        );
        const runningTotal = runningTotalWithMtm(trades, markPrice);
        if (runningTotal == null) continue;
        if (!best || runningTotal > best.runningTotal) {
          best = { swingN, entryLevel, extensionTarget, runningTotal, trades };
        }
      }
    }
  }

  if (!best) {
    const { trades } = simulateFibonacci(
      bars,
      DEFAULT.swingN,
      DEFAULT.entryLevel,
      DEFAULT.extensionTarget
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
