import { computeDonchianSeries } from "./donchian.js";

/**
 * Donchian breakout (Turtle-style, long only).
 * Entry: price penetrates prior entryPeriod-day high (high > channel) → fill next open.
 * Exit: price penetrates prior exitPeriod-day low (low < channel) → fill next open.
 */
export function simulateDonchian(
  bars,
  entryPeriod = 20,
  exitPeriod = 10
) {
  const entryN = Math.max(1, Math.floor(entryPeriod) || 20);
  const exitN = Math.max(1, Math.floor(exitPeriod) || 10);
  const entrySeries = computeDonchianSeries(bars, entryN);
  const exitSeries = computeDonchianSeries(bars, exitN);
  const upperByTime = new Map(entrySeries.map((p) => [p.time, p.upper]));
  const lowerByTime = new Map(exitSeries.map((p) => [p.time, p.lower]));

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

    const upper = upperByTime.get(bar.date);
    const lower = lowerByTime.get(bar.date);
    const hasNextBar = i < bars.length - 1;
    const flat = !inTrade;

    // Turtle: price exceeds prior N-day high / falls below prior M-day low
    if (flat && upper != null && bar.high > upper) {
      markers.push({
        time: bar.date,
        position: "belowBar",
        shape: "arrowUp",
        color: "#6abf69",
        text: "Open",
        size: 2,
      });
      if (hasNextBar) pendingEntry = true;
    } else if (inTrade && lower != null && bar.low < lower) {
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
