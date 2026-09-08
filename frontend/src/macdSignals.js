import { computeMacdSeries } from "./macd.js";

/**
 * MACD signal-line cross (long only).
 * Entry: MACD crosses above signal on close → fill next open.
 * Exit: MACD crosses below signal on close → fill next open.
 * Same trade/marker shape as maCrossoverSignals for OpensClosesTable.
 */
export function simulateMacd(
  bars,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
) {
  const { macd, signal } = computeMacdSeries(
    bars,
    fastPeriod,
    slowPeriod,
    signalPeriod
  );
  const macdByTime = new Map(macd.map((p) => [p.time, p.value]));
  const signalByTime = new Map(signal.map((p) => [p.time, p.value]));

  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;
  let prevMacd = null;
  let prevSignal = null;

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

    const m = macdByTime.get(bar.date);
    const s = signalByTime.get(bar.date);
    if (m == null || s == null) {
      prevMacd = m ?? null;
      prevSignal = s ?? null;
      continue;
    }

    const hasNextBar = i < bars.length - 1;

    if (
      prevMacd != null &&
      prevSignal != null &&
      prevMacd <= prevSignal &&
      m > s &&
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
      prevMacd != null &&
      prevSignal != null &&
      prevMacd >= prevSignal &&
      m < s &&
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

    prevMacd = m;
    prevSignal = s;
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}
