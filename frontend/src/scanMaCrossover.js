import { optimizeMaCrossover, runningTotalWithMtm } from "./optimizeMaCrossover.js";
import { simulateMaCrossover } from "./maCrossoverSignals.js";

function runningTotalPctWithMtm(trades, markPrice) {
  let total = 0;
  let any = false;
  for (const t of trades) {
    if (!t.open) {
      if (!t.entryPrice) continue;
      total += (t.exitPrice / t.entryPrice - 1) * 100;
      any = true;
    } else if (markPrice != null && t.entryPrice) {
      total += (markPrice / t.entryPrice - 1) * 100;
      any = true;
    }
  }
  if (!any) return null;
  return total;
}

/**
 * Per-symbol optimized SMA crossover → system_ma_crossover_scan.
 * Best pair by 1-share running $ P/L; open leg marked at last close.
 */
export function scanMaCrossover(bars) {
  if (!bars?.length) return null;

  const asOfDate = bars[bars.length - 1].date;
  const markPrice = bars[bars.length - 1].close;
  const { best, usedDefault } = optimizeMaCrossover(bars);
  const fast = best.fast;
  const slow = best.slow;

  const trades =
    best.trades ??
    simulateMaCrossover(bars, fast, slow, "sma").trades;

  const closed = trades.filter((t) => !t.open);
  const openCount = trades.some((t) => t.open) ? 1 : 0;

  return {
    asOfDate,
    optFast: fast,
    optSlow: slow,
    optUsedDefault: usedDefault,
    runningTotal: runningTotalWithMtm(trades, markPrice) ?? 0,
    runningTotalPct: runningTotalPctWithMtm(trades, markPrice),
    tradeCount: closed.length + openCount,
    barCount: bars.length,
  };
}
