/**
 * Fibonacci swing legs and their retracement/extension levels.
 * Pure JS (browser + Node).
 */

import { computeAtrSeries } from "./atr.js";

export const RETRACEMENT_RATIOS = [0.382, 0.5, 0.618, 0.786];
export const EXTENSION_RATIOS = [1.272, 1.618, 2.0];

/**
 * Noise filter: a candidate high only counts once the leg is at least
 * `minLegPct` percent of the swing low OR `minLegAtr` × ATR(14) tall —
 * either passes. 0 disables that test. Not optimized; the scan uses these.
 */
export const FIB_LEG_DEFAULTS = { minLegPct: 5, minLegAtr: 3 };
const ATR_PERIOD = 14;

/** Display label for a leg's `outcome` (see `legsWithTrades`). */
export const OUTCOME_LABEL = {
  none: "No signal",
  open: "Active",
  win: "Gain",
  loss: "Decline",
};

/** Bar `i` is a swing low if its low is under every low of the previous `swingN` bars. */
function isSwingLow(bars, i, swingN) {
  if (i < swingN) return false;
  const lo = bars[i].low;
  if (!Number.isFinite(lo)) return false;
  for (let k = i - swingN; k < i; k++) {
    if (!(lo < bars[k].low)) return false;
  }
  return true;
}

/**
 * Every leg in the data, walked forward the way a trader reads a chart:
 * find a swing low (a low under the previous `swingN` lows — look back
 * only), then the highest high after it, confirmed by whichever comes
 * first: `swingN` bars pass without exceeding it, or a later bar closes
 * inside the entry zone measured from the low to that high (the
 * pullback itself proves the high). Neither path fires until the leg
 * is big enough (see FIB_LEG_DEFAULTS) — a too-small high just keeps
 * the search open. That low → high is the leg. A lower low before the
 * high confirms restarts the leg from the new low. After a leg
 * confirms, the next swing-low search resumes right after its high
 * (the confirmation window is re-read, since those bars are known by
 * then). Each leg carries `confirmIndex` — the first bar at which it
 * is knowable — so `simulateFibonacci` stays causal.
 * @returns {{ lowIndex, lowTime, lowPrice, highIndex, highTime, highPrice, confirmIndex }[]}
 */
export function computeAllLegs(
  bars,
  swingN = 10,
  entryLevel = 0.618,
  opts = {}
) {
  const minLegPct = opts.minLegPct ?? FIB_LEG_DEFAULTS.minLegPct;
  const minLegAtr = opts.minLegAtr ?? FIB_LEG_DEFAULTS.minLegAtr;
  const zoneTop = entryLevel;
  const zoneBottom = zoneBottomRatio(entryLevel);
  const legs = [];
  let low = null; // index of the current swing low, or null while seeking one
  let high = null; // index of the highest bar since `low`, or null
  let minConfirm = 0; // nothing is knowable before the previous leg confirmed

  // ATR series starts at bar ATR_PERIOD-1; index it by bar.
  const atrSeries = computeAtrSeries(bars, ATR_PERIOD);
  const atrAt = new Array(bars.length).fill(null);
  atrSeries.forEach((a, k) => {
    atrAt[ATR_PERIOD - 1 + k] = a.value;
  });

  const legBigEnough = () => {
    const L = bars[low].low;
    const range = bars[high].high - L;
    if (minLegPct > 0 && range / L >= minLegPct / 100) return true;
    const atr = atrAt[high];
    if (minLegAtr > 0 && atr != null && range >= minLegAtr * atr) return true;
    return minLegPct <= 0 && minLegAtr <= 0;
  };

  const closedInZone = (i) => {
    if (i <= high) return false;
    const H = bars[high].high;
    const range = H - bars[low].low;
    const close = bars[i].close;
    return close <= H - range * zoneTop && close >= H - range * zoneBottom;
  };

  for (let i = 0; i < bars.length; i++) {
    if (low == null) {
      if (isSwingLow(bars, i, swingN)) {
        low = i;
        high = null;
      }
      continue;
    }

    if (bars[i].low < bars[low].low) {
      low = i;
      high = null;
      continue;
    }
    if (high == null || bars[i].high > bars[high].high) high = i;

    if (legBigEnough() && (i - high >= swingN || closedInZone(i))) {
      const confirmIndex = Math.max(i, minConfirm);
      legs.push({
        lowIndex: low,
        lowTime: bars[low].date,
        lowPrice: bars[low].low,
        highIndex: high,
        highTime: bars[high].date,
        highPrice: bars[high].high,
        confirmIndex,
      });
      // Rewind to just after the high and re-read the confirmation
      // window for the next swing low. Anything found there was not
      // knowable before this leg confirmed, hence `minConfirm`.
      minConfirm = confirmIndex;
      i = high;
      low = null;
      high = null;
    }
  }
  return legs;
}

/**
 * All legs, each with the trade it produced (if any) and an outcome:
 * "none" | "open" | "win" | "loss".
 */
export function legsWithTrades(
  bars,
  swingN,
  trades = [],
  entryLevel = 0.618,
  opts = {}
) {
  return computeAllLegs(bars, swingN, entryLevel, opts).map((leg) => {
    const trade = trades.find(
      (t) => t.legLowTime === leg.lowTime && t.legHighTime === leg.highTime
    );
    let outcome = "none";
    if (trade) {
      if (trade.open) outcome = "open";
      else outcome = trade.exitPrice - trade.entryPrice > 0 ? "win" : "loss";
    }
    return { ...leg, trade: trade ?? null, outcome };
  });
}

/**
 * Bottom of the entry zone whose top is `entryLevel`: the next deeper
 * ratio in RETRACEMENT_RATIOS, or 1.0 (the swing low) past the last one.
 * 0.618 → 0.786 is the classic "golden zone".
 */
export function zoneBottomRatio(entryLevel) {
  const next = RETRACEMENT_RATIOS.find((r) => r > entryLevel);
  return next ?? 1.0;
}

export function retracementPrice(leg, ratio) {
  return leg.highPrice - (leg.highPrice - leg.lowPrice) * ratio;
}

export function extensionPrice(leg, ratio) {
  return leg.highPrice + (leg.highPrice - leg.lowPrice) * (ratio - 1);
}
