import { maByDate } from "./ma.js";

/** @typedef {'single' | 'double'} EntryConfirm */

export const ENTRY_CONFIRM = {
  SINGLE: "single",
  DOUBLE: "double",
};

/** Default open-gate thresholds as fractions of price (0.005 = 0.5%). */
export const DEFAULT_MIN_MA_SPREAD_PCT = 0.005;
export const DEFAULT_MIN_CLEARANCE_PCT = 0.0025;

/**
 * Entry: not in trade, close > slow MA, fast > slow, close > fast MA.
 * openGate: spread (fast−slow)/close is checked first; if below minSpreadPct,
 * clearance (close−fast)/close must be >= minClearancePct or entry is skipped.
 * entryConfirm 'single' | 'double' — closes above fast before entry.
 * After exit (close < fast MA), one close above fast clears recovery block.
 * Exit: in trade and close < fast MA.
 */
export function simulateTrades(
  bars,
  fastPeriod = 21,
  slowPeriod = 50,
  maType = "ema",
  {
    entryConfirm = ENTRY_CONFIRM.SINGLE,
    openGate = false,
    minSpreadPct = DEFAULT_MIN_MA_SPREAD_PCT,
    minClearancePct = DEFAULT_MIN_CLEARANCE_PCT,
  } = {}
) {
  const requireDouble = entryConfirm === ENTRY_CONFIRM.DOUBLE;
  const maFast = maByDate(bars, fastPeriod, maType);
  const maSlow = maByDate(bars, slowPeriod, maType);
  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let needsRecoveryAboveFast = false;
  let consecutiveClosesAboveFast = 0;

  for (const bar of bars) {
    const eFast = maFast.get(bar.date);
    const eSlow = maSlow.get(bar.date);
    if (eFast == null || eSlow == null) continue;

    if (bar.close > eFast) {
      consecutiveClosesAboveFast += 1;
      needsRecoveryAboveFast = false;
    } else {
      consecutiveClosesAboveFast = 0;
    }

    if (inTrade && bar.close < eFast) {
      inTrade = false;
      open.exitDate = bar.date;
      open.exitPrice = bar.close;
      trades.push(open);
      markers.push({
        time: bar.date,
        position: "aboveBar",
        shape: "arrowDown",
        color: "#ef5350",
        text: "Close",
      });
      open = null;
      needsRecoveryAboveFast = true;
      consecutiveClosesAboveFast = 0;
    } else if (
      !inTrade &&
      !needsRecoveryAboveFast &&
      bar.close > eSlow &&
      bar.close > eFast &&
      eFast > eSlow &&
      (!requireDouble || consecutiveClosesAboveFast >= 2)
    ) {
      let allowEntry = true;
      if (openGate) {
        const spreadPct = (eFast - eSlow) / bar.close;
        if (spreadPct >= minSpreadPct) {
          allowEntry = true;
        } else {
          const clearancePct = (bar.close - eFast) / bar.close;
          allowEntry = clearancePct >= minClearancePct;
        }
      }

      if (allowEntry) {
        inTrade = true;
        open = {
          entryDate: bar.date,
          entryPrice: bar.close,
        };
        markers.push({
          time: bar.date,
          position: "belowBar",
          shape: "arrowUp",
          color: "#6abf69",
          text: "Open",
        });
      }
    }
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}
