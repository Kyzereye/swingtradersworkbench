import { maByDate } from "./ma.js";

function bullAligned(fast, medium, slow) {
  return (
    fast != null &&
    medium != null &&
    slow != null &&
    fast > medium &&
    medium > slow
  );
}

function runTripleMaLoop(bars, getFast, getMedium, getSlow) {
  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;
  let prevAligned = null;

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

    const fast = getFast(i, bar.date);
    const medium = getMedium(i, bar.date);
    const slow = getSlow(i, bar.date);
    const aligned = bullAligned(fast, medium, slow);

    if (fast == null || medium == null || slow == null) {
      prevAligned = aligned;
      continue;
    }

    const hasNextBar = i < bars.length - 1;

    if (prevAligned === false && aligned && !inTrade) {
      markers.push({
        time: bar.date,
        position: "belowBar",
        shape: "arrowUp",
        color: "#6abf69",
        text: "Open",
      });
      if (hasNextBar) pendingEntry = true;
    } else if (prevAligned === true && !aligned && inTrade) {
      markers.push({
        time: bar.date,
        position: "aboveBar",
        shape: "arrowDown",
        color: "#ef5350",
        text: "Close",
      });
      if (hasNextBar) pendingExit = true;
    }

    prevAligned = aligned;
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}

/**
 * Triple MA alignment (long only).
 * Long while fast > medium > slow; signal on close; fill at next open.
 */
export function simulateTripleMa(
  bars,
  fastPeriod = 10,
  mediumPeriod = 20,
  slowPeriod = 50,
  maType = "sma"
) {
  const maFast = maByDate(bars, fastPeriod, maType);
  const maMedium = maByDate(bars, mediumPeriod, maType);
  const maSlow = maByDate(bars, slowPeriod, maType);
  return runTripleMaLoop(
    bars,
    (_i, date) => maFast.get(date),
    (_i, date) => maMedium.get(date),
    (_i, date) => maSlow.get(date)
  );
}

/** Same rules; uses precomputed SMA arrays (bar index) for grid search. */
export function simulateTripleMaWithMaCache(
  bars,
  fastPeriod,
  mediumPeriod,
  slowPeriod,
  maCache
) {
  const maFast = maCache.get(fastPeriod);
  const maMedium = maCache.get(mediumPeriod);
  const maSlow = maCache.get(slowPeriod);
  if (!maFast || !maMedium || !maSlow) {
    return { trades: [], markers: [] };
  }
  return runTripleMaLoop(
    bars,
    (i) => maFast[i],
    (i) => maMedium[i],
    (i) => maSlow[i]
  );
}
