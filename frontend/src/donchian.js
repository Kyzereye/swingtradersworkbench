/**
 * Donchian channel levels (prior window, exclude current bar).
 * Upper = max high of previous `period` bars.
 * Lower = min low of previous `period` bars.
 * Returns { time, upper, lower }[] — only bars with a full prior window.
 */
export function computeDonchianSeries(bars, period) {
  const p = Math.max(1, Math.floor(period) || 1);
  if (!bars?.length || bars.length <= p) return [];

  const out = [];
  for (let i = p; i < bars.length; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - p; j < i; j++) {
      const h = bars[j].high;
      const l = bars[j].low;
      if (h > hi) hi = h;
      if (l < lo) lo = l;
    }
    out.push({
      time: bars[i].date,
      upper: hi,
      lower: lo,
    });
  }
  return out;
}

/** Upper band only (entry channel). */
export function computeDonchianUpperSeries(bars, period) {
  return computeDonchianSeries(bars, period).map((p) => ({
    time: p.time,
    value: p.upper,
  }));
}

/** Lower band only (exit channel). */
export function computeDonchianLowerSeries(bars, period) {
  return computeDonchianSeries(bars, period).map((p) => ({
    time: p.time,
    value: p.lower,
  }));
}
