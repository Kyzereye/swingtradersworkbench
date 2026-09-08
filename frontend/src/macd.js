/** EMA of a { time, value } series (starts after `period` points). */
function emaOfSeries(points, period) {
  if (points.length < period) return [];
  const k = 2 / (period + 1);
  let ema =
    points.slice(0, period).reduce((a, p) => a + p.value, 0) / period;
  const out = [{ time: points[period - 1].time, value: ema }];
  for (let i = period; i < points.length; i++) {
    ema = points[i].value * k + ema * (1 - k);
    out.push({ time: points[i].time, value: ema });
  }
  return out;
}

function emaOfCloses(bars, period) {
  if (bars.length < period) return [];
  const k = 2 / (period + 1);
  let ema =
    bars.slice(0, period).reduce((a, b) => a + b.close, 0) / period;
  const out = [{ time: bars[period - 1].date, value: ema }];
  for (let i = period; i < bars.length; i++) {
    ema = bars[i].close * k + ema * (1 - k);
    out.push({ time: bars[i].date, value: ema });
  }
  return out;
}

/**
 * Classic MACD: EMA(fast) − EMA(slow), signal = EMA(macd), hist = macd − signal.
 * Defaults 12 / 26 / 9.
 */
export function computeMacdSeries(
  bars,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
) {
  const fast = emaOfCloses(bars, fastPeriod);
  const slow = emaOfCloses(bars, slowPeriod);
  if (!fast.length || !slow.length) {
    return { macd: [], signal: [], histogram: [] };
  }

  const slowByTime = new Map(slow.map((p) => [p.time, p.value]));
  const macdLine = [];
  for (const p of fast) {
    const s = slowByTime.get(p.time);
    if (s == null) continue;
    macdLine.push({ time: p.time, value: p.value - s });
  }

  const signalLine = emaOfSeries(macdLine, signalPeriod);
  const signalByTime = new Map(signalLine.map((p) => [p.time, p.value]));

  const histogram = [];
  for (const p of macdLine) {
    const sig = signalByTime.get(p.time);
    if (sig == null) continue;
    histogram.push({ time: p.time, value: p.value - sig });
  }

  return { macd: macdLine, signal: signalLine, histogram };
}
