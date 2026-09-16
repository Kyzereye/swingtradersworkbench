import { computeKeltnerSeries } from "./keltner.js";

/**
 * Keltner Channel trend (long only).
 * Entry: close above upper band → fill next open.
 * Exit: close below middle EMA → fill next open.
 */
export function simulateKeltner(
  bars,
  emaPeriod = 20,
  atrPeriod = 10,
  atrMult = 2
) {
  const series = computeKeltnerSeries(bars, emaPeriod, atrPeriod, atrMult);
  const byTime = new Map(series.map((p) => [p.time, p]));

  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;

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

    const ch = byTime.get(bar.date);
    if (ch == null) continue;

    const hasNextBar = i < bars.length - 1;

    if (!inTrade && bar.close > ch.upper) {
      markers.push({
        time: bar.date,
        position: "belowBar",
        shape: "arrowUp",
        color: "#6abf69",
        text: "Open",
        size: 2,
      });
      if (hasNextBar) pendingEntry = true;
    } else if (inTrade && bar.close < ch.mid) {
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

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}
