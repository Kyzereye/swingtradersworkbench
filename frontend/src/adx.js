/**
 * Wilder's Average Directional Index.
 *
 * Indexed by bar index (not date) so both simulateTrades and
 * simulateTradesWithMaCache can read it with the barIndex they already loop on.
 */

function trueRange(bar, prev) {
  return Math.max(
    bar.high - bar.low,
    Math.abs(bar.high - prev.close),
    Math.abs(bar.low - prev.close)
  );
}

/**
 * ADX value per bar index; null until the indicator warms up.
 * First non-null lands at index 2 × period − 1 (27 for the default 14).
 */
export function computeAdxSeries(bars, period = 14) {
  const n = bars.length;
  const out = new Array(n).fill(null);
  const p = Math.max(2, Math.floor(period) || 14);
  if (n < 2 * p) return out;

  // Wilder-smoothed true range and directional movement.
  let tr = 0;
  let plusDm = 0;
  let minusDm = 0;
  let dxSum = 0;
  let adx = null;

  for (let i = 1; i < n; i++) {
    const bar = bars[i];
    const prev = bars[i - 1];
    const up = bar.high - prev.high;
    const down = prev.low - bar.low;
    const rawPlus = up > down && up > 0 ? up : 0;
    const rawMinus = down > up && down > 0 ? down : 0;
    const rawTr = trueRange(bar, prev);

    if (i <= p) {
      // Seed each smoothed value with the plain sum of the first p raw values.
      tr += rawTr;
      plusDm += rawPlus;
      minusDm += rawMinus;
      if (i < p) continue;
    } else {
      tr = tr - tr / p + rawTr;
      plusDm = plusDm - plusDm / p + rawPlus;
      minusDm = minusDm - minusDm / p + rawMinus;
    }

    const plusDi = tr === 0 ? 0 : (100 * plusDm) / tr;
    const minusDi = tr === 0 ? 0 : (100 * minusDm) / tr;
    const diSum = plusDi + minusDi;
    const dx = diSum === 0 ? 0 : (100 * Math.abs(plusDi - minusDi)) / diSum;

    if (i < 2 * p - 1) {
      dxSum += dx;
    } else if (i === 2 * p - 1) {
      dxSum += dx;
      adx = dxSum / p;
      out[i] = adx;
    } else {
      adx = (adx * (p - 1) + dx) / p;
      out[i] = adx;
    }
  }

  return out;
}

/**
 * Wilder's Average True Range per bar index; null until the indicator warms up.
 * First non-null lands at index `period` (14 for the default).
 *
 * Shares trueRange with computeAdxSeries so the two indicators can never drift
 * apart on the definition of a bar's range.
 */
export function computeAtrSeries(bars, period = 14) {
  const n = bars.length;
  const out = new Array(n).fill(null);
  const p = Math.max(2, Math.floor(period) || 14);
  if (n <= p) return out;

  // Seed with the plain mean of the first p true ranges, then Wilder-smooth.
  let sum = 0;
  for (let i = 1; i <= p; i++) {
    sum += trueRange(bars[i], bars[i - 1]);
  }
  let atr = sum / p;
  out[p] = atr;

  for (let i = p + 1; i < n; i++) {
    atr = (atr * (p - 1) + trueRange(bars[i], bars[i - 1])) / p;
    out[i] = atr;
  }

  return out;
}
