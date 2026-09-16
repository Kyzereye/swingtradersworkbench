import { computeMaSeries } from "./ma.js";
import { computeKeltnerSeries } from "./keltner.js";

/**
 * Sample stdev of `values` (length >= 2). Returns null if too short.
 */
function stdev(values) {
  const n = values.length;
  if (n < 2) return null;
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / n;
  let sq = 0;
  for (const v of values) {
    const d = v - mean;
    sq += d * d;
  }
  return Math.sqrt(sq / n);
}

/**
 * Bollinger bands: SMA ± stdMult * stdev(close).
 * Returns { time, mid, upper, lower, squeeze }[]
 * Squeeze = BB inside Keltner (same emaPeriod as BB period, atrPeriod, atrMult).
 */
export function computeBollingerSeries(
  bars,
  period = 20,
  stdMult = 2,
  atrPeriod = 10,
  atrMult = 1.5
) {
  const p = Math.max(2, Math.floor(period) || 20);
  const mult = Number(stdMult);
  if (!bars?.length || !Number.isFinite(mult) || mult <= 0) return [];

  const midSeries = computeMaSeries(bars, p, "sma");
  const midByTime = new Map(midSeries.map((x) => [x.time, x.value]));
  const keltner = computeKeltnerSeries(bars, p, atrPeriod, atrMult);
  const kelByTime = new Map(keltner.map((x) => [x.time, x]));

  const out = [];
  for (let i = p - 1; i < bars.length; i++) {
    const time = bars[i].date;
    const mid = midByTime.get(time);
    if (mid == null) continue;
    const window = [];
    for (let j = i - p + 1; j <= i; j++) window.push(bars[j].close);
    const sd = stdev(window);
    if (sd == null) continue;
    const width = sd * mult;
    const upper = mid + width;
    const lower = mid - width;
    const kel = kelByTime.get(time);
    const squeeze =
      kel != null && upper < kel.upper && lower > kel.lower;
    out.push({ time, mid, upper, lower, squeeze });
  }
  return out;
}

export function computeBollingerMidSeries(
  bars,
  period,
  stdMult,
  atrPeriod,
  atrMult
) {
  return computeBollingerSeries(
    bars,
    period,
    stdMult,
    atrPeriod,
    atrMult
  ).map((p) => ({ time: p.time, value: p.mid }));
}

export function computeBollingerUpperSeries(
  bars,
  period,
  stdMult,
  atrPeriod,
  atrMult
) {
  return computeBollingerSeries(
    bars,
    period,
    stdMult,
    atrPeriod,
    atrMult
  ).map((p) => ({ time: p.time, value: p.upper }));
}

export function computeBollingerLowerSeries(
  bars,
  period,
  stdMult,
  atrPeriod,
  atrMult
) {
  return computeBollingerSeries(
    bars,
    period,
    stdMult,
    atrPeriod,
    atrMult
  ).map((p) => ({ time: p.time, value: p.lower }));
}
