import { optimizeRsi, scoreWindowStart } from "./optimizeRsi.js";
import {
  runningTotalWithMtm,
  runningTotalPctWithMtm,
} from "./util/tradePnl.js";
import { simulateRsi } from "./rsiSignals.js";

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
 * Optimized RSI → system_rsi_scan.
 * Periods from full-history $ P/L; stored totals last ~2y.
 */
export function scanRsi(bars) {
  if (!bars?.length) return null;

  const lastBar = bars[bars.length - 1];
  const asOfDate = lastBar.date;
  const markPrice = lastBar.close;
  const topWindowStart = scoreWindowStart(bars);
  const { best, usedDefault } = optimizeRsi(bars);
  const { period, oversold, overbought } = best;

  const { trades, markers } = simulateRsi(bars, period, oversold, overbought);
  const { lastSignal, signalDate } = classifyLastSignal(
    trades,
    markers,
    asOfDate
  );

  return {
    asOfDate,
    optPeriod: period,
    optOversold: oversold,
    optOverbought: overbought,
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
