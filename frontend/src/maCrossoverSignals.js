import { maByDate } from "./ma.js";

/**
 * Classic MA crossover (long only).
 * Signal on close when fast crosses slow; fill at the next bar's open.
 * Same trade/marker shape as tradeSignals.js so OpensClosesTable can reuse it.
 */
export function simulateMaCrossover(
  bars,
  fastPeriod = 21,
  slowPeriod = 50,
  maType = "sma"
) {
  const maFast = maByDate(bars, fastPeriod, maType);
  const maSlow = maByDate(bars, slowPeriod, maType);
  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;
  let prevFast = null;
  let prevSlow = null;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

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
      open = { entryDate: bar.date, entryPrice: bar.open };
    }
    pendingEntry = false;

    const fast = maFast.get(bar.date);
    const slow = maSlow.get(bar.date);
    if (fast == null || slow == null) {
      prevFast = fast;
      prevSlow = slow;
      continue;
    }

    const hasNextBar = i < bars.length - 1;

    if (
      prevFast != null &&
      prevSlow != null &&
      prevFast <= prevSlow &&
      fast > slow &&
      !inTrade
    ) {
      markers.push({
        time: bar.date,
        position: "belowBar",
        shape: "arrowUp",
        color: "#6abf69",
        text: "Open",
      });
      if (hasNextBar) pendingEntry = true;
    } else if (
      prevFast != null &&
      prevSlow != null &&
      prevFast >= prevSlow &&
      fast < slow &&
      inTrade
    ) {
      markers.push({
        time: bar.date,
        position: "aboveBar",
        shape: "arrowDown",
        color: "#ef5350",
        text: "Close",
      });
      if (hasNextBar) pendingExit = true;
    }

    prevFast = fast;
    prevSlow = slow;
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}

/** Same rules as simulateMaCrossover; uses precomputed SMA arrays (bar index). */
export function simulateMaCrossoverWithMaCache(
  bars,
  fastPeriod,
  slowPeriod,
  maCache
) {
  const maFast = maCache.get(fastPeriod);
  const maSlow = maCache.get(slowPeriod);
  if (!maFast || !maSlow) {
    return { trades: [], markers: [] };
  }

  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;
  let prevFast = null;
  let prevSlow = null;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

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
      open = { entryDate: bar.date, entryPrice: bar.open };
    }
    pendingEntry = false;

    const fast = maFast[i];
    const slow = maSlow[i];
    if (fast == null || slow == null) {
      prevFast = fast;
      prevSlow = slow;
      continue;
    }

    const hasNextBar = i < bars.length - 1;

    if (
      prevFast != null &&
      prevSlow != null &&
      prevFast <= prevSlow &&
      fast > slow &&
      !inTrade
    ) {
      markers.push({
        time: bar.date,
        position: "belowBar",
        shape: "arrowUp",
        color: "#6abf69",
        text: "Open",
      });
      if (hasNextBar) pendingEntry = true;
    } else if (
      prevFast != null &&
      prevSlow != null &&
      prevFast >= prevSlow &&
      fast < slow &&
      inTrade
    ) {
      markers.push({
        time: bar.date,
        position: "aboveBar",
        shape: "arrowDown",
        color: "#ef5350",
        text: "Close",
      });
      if (hasNextBar) pendingExit = true;
    }

    prevFast = fast;
    prevSlow = slow;
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}
