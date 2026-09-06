/**
 * Per-symbol pullback tendency — a diagnostic, not a trading rule.
 *
 * Measures how deep a symbol's normal uptrend pullbacks are and how often they
 * close below the fast MA. Nothing here changes the open/close rules; see
 * docs/pullback-tendency-task.md for the definitions and how it is used.
 *
 * Indexed by bar index (like adx.js) so the SMA arrays from buildSmaIndexCache
 * line up without a date lookup.
 *
 * Trend-intact segment: a maximal run of bars with close > slow and fast > slow.
 * A decline outside one of these is not a pullback, it is a downtrend.
 *
 * Episode: inside a segment, price trading below the running peak of `high`.
 * It ends on a new high (recovered) or when the segment breaks (break). Depth
 * is peak -> trough.
 *
 * Depth pools, pierce rate splits — and the asymmetry is deliberate:
 *   - Depth statistics include break episodes. Segment-ending dips are often
 *     the deep ones and cluster in the choppy names this metric exists to find,
 *     so excluding them would tend to make a symbol look shallower the worse it
 *     behaves. (Breaks are not *always* deep — a segment can break on a shallow
 *     wobble when fast and slow sit close together — which is exactly why this
 *     is a reporting split and not an assertable invariant.)
 *   - The headline pierce rate uses recovered episodes only. A break by
 *     close <= slow while fast > slow implies close < slow < fast, so those
 *     break episodes are pierced by construction; pooling them would manufacture
 *     a pierce rate that only tracks how often trends end.
 *
 * Sub-window statistics come from summarizeWindow() over a single full-history
 * walk, never from re-walking a slice. Re-walking would restart the segment
 * state at the slice edge, re-anchor the peak on a mid-segment bar and invent
 * episodes the full run never saw.
 */

import { buildSmaIndexCache } from "./ma.js";
import { computeAtrSeries } from "./adx.js";

const DEFAULT_MIN_DEPTH_PCT = 1;
const DEFAULT_ATR_PERIOD = 14;

/** perBar codes. */
const NOT_INTACT = 0;
const INTACT = 1;
const INTACT_PIERCED = 2;

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function ratePct(hits, total) {
  return total ? (hits / total) * 100 : null;
}

/** One SMA array by bar index. buildSmaIndexCache clamps lo to 2, so guard. */
function smaArray(bars, period) {
  const p = Math.max(2, Math.floor(period) || 2);
  return buildSmaIndexCache(bars, p, p).get(p);
}

const EMPTY_AGGREGATE = {
  episodeCount: 0,
  recoveredCount: 0,
  breakCount: 0,
  medianDepthPct: null,
  meanDepthPct: null,
  medianDepthAtr: null,
  medianDepthPctRecovered: null,
  medianDepthPctBreak: null,
  breakSharePct: null,
  episodePierceRateRecovered: null,
  episodePierceRateAll: null,
  barPierceRate: null,
  segmentBars: 0,
  medianAtrPct: null,
};

/**
 * Aggregate statistics over the episodes whose peak falls in [from, to) and the
 * bars in the same range. Episodes are assigned to exactly one window by peak
 * index, so windows partitioning the history partition the episodes too — the
 * counts add up by construction rather than by assertion.
 */
export function summarizeWindow(result, from = 0, to = Infinity) {
  if (!result?.perBar) return { ...EMPTY_AGGREGATE };

  const lo = Math.max(0, from);
  const hi = Math.min(result.perBar.length, to);
  if (hi <= lo) return { ...EMPTY_AGGREGATE };

  const episodes = result.episodes.filter(
    (e) => e.peakIndex >= lo && e.peakIndex < hi
  );

  let segmentBars = 0;
  let pierces = 0;
  const atrPcts = [];
  for (let i = lo; i < hi; i++) {
    const code = result.perBar[i];
    if (code === NOT_INTACT) continue;
    segmentBars += 1;
    if (code === INTACT_PIERCED) pierces += 1;
    const a = result.atrPctByBar[i];
    if (Number.isFinite(a)) atrPcts.push(a);
  }

  const recovered = episodes.filter((e) => e.recovered);
  const broke = episodes.filter((e) => !e.recovered);
  const depths = episodes.map((e) => e.depthPct);
  const depthAtrs = episodes.map((e) => e.depthAtr).filter((v) => v != null);

  return {
    episodeCount: episodes.length,
    recoveredCount: recovered.length,
    breakCount: broke.length,
    medianDepthPct: median(depths),
    meanDepthPct: mean(depths),
    medianDepthAtr: median(depthAtrs),
    medianDepthPctRecovered: median(recovered.map((e) => e.depthPct)),
    medianDepthPctBreak: median(broke.map((e) => e.depthPct)),
    breakSharePct: ratePct(broke.length, episodes.length),
    episodePierceRateRecovered: ratePct(
      recovered.filter((e) => e.pierced).length,
      recovered.length
    ),
    episodePierceRateAll: ratePct(
      episodes.filter((e) => e.pierced).length,
      episodes.length
    ),
    barPierceRate: ratePct(pierces, segmentBars),
    segmentBars,
    medianAtrPct: median(atrPcts),
  };
}

