/**
 * Wilder RSI of close. Returns { time, value } from the first valid bar onward.
 */
export function computeRsiSeries(bars, period = 14) {
  if (!bars?.length || period < 1 || bars.length <= period) return [];

  const closes = bars.map((b) => b.close);
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gainSum += d;
    else lossSum -= d;
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  const out = [];

  function pushRsi(i) {
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    out.push({ time: bars[i].date, value: rsi });
  }

  pushRsi(period);

  for (let i = period + 1; i < bars.length; i++) {
    const d = closes[i] - closes[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    pushRsi(i);
  }

  return out;
}
