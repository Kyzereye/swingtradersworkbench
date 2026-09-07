import {
  optimizeMaCrossover,
  runningTotalWithMtm,
  scoreWindowStart,
} from "./optimizeMaCrossover.js";
import { simulateMaCrossover } from "./maCrossoverSignals.js";

function runningTotalPctWithMtm(trades, markPrice, windowStart = null) {
  let total = 0;
  let any = false;
  for (const t of trades) {
    if (!t.open) {
      if (windowStart && t.exitDate < windowStart) continue;
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

function tradeCountInWindow(trades, windowStart) {
  let n = 0;
  for (const t of trades) {
    if (t.open) {
      n += 1;
    } else if (!windowStart || t.exitDate >= windowStart) {
      n += 1;
    }
  }
  return n;
}

/**
 * Classify relative to the symbol's last bar (last trading session).
 * entry / exit — cross marker on that bar; open — in trade from earlier; none.
 */
function classifyLastSignal(trades, markers, lastBarDate) {
  const onLast = markers.filter((m) => m.time === lastBarDate);
  if (onLast.some((m) => m.text === "Close")) {
    return { lastSignal: "exit", signalDate: lastBarDate };
  }
  if (onLast.some((m) => m.text === "Open")) {
    return { lastSignal: "entry", signalDate: lastBarDate };
  }

  const openTrade = trades.find((t) => t.open);
  if (openTrade) {
    return { lastSignal: "open", signalDate: openTrade.entryDate };
  }

  return { lastSignal: "none", signalDate: null };
}

/**
 * Per-symbol optimized SMA crossover → system_ma_crossover_scan.
 * Pair chosen by full-history 1-share $ P/L.
 * Stored running totals / trade_count are last ~2y only (top performers).
 */
export function scanMaCrossover(bars) {
  if (!bars?.length) return null;

  const lastBar = bars[bars.length - 1];
  const asOfDate = lastBar.date;
  const markPrice = lastBar.close;
  const topWindowStart = scoreWindowStart(bars);
  const { best, usedDefault } = optimizeMaCrossover(bars);
  const fast = best.fast;
  const slow = best.slow;

  const { trades, markers } = simulateMaCrossover(bars, fast, slow, "sma");
  const { lastSignal, signalDate } = classifyLastSignal(
    trades,
    markers,
    asOfDate
  );

  return {
    asOfDate,
    optFast: fast,
    optSlow: slow,
    optUsedDefault: usedDefault,
    runningTotal: runningTotalWithMtm(trades, markPrice, topWindowStart) ?? 0,
    runningTotalPct: runningTotalPctWithMtm(
      trades,
      markPrice,
      topWindowStart
    ),
    tradeCount: tradeCountInWindow(trades, topWindowStart),
    lastSignal,
    signalDate,
    signalClose:
      lastSignal === "entry" || lastSignal === "exit" ? markPrice : null,
    barCount: bars.length,
  };
}
