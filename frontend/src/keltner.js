import { computeMaSeries } from "./ma.js";
import { computeAtrSeries } from "./atr.js";

/**
 * Keltner channels: EMA ± atrMult * ATR.
 * Returns { time, mid, upper, lower }[] where both EMA and ATR are defined.
 */
export function computeKeltnerSeries(
  bars,
  emaPeriod = 20,
  atrPeriod = 10,
  atrMult = 2
) {
  const midSeries = computeMaSeries(bars, emaPeriod, "ema");
  const atrSeries = computeAtrSeries(bars, atrPeriod);
  const atrByTime = new Map(atrSeries.map((p) => [p.time, p.value]));
  const mult = Number(atrMult);
  if (!Number.isFinite(mult) || mult <= 0) return [];

  const out = [];
  for (const m of midSeries) {
    const atr = atrByTime.get(m.time);
    if (atr == null) continue;
    const width = atr * mult;
    out.push({
      time: m.time,
      mid: m.value,
      upper: m.value + width,
      lower: m.value - width,
    });
  }
  return out;
}

export function computeKeltnerMidSeries(bars, emaPeriod, atrPeriod, atrMult) {
  return computeKeltnerSeries(bars, emaPeriod, atrPeriod, atrMult).map(
    (p) => ({ time: p.time, value: p.mid })
  );
}

export function computeKeltnerUpperSeries(bars, emaPeriod, atrPeriod, atrMult) {
  return computeKeltnerSeries(bars, emaPeriod, atrPeriod, atrMult).map(
    (p) => ({ time: p.time, value: p.upper })
  );
}

export function computeKeltnerLowerSeries(bars, emaPeriod, atrPeriod, atrMult) {
  return computeKeltnerSeries(bars, emaPeriod, atrPeriod, atrMult).map(
    (p) => ({ time: p.time, value: p.lower })
  );
}
