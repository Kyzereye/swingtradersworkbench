import { optimizeBollinger, scoreWindowStart } from "./optimizeBollinger.js";
import {
  runningTotalWithMtm,
  runningTotalPctWithMtm,
} from "./util/tradePnl.js";
import { simulateBollinger } from "./bollingerSignals.js";

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

/** Optimized Bollinger → system_bollinger_scan. */
export function scanBollinger(bars) {
  if (!bars?.length) return null;

  const lastBar = bars[bars.length - 1];
  const asOfDate = lastBar.date;
  const markPrice = lastBar.close;
  const topWindowStart = scoreWindowStart(bars);
  const { best, usedDefault } = optimizeBollinger(bars);
  const { period, stdMult, atrPeriod, atrMult } = best;

  const { trades, markers } = simulateBollinger(
    bars,
    period,
    stdMult,
    atrPeriod,
    atrMult
  );
  const { lastSignal, signalDate } = classifyLastSignal(
    trades,
    markers,
    asOfDate
  );

  return {
    asOfDate,
    optPeriod: period,
    optStdMult: stdMult,
    optAtrPeriod: atrPeriod,
    optAtrMult: atrMult,
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
