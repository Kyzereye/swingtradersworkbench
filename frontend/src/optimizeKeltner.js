import { simulateKeltner } from "./keltnerSignals.js";
import { runningTotalWithMtm } from "./util/tradePnl.js";

const EMA_PERIODS = [10, 15, 20, 30, 40];
const ATR_PERIODS = [7, 10, 14, 20];
const ATR_MULTS = [1.0, 1.5, 2.0, 2.5];
const DEFAULT = { emaPeriod: 20, atrPeriod: 10, atrMult: 2 };

/** ~2 trading years — ranking metrics only (not period selection). */
export const SCORE_BARS = 504;

export function scoreWindowStart(bars) {
  if (!bars?.length) return null;
  if (bars.length <= SCORE_BARS) return bars[0].date;
  return bars[bars.length - SCORE_BARS].date;
}

/**
 * Grid-search Keltner EMA / ATR / multiplier over full history.
 * Score = 1-share $ P/L; open marked at last close.
 * Defaults 20 / 10 / 2.
 */
export function optimizeKeltner(bars) {
  if (!bars?.length) {
    return {
      best: { ...DEFAULT, runningTotal: null, trades: null },
      usedDefault: true,
    };
  }

  const markPrice = bars[bars.length - 1].close;
  let best = null;

  for (const emaPeriod of EMA_PERIODS) {
    for (const atrPeriod of ATR_PERIODS) {
      for (const atrMult of ATR_MULTS) {
        const { trades } = simulateKeltner(
          bars,
          emaPeriod,
          atrPeriod,
          atrMult
        );
        const runningTotal = runningTotalWithMtm(trades, markPrice);
        if (runningTotal == null) continue;
        if (!best || runningTotal > best.runningTotal) {
          best = { emaPeriod, atrPeriod, atrMult, runningTotal, trades };
        }
      }
    }
  }

  if (!best) {
    const { trades } = simulateKeltner(
      bars,
      DEFAULT.emaPeriod,
      DEFAULT.atrPeriod,
      DEFAULT.atrMult
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
