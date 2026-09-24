import { simulatePointFigure } from "./pointFigureSignals.js";
import { runningTotalWithMtm } from "./util/tradePnl.js";

const BOX_PCTS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const REVERSAL_BOXES = [2, 3, 4];
const DEFAULT = { boxPct: 1, reversalBoxes: 3 };

/** ~2 trading years — ranking metrics only (not period selection). */
export const SCORE_BARS = 504;

export function scoreWindowStart(bars) {
  if (!bars?.length) return null;
  if (bars.length <= SCORE_BARS) return bars[0].date;
  return bars[bars.length - SCORE_BARS].date;
}

/**
 * Grid-search Point & Figure box size % / reversal boxes over full history.
 * Score = 1-share $ P/L; open marked at last close.
 * Defaults 1% box / 3-box reversal.
 */
export function optimizePointFigure(bars) {
  if (!bars?.length) {
    return {
      best: { ...DEFAULT, runningTotal: null, trades: null },
      usedDefault: true,
    };
  }

  const markPrice = bars[bars.length - 1].close;
  let best = null;

  for (const boxPct of BOX_PCTS) {
    for (const reversalBoxes of REVERSAL_BOXES) {
      const { trades } = simulatePointFigure(bars, boxPct, reversalBoxes);
      const runningTotal = runningTotalWithMtm(trades, markPrice);
      if (runningTotal == null) continue;
      if (!best || runningTotal > best.runningTotal) {
        best = { boxPct, reversalBoxes, runningTotal, trades };
      }
    }
  }

  if (!best) {
    const { trades } = simulatePointFigure(
      bars,
      DEFAULT.boxPct,
      DEFAULT.reversalBoxes
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
