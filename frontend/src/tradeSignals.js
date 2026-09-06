import { maByDate } from "./ma.js";

/** @typedef {'single' | 'double'} EntryConfirm */

export const ENTRY_CONFIRM = {
  SINGLE: "single",
  DOUBLE: "double",
};

/**
 * Entry: not in trade, close > slow MA, fast > slow, close > fast MA.
 * entryConfirm 'single' — one close above fast is enough.
 * entryConfirm 'double' — two consecutive closes above fast required.
 * Exit: in trade and close < fast MA (or below fast × (1 − exitBufferPct/100)).
 * exitBufferPct — percent band under the fast MA; 0 = exact fast MA (default).
 * adxSeries/adxMin — optional regime gate on new entries only: with both set,
 * an entry needs ADX > adxMin on the signal bar. Never forces an exit. Passing
 * either as null leaves the gate off and the rules exactly as they were.
 * Signals are evaluated at the bar close; fills use the next bar's open.
 */
export function simulateTrades(
  bars,
  fastPeriod = 21,
  slowPeriod = 50,
  maType = "ema",
  {
    entryConfirm = ENTRY_CONFIRM.SINGLE,
    exitBufferPct = 0,
    adxSeries = null,
    adxMin = null,
  } = {}
) {
  const requireDouble = entryConfirm === ENTRY_CONFIRM.DOUBLE;
  const exitMult = 1 - Math.max(0, Number(exitBufferPct) || 0) / 100;
  const gateOn = adxSeries != null && adxMin != null;
  const maFast = maByDate(bars, fastPeriod, maType);
  const maSlow = maByDate(bars, slowPeriod, maType);
  const trades = [];
  const markers = [];
  let entriesBlocked = 0;
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;
  let consecutiveClosesAboveFast = 0;

  for (let barIndex = 0; barIndex < bars.length; barIndex++) {
    const bar = bars[barIndex];

    if (pendingExit && inTrade && open) {
      open.exitDate = bar.date;
      open.exitPrice = bar.open;
      trades.push(open);
      inTrade = false;
      open = null;
    }
    pendingExit = false;

    if (pendingEntry && !inTrade) {
      inTrade = true;
      open = {
        entryDate: bar.date,
        entryPrice: bar.open,
      };
    }
    pendingEntry = false;

    const eFast = maFast.get(bar.date);
    const eSlow = maSlow.get(bar.date);
    if (eFast == null || eSlow == null) continue;

    if (bar.close > eFast) {
      consecutiveClosesAboveFast += 1;
    } else {
      consecutiveClosesAboveFast = 0;
    }

    const hasNextBar = barIndex < bars.length - 1;
    const exitLine = eFast * exitMult;

    if (inTrade && bar.close < exitLine) {
      markers.push({
        time: bar.date,
        position: "aboveBar",
        shape: "arrowDown",
        color: "#ef5350",
        text: "Close",
      });
      if (hasNextBar) {
        pendingExit = true;
      }
      consecutiveClosesAboveFast = 0;
    } else if (
      !inTrade &&
      bar.close > eSlow &&
      bar.close > eFast &&
      eFast > eSlow &&
      (!requireDouble || consecutiveClosesAboveFast >= 2)
    ) {
      const adx = gateOn ? adxSeries[barIndex] : null;
      if (gateOn && !(adx != null && adx > adxMin)) {
        entriesBlocked += 1;
      } else {
        markers.push({
          time: bar.date,
          position: "belowBar",
          shape: "arrowUp",
          color: "#6abf69",
          text: "Open",
        });
        if (hasNextBar) {
          pendingEntry = true;
        }
      }
    }
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers, entriesBlocked };
}

/** Same rules as simulateTrades; uses precomputed SMA arrays (bar index). */
export function simulateTradesWithMaCache(
  bars,
  fastPeriod,
  slowPeriod,
  maCache,
  {
    entryConfirm = ENTRY_CONFIRM.SINGLE,
    exitBufferPct = 0,
    startIndex = 0,
    adxSeries = null,
    adxMin = null,
  } = {}
) {
  const requireDouble = entryConfirm === ENTRY_CONFIRM.DOUBLE;
  const exitMult = 1 - Math.max(0, Number(exitBufferPct) || 0) / 100;
  const gateOn = adxSeries != null && adxMin != null;
  const maFast = maCache.get(fastPeriod);
  const maSlow = maCache.get(slowPeriod);
  if (!maFast || !maSlow) {
    return { trades: [], markers: [], entriesBlocked: 0 };
  }

  const trades = [];
  const markers = [];
  let entriesBlocked = 0;
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;
  let consecutiveClosesAboveFast = 0;

  for (let barIndex = startIndex; barIndex < bars.length; barIndex++) {
    const bar = bars[barIndex];

    if (pendingExit && inTrade && open) {
      open.exitDate = bar.date;
      open.exitPrice = bar.open;
      trades.push(open);
      inTrade = false;
      open = null;
    }
    pendingExit = false;

    if (pendingEntry && !inTrade) {
      inTrade = true;
      open = {
        entryDate: bar.date,
        entryPrice: bar.open,
      };
    }
    pendingEntry = false;

    const eFast = maFast[barIndex];
    const eSlow = maSlow[barIndex];
    if (eFast == null || eSlow == null) continue;

    if (bar.close > eFast) {
      consecutiveClosesAboveFast += 1;
    } else {
      consecutiveClosesAboveFast = 0;
    }

    const hasNextBar = barIndex < bars.length - 1;
    const exitLine = eFast * exitMult;

    if (inTrade && bar.close < exitLine) {
      markers.push({
        time: bar.date,
        position: "aboveBar",
        shape: "arrowDown",
        color: "#ef5350",
        text: "Close",
      });
      if (hasNextBar) pendingExit = true;
      consecutiveClosesAboveFast = 0;
    } else if (
      !inTrade &&
      bar.close > eSlow &&
      bar.close > eFast &&
      eFast > eSlow &&
      (!requireDouble || consecutiveClosesAboveFast >= 2)
    ) {
      const adx = gateOn ? adxSeries[barIndex] : null;
      if (gateOn && !(adx != null && adx > adxMin)) {
        entriesBlocked += 1;
      } else {
        markers.push({
          time: bar.date,
          position: "belowBar",
          shape: "arrowUp",
          color: "#6abf69",
          text: "Open",
        });
        if (hasNextBar) pendingEntry = true;
      }
    }
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers, entriesBlocked };
}
