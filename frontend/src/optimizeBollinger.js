import { simulateBollinger } from "./bollingerSignals.js";
import { runningTotalWithMtm } from "./util/tradePnl.js";

const PERIODS = [10, 15, 20, 25, 30];
const STD_MULTS = [1.5, 2.0, 2.5];
const ATR_PERIODS = [7, 10, 14];
const ATR_MULTS = [1.0, 1.5, 2.0];
const DEFAULT = {
  period: 20,
  stdMult: 2,
  atrPeriod: 10,
  atrMult: 1.5,
};

export const SCORE_BARS = 504;

export function scoreWindowStart(bars) {
  if (!bars?.length) return null;
  if (bars.length <= SCORE_BARS) return bars[0].date;
  return bars[bars.length - SCORE_BARS].date;
}

/**
 * Grid-search Bollinger squeeze params over full history.
 * Defaults 20 / 2 / 10 / 1.5.
 */
export function optimizeBollinger(bars) {
  if (!bars?.length) {
    return {
      best: { ...DEFAULT, runningTotal: null, trades: null },
      usedDefault: true,
    };
  }

  const markPrice = bars[bars.length - 1].close;
  let best = null;

  for (const period of PERIODS) {
    for (const stdMult of STD_MULTS) {
      for (const atrPeriod of ATR_PERIODS) {
        for (const atrMult of ATR_MULTS) {
          const { trades } = simulateBollinger(
            bars,
            period,
            stdMult,
            atrPeriod,
            atrMult
          );
          const runningTotal = runningTotalWithMtm(trades, markPrice);
          if (runningTotal == null) continue;
          if (!best || runningTotal > best.runningTotal) {
            best = {
              period,
              stdMult,
              atrPeriod,
              atrMult,
              runningTotal,
              trades,
            };
          }
        }
      }
    }
  }

  if (!best) {
    const { trades } = simulateBollinger(
      bars,
      DEFAULT.period,
      DEFAULT.stdMult,
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
