/**
 * Shared 1-share trade P/L helpers (optimizer, scans, Dow lists).
 */

export function runningTotalWithMtm(trades, markPrice, windowStart = null) {
  let total = 0;
  let any = false;
  for (const t of trades) {
    if (!t.open) {
      if (windowStart && t.exitDate < windowStart) continue;
      total += t.exitPrice - t.entryPrice;
      any = true;
    } else if (markPrice != null && t.entryPrice) {
      total += markPrice - t.entryPrice;
      any = true;
    }
  }
  return any ? total : null;
}

export function runningTotalPctWithMtm(trades, markPrice, windowStart = null) {
  let total = 0;
  let any = false;
  for (const t of trades) {
    if (!t.open) {
      if (windowStart && t.exitDate < windowStart) continue;
      if (!t.entryPrice) continue;
      total += (t.exitPrice / t.entryPrice - 1) * 100;
      any = true;
    } else if (markPrice != null && t.entryPrice) {
      total += (markPrice / t.entryPrice - 1) * 100;
      any = true;
    }
  }
  if (!any) return null;
  return total;
}
