/**
 * True range and ATR (Wilder) helpers for Keltner channels.
 */

export function trueRange(bar, prevClose) {
  const hl = bar.high - bar.low;
  if (prevClose == null || !Number.isFinite(prevClose)) return hl;
  return Math.max(
    hl,
    Math.abs(bar.high - prevClose),
    Math.abs(bar.low - prevClose)
  );
}

/**
 * Wilder ATR series: { time, value }[] starting when period bars of TR exist.
 */
export function computeAtrSeries(bars, period) {
  const p = Math.max(1, Math.floor(period) || 14);
  if (!bars?.length || bars.length < p + 1) return [];

  const trs = [];
  for (let i = 0; i < bars.length; i++) {
    const prevClose = i > 0 ? bars[i - 1].close : null;
    trs.push(trueRange(bars[i], prevClose));
  }

  // First ATR at index p: average of trs[1..p] (skip TR0 which has no prior close)
  // Common approach: first ATR = mean of first `p` TRs from index 1..p, output at bar p
  // Simpler: first ATR = mean of trs[0..p-1] at bar p-1, then Wilder from there.
  let atr = 0;
  for (let i = 0; i < p; i++) atr += trs[i];
  atr /= p;

  const out = [{ time: bars[p - 1].date, value: atr }];
  for (let i = p; i < bars.length; i++) {
    atr = (atr * (p - 1) + trs[i]) / p;
    out.push({ time: bars[i].date, value: atr });
  }
  return out;
}