/**
 * Walk the full history once and return episodes, per-bar state and whole-window
 * aggregates. Use summarizeWindow() for sub-windows rather than calling this
 * again with a narrower range.
 *
 * startIndex/endIndex exist for callers that genuinely want a restricted walk
 * (the noise-floor sensitivity sweep re-walks with a different floor); they
 * restrict measurement only, since the SMAs and ATR always warm up on the full
 * bar array.
 */
export function computePullbackTendency(bars, fastPeriod, slowPeriod, options = {}) {
  const {
    minDepthPct = DEFAULT_MIN_DEPTH_PCT,
    atrPeriod = DEFAULT_ATR_PERIOD,
    startIndex = 0,
    endIndex = bars?.length ?? 0,
  } = options;

  const n = bars?.length ?? 0;
  const base = {
    episodes: [],
    perBar: new Int8Array(n),
    atrPctByBar: new Float64Array(n).fill(NaN),
    unresolved: null,
    segmentCount: 0,
    windowFrom: null,
    windowTo: null,
    ...EMPTY_AGGREGATE,
  };
  if (!n) return base;

  const from = Math.max(0, startIndex);
  const to = Math.min(n, endIndex);
  if (to - from < 2) return base;

  const fastArr = smaArray(bars, fastPeriod);
  const slowArr = smaArray(bars, slowPeriod);
  const atrArr = computeAtrSeries(bars, atrPeriod);

  const perBar = new Int8Array(n);
  const atrPctByBar = new Float64Array(n).fill(NaN);
  const episodes = [];
  let unresolved = null;
  let segmentCount = 0;

  let inSegment = false;
  let peak = null;
  let peakIndex = -1;
  let episodeOpen = false;
  let trough = null;
  let troughIndex = -1;
  let pierced = false;

  /** Push an episode if it clears the noise floor. Peak is not reset here. */
  function record(recovered, endIdx, breakInfo) {
    if (!episodeOpen) return;
    const depth = peak - trough;
    const depthPct = peak > 0 ? (depth / peak) * 100 : 0;
    if (depthPct >= minDepthPct) {
      const atrAtPeak = atrArr[peakIndex];
      episodes.push({
        peakIndex,
        peakDate: bars[peakIndex].date,
        peakPrice: peak,
        troughIndex,
        troughDate: bars[troughIndex].date,
        troughPrice: trough,
        depthPct,
        depthAtr: atrAtPeak != null && atrAtPeak > 0 ? depth / atrAtPeak : null,
        pierced,
        recovered,
        lengthBars: endIdx - peakIndex,
        ...breakInfo,
      });
    }
    episodeOpen = false;
  }

  for (let i = from; i < to; i++) {
    const bar = bars[i];
    const fast = fastArr[i];
    const slow = slowArr[i];
    const intact =
      fast != null && slow != null && bar.close > slow && fast > slow;

    if (!intact) {
      if (inSegment) {
        // The breaking bar is outside the segment, but it is still the bar the
        // pullback ended on — so its close counts toward `pierced`, and that is
        // what makes the close<=slow => pierced relationship hold.
        if (episodeOpen && fast != null && bar.close < fast) pierced = true;
        record(false, i, {
          breakIndex: i,
          breakDate: bar.date,
          breakByCloseBelowSlow: slow != null && bar.close <= slow,
          breakPierceImplied:
            slow != null && fast != null && bar.close <= slow && fast > slow,
        });
        inSegment = false;
        episodeOpen = false;
      }
      continue;
    }

    const atr = atrArr[i];
    if (atr != null && bar.close > 0) atrPctByBar[i] = (atr / bar.close) * 100;
    perBar[i] = bar.close < fast ? INTACT_PIERCED : INTACT;

    if (!inSegment) {
      inSegment = true;
      segmentCount += 1;
      peak = bar.high;
      peakIndex = i;
      episodeOpen = false;
      continue;
    }

    if (bar.high > peak) {
      // Strict >: a bar equal to the peak is not a recovery, so a flat series
      // cannot emit an endless run of zero-depth episodes.
      record(true, i, {});
      peak = bar.high;
      peakIndex = i;
      continue;
    }

    if (!episodeOpen) {
      episodeOpen = true;
      trough = bar.low;
      troughIndex = i;
      pierced = false;
    } else if (bar.low < trough) {
      trough = bar.low;
      troughIndex = i;
    }
    if (bar.close < fast) pierced = true;
  }

  // An episode still open at the window edge has no final trough, so it is not
  // recorded — but it is reported, because dropping it silently would bias the
  // same way excluding break episodes would.
  if (episodeOpen && peak > 0) {
    const depthPct = ((peak - trough) / peak) * 100;
    if (depthPct >= minDepthPct) {
      unresolved = {
        peakDate: bars[peakIndex].date,
        troughDate: bars[troughIndex].date,
        depthPctSoFar: depthPct,
        pierced,
      };
    }
  }

  const result = {
    episodes,
    perBar,
    atrPctByBar,
    unresolved,
    segmentCount,
    windowFrom: bars[from].date,
    windowTo: bars[to - 1].date,
  };
  return { ...result, ...summarizeWindow(result, from, to) };
}
