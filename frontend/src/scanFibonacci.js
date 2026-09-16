import { optimizeFibonacci, scoreWindowStart } from "./optimizeFibonacci.js";
import {
  runningTotalWithMtm,
  runningTotalPctWithMtm,
} from "./util/tradePnl.js";
import { simulateFibonacci } from "./fibonacciSignals.js";

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
 * Optimized Fibonacci retracement/extension → system_fibonacci_scan.
 * Params from full-history $ P/L; stored totals last ~2y.
 */
export function scanFibonacci(bars) {
  if (!bars?.length) return null;

  const lastBar = bars[bars.length - 1];
  const asOfDate = lastBar.date;
  const markPrice = lastBar.close;
  const topWindowStart = scoreWindowStart(bars);
  const { best, usedDefault } = optimizeFibonacci(bars);
  const { swingN, entryLevel, extensionTarget } = best;

  const { trades, markers } = simulateFibonacci(
    bars,
    swingN,
    entryLevel,
    extensionTarget
  );
  const { lastSignal, signalDate } = classifyLastSignal(
    trades,
    markers,
    asOfDate
  );

  return {
    asOfDate,
    optSwingN: swingN,
    optEntryLevel: entryLevel,
    optExtensionTarget: extensionTarget,
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
