import { computeBollingerSeries } from "./bollinger.js";

/**
 * Bollinger squeeze & reversion (long only).
 * Entry: prior bar in squeeze (BB inside Keltner), close above upper BB → next open.
 * Exit: close below middle SMA → next open.
 */
export function simulateBollinger(
  bars,
  period = 20,
  stdMult = 2,
  atrPeriod = 10,
  atrMult = 1.5
) {
  const series = computeBollingerSeries(
    bars,
    period,
    stdMult,
    atrPeriod,
    atrMult
  );
  const byTime = new Map(series.map((p) => [p.time, p]));

  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;
  let prev = null;

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
    if (ch == null) {
      prev = null;
      continue;
    }

    const hasNextBar = i < bars.length - 1;
    const wasSqueeze = prev != null && prev.squeeze === true;

    if (!inTrade && wasSqueeze && bar.close > ch.upper) {
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

    prev = ch;
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}
