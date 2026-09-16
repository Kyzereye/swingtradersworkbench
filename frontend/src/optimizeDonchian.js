import { simulateDonchian } from "./donchianSignals.js";
import { runningTotalWithMtm } from "./util/tradePnl.js";

/** Entry lookbacks (Turtle-ish 20 / 55 neighborhood). */
const ENTRY_PERIODS = [10, 15, 20, 25, 30, 40, 55];
/** Exit lookbacks — typically shorter than entry. */
const EXIT_PERIODS = [5, 10, 15, 20];
const DEFAULT = { entryPeriod: 20, exitPeriod: 10 };

/** ~2 trading years — ranking metrics only (not period selection). */
export const SCORE_BARS = 504;

export function scoreWindowStart(bars) {
  if (!bars?.length) return null;
  if (bars.length <= SCORE_BARS) return bars[0].date;
  return bars[bars.length - SCORE_BARS].date;
}

/**
 * Grid-search Donchian entry/exit periods over full history.
 * Score = 1-share $ P/L; open marked at last close.
 * Defaults 20 / 10.
 */
export function optimizeDonchian(bars) {
  if (!bars?.length) {
    return {
      best: { ...DEFAULT, runningTotal: null, trades: null },
      usedDefault: true,
    };
  }

  const markPrice = bars[bars.length - 1].close;
  let best = null;

  for (const entryPeriod of ENTRY_PERIODS) {
    for (const exitPeriod of EXIT_PERIODS) {
      if (exitPeriod > entryPeriod) continue;
      const { trades } = simulateDonchian(bars, entryPeriod, exitPeriod);
      const runningTotal = runningTotalWithMtm(trades, markPrice);
      if (runningTotal == null) continue;
      if (!best || runningTotal > best.runningTotal) {
        best = { entryPeriod, exitPeriod, runningTotal, trades };
      }
    }
  }

  if (!best) {
    const { trades } = simulateDonchian(
      bars,
      DEFAULT.entryPeriod,
      DEFAULT.exitPeriod
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
