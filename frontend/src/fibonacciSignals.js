import { computeAllLegs, zoneBottomRatio } from "./fibonacci.js";

/**
 * Fibonacci retracement/extension (long only).
 * Legs come from `computeAllLegs` (swing low -> next swing high, walked
 * forward). A leg is only used from its `confirmIndex` onward — the bar
 * the high is actually confirmable — so this stays causal / no lookahead.
 * Entry: a bar closes inside the retracement zone whose top is
 * `entryLevel` and whose bottom is the next deeper Fibonacci ratio
 * (0.618 -> 0.786, the golden zone) -> fill next open.
 * Exit: close at/above the extension target, or close below the leg low
 * (protective stop) -> fill next open.
 */
export function simulateFibonacci(
  bars,
  swingN = 10,
  entryLevel = 0.618,
  extensionTarget = 1.618,
  legOpts = {}
) {
  if (!bars?.length) return { trades: [], markers: [] };

  const legs = computeAllLegs(bars, swingN, entryLevel, legOpts);
  const zoneBottom = zoneBottomRatio(entryLevel);

  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let pendingEntry = null;
  let pendingExit = false;

  let leg = null;
  let legDead = false;
  let legCursor = 0;

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
      open = {
        entryDate: bar.date,
        entryPrice: bar.open,
        ...pendingEntry,
      };
    }
    pendingEntry = null;

    while (legCursor < legs.length && legs[legCursor].confirmIndex <= i) {
      leg = legs[legCursor];
      legDead = false;
      legCursor++;
    }

    if (!leg) continue;
    const close = bar.close;
    if (!Number.isFinite(close)) continue;
    const hasNextBar = i < bars.length - 1;

    if (!inTrade) {
      if (!legDead && close < leg.lowPrice) {
        legDead = true;
        continue;
      }
      if (legDead) continue;

      const range = leg.highPrice - leg.lowPrice;
      const zoneTopPrice = leg.highPrice - range * entryLevel;
      const zoneBottomPrice = leg.highPrice - range * zoneBottom;
      if (close <= zoneTopPrice && close >= zoneBottomPrice) {
        markers.push({
          time: bar.date,
          position: "belowBar",
          shape: "arrowUp",
          color: "#6abf69",
          text: "Open",
          size: 2,
        });
        if (hasNextBar) {
          // legLowTime/legHighTime tie the trade back to its leg
          // (see `legsWithTrades`).
          pendingEntry = {
            stopPrice: leg.lowPrice,
            targetPrice: leg.highPrice + range * (extensionTarget - 1),
            legLowTime: leg.lowTime,
            legHighTime: leg.highTime,
          };
        }
      }
    } else {
      const hitTarget = close >= open.targetPrice;
      const hitStop = close < open.stopPrice;
      if (hitTarget || hitStop) {
        markers.push({
          time: bar.date,
          position: "aboveBar",
          shape: "arrowDown",
          color: "#ef5350",
          text: "Close",
          size: 2,
        });
        if (hasNextBar) pendingExit = true;
      }
    }
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}
