import { maByDate } from "./ma.js";
import {
  MR_ENTRY_COLOR,
  MR_EXIT_COLOR,
  MR_UPPER_ENTRY_COLOR,
  MR_UPPER_EXIT_COLOR,
} from "./chartColors.js";

export const MR_LOWER_EXIT = "MR Exit";
export const MR_UPPER_EXIT = "MR Upper Exit";

/**
 * Long mean reversion: enter when close crosses into zone deviation% below MA;
 * exit when close reverts to MA (close >= MA).
 */
export function simulateMeanRevertTrades(
  bars,
  maPeriod = 21,
  deviationPct = 3,
  maType = "ema"
) {
  const ma = maByDate(bars, maPeriod, maType);
  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let prevClose = null;

  const pct = Math.max(0.1, deviationPct) / 100;

  for (const bar of bars) {
    const maVal = ma.get(bar.date);
    if (maVal == null) continue;

    const threshold = maVal * (1 - pct);

    if (inTrade && bar.close >= maVal) {
      inTrade = false;
      open.exitDate = bar.date;
      open.exitPrice = bar.close;
      trades.push(open);
      markers.push({
        time: bar.date,
        position: "aboveBar",
        shape: "arrowDown",
        color: MR_EXIT_COLOR,
        text: MR_LOWER_EXIT,
      });
      open = null;
    } else if (
      !inTrade &&
      bar.close <= threshold &&
      (prevClose == null || prevClose > threshold)
    ) {
      inTrade = true;
      open = {
        entryDate: bar.date,
        entryPrice: bar.close,
      };
      markers.push({
        time: bar.date,
        position: "belowBar",
        shape: "arrowUp",
        color: MR_ENTRY_COLOR,
        text: "MR Entry",
      });
    }

    prevClose = bar.close;
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}

/**
 * Upper-band mean reversion (fade): enter when close crosses into zone deviation% above MA;
 * exit when close reverts to MA (close <= MA).
 */
export function simulateUpperMeanRevertTrades(
  bars,
  maPeriod = 21,
  deviationPct = 3,
  maType = "ema"
) {
  const ma = maByDate(bars, maPeriod, maType);
  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let prevClose = null;

  const pct = Math.max(0.1, deviationPct) / 100;

  for (const bar of bars) {
    const maVal = ma.get(bar.date);
    if (maVal == null) continue;

    const threshold = maVal * (1 + pct);

    if (inTrade && bar.close <= maVal) {
      inTrade = false;
      open.exitDate = bar.date;
      open.exitPrice = bar.close;
      trades.push(open);
      markers.push({
        time: bar.date,
        position: "belowBar",
        shape: "arrowUp",
        color: MR_UPPER_EXIT_COLOR,
        text: MR_UPPER_EXIT,
      });
      open = null;
    } else if (
      !inTrade &&
      bar.close >= threshold &&
      (prevClose == null || prevClose < threshold)
    ) {
      inTrade = true;
      open = {
        entryDate: bar.date,
        entryPrice: bar.close,
      };
      markers.push({
        time: bar.date,
        position: "aboveBar",
        shape: "arrowDown",
        color: MR_UPPER_ENTRY_COLOR,
        text: "MR Upper Entry",
      });
    }

    prevClose = bar.close;
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}

/** Lower band = MA × (1 − deviation%). */
export function meanRevertLowerBandSeries(bars, maPeriod, deviationPct, maType = "ema") {
  return meanRevertBandSeries(bars, maPeriod, deviationPct, maType, false);
}

/** Upper band = MA × (1 + deviation%). */
export function meanRevertUpperBandSeries(bars, maPeriod, deviationPct, maType = "ema") {
  return meanRevertBandSeries(bars, maPeriod, deviationPct, maType, true);
}

function meanRevertBandSeries(bars, maPeriod, deviationPct, maType, upper) {
  const ma = maByDate(bars, maPeriod, maType);
  const pct = Math.max(0.1, deviationPct) / 100;
  const factor = upper ? 1 + pct : 1 - pct;
  const out = [];
  for (const bar of bars) {
    const maVal = ma.get(bar.date);
    if (maVal == null) continue;
    out.push({ time: bar.date, value: maVal * factor });
  }
  return out;
}
