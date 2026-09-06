/**
 * Per-symbol undershoot under the fast MA — research metric, not a live rule.
 *
 * An event (docs/undershoot-buffer-task.md):
 *   a. Price closes below the fast MA (trade close), then later closes back
 *      above the fast MA (trade open).
 *   b. Record how far below the fast MA the close went (worst % during the event).
 *   c. Average those percentages across events.
 *   d. Drop the event if, at any bar during it, fast MA goes below slow MA
 *      (no longer an uptrend).
 *
 * Depth uses daily close — same price the exit rule uses.
 * SMA only (matches the nightly scan).
 */

import { buildSmaIndexCache } from "./ma.js";

function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function smaArray(bars, period) {
  const p = Math.max(2, Math.floor(period) || 2);
  return buildSmaIndexCache(bars, p, p).get(p);
}

/**
 * Find qualifying events and summarize undershoot %.
 *
 * @returns {{
 *   events: Array<object>,
 *   discardedTrendBreak: number,
 *   unresolved: object|null,
 *   eventCount: number,
 *   meanUndershootPct: number|null,
 *   medianUndershootPct: number|null,
 * }}
 */
export function computeUndershootEvents(bars, fastPeriod, slowPeriod) {
  const empty = {
    events: [],
    discardedTrendBreak: 0,
    unresolved: null,
    eventCount: 0,
    meanUndershootPct: null,
    medianUndershootPct: null,
  };
  if (!bars?.length) return empty;

  const fastArr = smaArray(bars, fastPeriod);
  const slowArr = smaArray(bars, slowPeriod);

  const events = [];
  let discardedTrendBreak = 0;
  let unresolved = null;

  let inEvent = false;
  let trendBroken = false;
  let startIndex = -1;
  let maxUndershootPct = 0;
  let worstClose = null;
  let worstIndex = -1;
  let fastAtWorst = null;

  function reset() {
    inEvent = false;
    trendBroken = false;
    startIndex = -1;
    maxUndershootPct = 0;
    worstClose = null;
    worstIndex = -1;
    fastAtWorst = null;
  }

  for (let i = 0; i < bars.length; i++) {
    const fast = fastArr[i];
    const slow = slowArr[i];
    if (fast == null || slow == null) continue;

    const close = bars[i].close;
    const belowFast = close < fast;
    const aboveFast = close > fast;
    const uptrendOk = fast > slow;

    if (!inEvent) {
      // Trade close signal: close drops below the fast MA.
      if (belowFast) {
        inEvent = true;
        trendBroken = !uptrendOk;
        startIndex = i;
        maxUndershootPct = fast > 0 ? ((fast - close) / fast) * 100 : 0;
        worstClose = close;
        worstIndex = i;
        fastAtWorst = fast;
      }
      continue;
    }

    // Open event until close is back above the fast MA (trade open).
    if (!uptrendOk) trendBroken = true;

    if (!aboveFast) {
      if (belowFast) {
        const depth = fast > 0 ? ((fast - close) / fast) * 100 : 0;
        if (depth > maxUndershootPct) {
          maxUndershootPct = depth;
          worstClose = close;
          worstIndex = i;
          fastAtWorst = fast;
        }
      }
      continue;
    }

    // Close crossed back above fast — event ends.
    if (trendBroken) {
      discardedTrendBreak += 1;
    } else {
      events.push({
        startIndex,
        startDate: bars[startIndex].date,
        endIndex: i,
        endDate: bars[i].date,
        undershootPct: maxUndershootPct,
        worstClose,
        worstDate: bars[worstIndex].date,
        fastAtWorst,
      });
    }
    reset();
  }

  if (inEvent) {
    unresolved = {
      startDate: bars[startIndex].date,
      undershootPctSoFar: maxUndershootPct,
      trendBroken,
    };
  }

  const depths = events.map((e) => e.undershootPct);
  return {
    events,
    discardedTrendBreak,
    unresolved,
    eventCount: events.length,
    meanUndershootPct: mean(depths),
    medianUndershootPct: median(depths),
  };
}

/**
 * Turn measured undershoot into the buffer % to feed simulateTrades.
 * Too few events → 0. Otherwise mean or median, capped at maxBufferPct.
 */
export function bufferFromUndershoot(
  summary,
  {
    useMedian = false,
    minEvents = 3,
    maxBufferPct = 5,
  } = {}
) {
  if (!summary || summary.eventCount < minEvents) {
    return {
      bufferPct: 0,
      reason: `fewer than ${minEvents} events (had ${summary?.eventCount ?? 0})`,
    };
  }
  const raw = useMedian ? summary.medianUndershootPct : summary.meanUndershootPct;
  if (raw == null || !Number.isFinite(raw)) {
    return { bufferPct: 0, reason: "no undershoot value" };
  }
  const capped = Math.min(raw, maxBufferPct);
  const reason =
    capped < raw - 1e-12
      ? `capped from ${raw.toFixed(2)}% to ${maxBufferPct}%`
      : useMedian
        ? "median undershoot"
        : "average undershoot";
  return { bufferPct: capped, reason };
}
