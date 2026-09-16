import { computeRsiSeries } from "./rsi.js";

/**
 * Simple RSI mean reversion (long only).
 * Entry: RSI crosses up through oversold on close → fill next open.
 * Exit: RSI crosses up through overbought on close → fill next open.
 */
export function simulateRsi(
  bars,
  period = 14,
  oversold = 30,
  overbought = 70
) {
  const rsiSeries = computeRsiSeries(bars, period);
  const rsiByTime = new Map(rsiSeries.map((p) => [p.time, p.value]));

  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;
  let prevRsi = null;

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

    const rsi = rsiByTime.get(bar.date);
    if (rsi == null) {
      prevRsi = null;
      continue;
    }

    const hasNextBar = i < bars.length - 1;

    if (
      prevRsi != null &&
      prevRsi <= oversold &&
      rsi > oversold &&
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
      prevRsi != null &&
      prevRsi <= overbought &&
      rsi > overbought &&
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

    prevRsi = rsi;
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}
