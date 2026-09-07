function computeEma(bars, period) {
  if (bars.length < period) return [];
  const k = 2 / (period + 1);
  const closes = bars.map((b) => b.close);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const out = [{ time: bars[period - 1].date, value: ema }];
  for (let i = period; i < bars.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    out.push({ time: bars[i].date, value: ema });
  }
  return out;
}

function computeSma(bars, period) {
  if (bars.length < period) return [];
  const closes = bars.map((b) => b.close);
  let sum = closes.slice(0, period).reduce((a, b) => a + b, 0);
  const out = [{ time: bars[period - 1].date, value: sum / period }];
  for (let i = period; i < closes.length; i++) {
    sum += closes[i] - closes[i - period];
    out.push({ time: bars[i].date, value: sum / period });
  }
  return out;
}

/**
 * SMA value per bar index (null until period bars exist), for just the periods
 * asked for. A grid that only uses a handful of periods should pass them here
 * rather than building every integer in a range.
 */
export function buildSmaIndexCacheForPeriods(bars, periods) {
  const n = bars.length;
  const closes = bars.map((b) => b.close);
  const cache = new Map();

  for (const period of new Set(periods)) {
    if (!Number.isInteger(period) || period < 2 || cache.has(period)) continue;
    const values = new Array(n).fill(null);
    if (n >= period) {
      let sum = 0;
      for (let i = 0; i < period; i++) sum += closes[i];
      values[period - 1] = sum / period;
      for (let i = period; i < n; i++) {
        sum += closes[i] - closes[i - period];
        values[i] = sum / period;
      }
    }
    cache.set(period, values);
  }
  return cache;
}

/** SMA value per bar index for every period in [minPeriod, maxPeriod]. */
export function buildSmaIndexCache(bars, minPeriod, maxPeriod) {
  const lo = Math.max(2, minPeriod);
  const hi = Math.max(lo, maxPeriod);
  const periods = [];
  for (let period = lo; period <= hi; period++) periods.push(period);
  return buildSmaIndexCacheForPeriods(bars, periods);
}

export function computeMaSeries(bars, period, maType = "ema") {
  return maType === "sma" ? computeSma(bars, period) : computeEma(bars, period);
}

export function maByDate(bars, period, maType = "ema") {
  return new Map(computeMaSeries(bars, period, maType).map((p) => [p.time, p.value]));
}
