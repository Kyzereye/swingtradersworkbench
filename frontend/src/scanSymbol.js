import { optimizeMa } from "./optimizeMa.js";
import { simulateTrades } from "./tradeSignals.js";

const DEFAULT_OPT_MA = { fast: 21, slow: 50 };

function runningTotalFromTrades(trades) {
  let total = 0;
  for (const t of trades) {
    if (!t.open) {
      total += t.exitPrice - t.entryPrice;
    }
  }
  return total;
}

function classifyLastSignal(trades, markers, lastBarDate) {
  const onLast = markers.filter((m) => m.time === lastBarDate);
  if (onLast.some((m) => m.text === "Exit")) {
    return { lastSignal: "exit", signalDate: lastBarDate };
  }
  if (onLast.some((m) => m.text === "Entry")) {
    return { lastSignal: "entry", signalDate: lastBarDate };
  }

  const openTrade = trades.find((t) => t.open);
  if (openTrade) {
    return { lastSignal: "open", signalDate: openTrade.entryDate };
  }

  return { lastSignal: "none", signalDate: null };
}

export function scanSymbol(bars) {
  if (!bars?.length) return null;

  const asOfDate = bars[bars.length - 1].date;
  const { top } = optimizeMa(bars);
  const best = top[0];
  const optUsedDefault = !best;
  const fast = best?.fast ?? DEFAULT_OPT_MA.fast;
  const slow = best?.slow ?? DEFAULT_OPT_MA.slow;

  const { trades, markers } = simulateTrades(bars, fast, slow, "ema");
  const runningTotal = runningTotalFromTrades(trades);
  const { lastSignal, signalDate } = classifyLastSignal(
    trades,
    markers,
    asOfDate
  );

  return {
    asOfDate,
    optFast: fast,
    optSlow: slow,
    optUsedDefault,
    optR3y: best?.r3y ?? null,
    optR1y: best?.r1y ?? null,
    optMinReturn: best?.minReturn ?? null,
    runningTotal,
    lastSignal,
    signalDate,
    barCount: bars.length,
  };
}
