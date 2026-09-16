import { simulateRsi } from "./rsiSignals.js";
import { runningTotalWithMtm } from "./util/tradePnl.js";

const PERIOD_MIN = 7;
const PERIOD_MAX = 21;
const PERIOD_STEP = 2;
const OS_MIN = 20;
const OS_MAX = 40;
const OB_MIN = 60;
const OB_MAX = 80;
const LEVEL_STEP = 5;
const DEFAULT = { period: 14, oversold: 30, overbought: 70 };

/** ~2 trading years — ranking metrics only (not period selection). */
export const SCORE_BARS = 504;

export function scoreWindowStart(bars) {
  if (!bars?.length) return null;
  if (bars.length <= SCORE_BARS) return bars[0].date;
  return bars[bars.length - SCORE_BARS].date;
}

/**
 * Grid-search RSI period / oversold / overbought over full history.
 * Score = 1-share $ P/L; open marked at last close.
 * Defaults 14 / 30 / 70.
 */
export function optimizeRsi(bars) {
  if (!bars?.length) {
    return {
      best: { ...DEFAULT, runningTotal: null, trades: null },
      usedDefault: true,
    };
  }

  const markPrice = bars[bars.length - 1].close;
  let best = null;

  for (let period = PERIOD_MIN; period <= PERIOD_MAX; period += PERIOD_STEP) {
    for (let oversold = OS_MIN; oversold <= OS_MAX; oversold += LEVEL_STEP) {
      for (
        let overbought = OB_MIN;
        overbought <= OB_MAX;
        overbought += LEVEL_STEP
      ) {
        if (overbought <= oversold) continue;
        const { trades } = simulateRsi(bars, period, oversold, overbought);
        const runningTotal = runningTotalWithMtm(trades, markPrice);
        if (runningTotal == null) continue;
        if (!best || runningTotal > best.runningTotal) {
          best = { period, oversold, overbought, runningTotal, trades };
        }
      }
    }
  }

  if (!best) {
    const { trades } = simulateRsi(
      bars,
      DEFAULT.period,
      DEFAULT.oversold,
      DEFAULT.overbought
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
