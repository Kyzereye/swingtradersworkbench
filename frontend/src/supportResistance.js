/**
 * Horizontal support/resistance from major swing pivots + ATR zones.
 * Strict: few strong levels, not a line at every sideways pause.
 * Pure JS (browser + Node).
 */

import { computeAtrSeries } from "./atr.js";

export const SR_DEFAULTS = {
  /** Larger N → fewer, more significant pivots. */
  swingN: 10,
  atrPeriod: 14,
  /** Band / break tolerance in ATR multiples. */
  atrMult: 0.75,
  /**
   * Nearby pivots within this fraction of price merge into one zone.
   */
  mergePct: 0.06,
  /**
   * Touch / break half-width as fraction of price (tighter than merge).
   * Keeps “at the level” from meaning “somewhere in a 12% blob”.
   */
  bandPct: 0.02,
  /** Distinct leave-and-return touches required to keep a zone. */
  minTouches: 2,
  /** Minimum bars between first and last pivot in a seed cluster. */
  minPivotSpan: 40,
  /** Minimum bars between a zone's first and last touch. */
  minBars: 40,
  /** No touch for this many bars → the zone's box ends at its last touch. */
  idleBars: 100,
  /**
   * Closes through to the other side of the band in a row required to
   * mark a zone broken (box ends there; the next touch starts a new one).
   */
  breakConfirmBars: 10,
  /** Keep only the strongest N zones (stops chart spaghetti). */
  maxLevels: 12,
};

/**
 * Fractal swing highs/lows with lookback N left/right.
 * @returns {{ index: number, time: string, price: number, kind: 'support'|'resistance' }[]}
 */
export function findSwingPivots(bars, swingN = SR_DEFAULTS.swingN) {
  const n = Math.max(1, Math.floor(swingN) || 1);
  if (!bars?.length || bars.length < n * 2 + 1) return [];

  const pivots = [];
  for (let i = n; i < bars.length - n; i++) {
    const hi = bars[i].high;
    const lo = bars[i].low;
    let isHigh = Number.isFinite(hi);
    let isLow = Number.isFinite(lo);
    for (let j = i - n; j <= i + n; j++) {
      if (j === i) continue;
      if (isHigh && !(hi > bars[j].high)) isHigh = false;
      if (isLow && !(lo < bars[j].low)) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) {
      pivots.push({
        index: i,
        time: bars[i].date,
        price: hi,
        kind: "resistance",
      });
    }
    if (isLow) {
      pivots.push({
        index: i,
        time: bars[i].date,
        price: lo,
        kind: "support",
      });
    }
  }
  return pivots;
}

function atrByBarIndex(bars, atrPeriod) {
  const series = computeAtrSeries(bars, atrPeriod);
  const byTime = new Map(series.map((p) => [p.time, p.value]));
  return bars.map((b) => {
    const v = byTime.get(b.date);
    return Number.isFinite(v) && v > 0 ? v : null;
  });
}

function toleranceAt(atrs, i, atrMult, fallbackPrice) {
  const atr = atrs[i];
  if (Number.isFinite(atr) && atr > 0) return atr * atrMult;
  const p = fallbackPrice;
  return Number.isFinite(p) && p > 0 ? p * 0.005 : 0;
}

/** Merge width capped at mergePct of price (no fat ATR blow-ups). */
function mergeTolerance(_atrs, _i, _atrMult, price, mergePct) {
  return Number.isFinite(price) && price > 0 ? price * mergePct : 0;
}

/**
 * Touch / break band — bandPct of price, with ATR as a floor.
 */
function bandTolerance(atrs, i, atrMult, price, bandPct) {
  const atrTol = toleranceAt(atrs, i, atrMult, price);
  const pctTol = Number.isFinite(price) && price > 0 ? price * bandPct : 0;
  return Math.max(atrTol, pctTol);
}

function wickInBand(bar, price, tol) {
  if (!Number.isFinite(bar?.high) || !Number.isFinite(bar?.low)) return false;
  return bar.low <= price + tol && bar.high >= price - tol;
}

function clusterPivots(pivots, atrs, atrMult, mergePct) {
  const sorted = [...pivots].sort(
    (a, b) => a.price - b.price || a.index - b.index
  );
  /** @type {{ prices: number[], kinds: string[], indices: number[], mid: number }[]} */
  let clusters = [];

  for (const p of sorted) {
    let placed = false;
    for (const c of clusters) {
      const midGuess = (p.price + c.mid) / 2;
      const iRef = Math.max(p.index, ...c.indices);
      const tol = mergeTolerance(atrs, iRef, atrMult, midGuess, mergePct);
      if (Math.abs(p.price - c.mid) <= tol) {
        c.prices.push(p.price);
        c.kinds.push(p.kind);
        c.indices.push(p.index);
        c.mid = median(c.prices);
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({
        prices: [p.price],
        kinds: [p.kind],
        indices: [p.index],
        mid: p.price,
      });
    }
  }

  let merged = true;
  while (merged) {
    merged = false;
    clusters.sort((a, b) => a.mid - b.mid);
    const next = [];
    for (const c of clusters) {
      const prev = next[next.length - 1];
      if (!prev) {
        next.push(c);
        continue;
      }
      const iRef = Math.max(...prev.indices, ...c.indices);
      const mid = (prev.mid + c.mid) / 2;
      const tol = mergeTolerance(atrs, iRef, atrMult, mid, mergePct);
      if (Math.abs(prev.mid - c.mid) <= tol) {
        prev.prices.push(...c.prices);
        prev.kinds.push(...c.kinds);
        prev.indices.push(...c.indices);
        prev.mid = median(prev.prices);
        merged = true;
      } else {
        next.push(c);
      }
    }
    clusters = next;
  }

  return clusters;
}

function median(values) {
  if (!values?.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * @returns {{
 *   price: number,
 *   kind: 'support'|'resistance',
 *   touches: number,
 *   startIndex: number,
 *   endIndex: number,
 *   startTime: string,
 *   endTime: string,
 *   score: number,
 * }[]}
 */
export function computeSupportResistance(bars, options = {}) {
  const swingN = options.swingN ?? SR_DEFAULTS.swingN;
  const atrPeriod = options.atrPeriod ?? SR_DEFAULTS.atrPeriod;
  const atrMult = options.atrMult ?? SR_DEFAULTS.atrMult;
  const mergePct = options.mergePct ?? SR_DEFAULTS.mergePct;
  const bandPct = options.bandPct ?? SR_DEFAULTS.bandPct;
  const minTouches = options.minTouches ?? SR_DEFAULTS.minTouches;
  const minPivotSpan = options.minPivotSpan ?? SR_DEFAULTS.minPivotSpan;
  const minBars = options.minBars ?? SR_DEFAULTS.minBars;
  const idleBars = Math.max(1, options.idleBars ?? SR_DEFAULTS.idleBars);
  const breakConfirmBars = Math.max(
    1,
    options.breakConfirmBars ?? SR_DEFAULTS.breakConfirmBars
  );
  const maxLevels = options.maxLevels ?? SR_DEFAULTS.maxLevels;

  if (!bars?.length) return [];

  const pivots = findSwingPivots(bars, swingN);
  if (!pivots.length) return [];

  const atrs = atrByBarIndex(bars, atrPeriod);
  const clusters = clusterPivots(pivots, atrs, atrMult, mergePct);
  const last = bars.length - 1;
  const levels = [];
  let runId = 0;

  for (const c of clusters) {
    if (c.indices.length < 2) continue;
    const pivotLo = Math.min(...c.indices);
    const pivotHi = Math.max(...c.indices);
    if (pivotHi - pivotLo < minPivotSpan) continue;

    const price = c.mid;
    const pivotKindByIndex = new Map();
    for (let k = 0; k < c.indices.length; k++) {
      pivotKindByIndex.set(c.indices[k], c.kinds[k]);
    }

    // Side price is on when a segment starts — decides which direction
    // counts as a break. A swing high here means price came up into the
    // level; otherwise the prior close tells us the side.
    const roleAt = (i) => {
      const pk = pivotKindByIndex.get(i);
      if (pk) return pk;
      const prev = i > 0 ? bars[i - 1].close : NaN;
      if (Number.isFinite(prev) && prev !== price) {
        return prev > price ? "support" : "resistance";
      }
      return bars[i].close >= price ? "support" : "resistance";
    };

    // Phase 1: find runs. A run is every touch at this level while its
    // role hasn't been invalidated — the *only* thing that ends a run is
    // a confirmed break through to the other side. Idle time alone does
    // not: a level that goes untested for months and then gets retested
    // is still the same level, not a new one.
    let inside = false;
    let curKind = null;
    let curTouches = [];
    let breakStreak = 0;
    const runs = [];

    const endRun = () => {
      if (curTouches.length) runs.push({ kind: curKind, touches: curTouches });
      curKind = null;
      curTouches = [];
      breakStreak = 0;
    };

    for (let i = pivotLo; i <= last; i++) {
      const tol = bandTolerance(atrs, i, atrMult, price, bandPct);
      const bar = bars[i];
      const inBand = wickInBand(bar, price, tol);

      if (inBand) {
        if (!inside) {
          if (curKind === null) curKind = roleAt(i);
          curTouches.push(i);
        }
        inside = true;
        breakStreak = 0;
        continue;
      }

      inside = false;
      if (curKind === null) continue;

      const close = bar.close;
      if (!Number.isFinite(close)) continue;
      const broken =
        curKind === "support" ? close < price - tol : close > price + tol;
      if (!broken) {
        breakStreak = 0;
        continue;
      }
      breakStreak += 1;
      if (breakStreak >= breakConfirmBars) endRun();
    }
    endRun();

    // Phase 2: a run counts as a real level only if its touches, taken
    // together across the whole run, clear minTouches/minBars — a brief
    // retest shouldn't need to qualify on its own just because a long
    // idle gap came before it. Once a run qualifies, split it into boxes
    // at idleBars gaps purely for drawing (so a box doesn't stretch across
    // months nothing happened). Each box is colored by its *own* majority
    // side, not the run's — a run can still be one qualifying level even
    // if one piece of it, taken alone, leaned the other way.
    const majoritySide = (from, to, fallback) => {
      let above = 0;
      let below = 0;
      for (let i = from; i <= to; i++) {
        const cl = bars[i].close;
        if (cl > price) above += 1;
        else if (cl < price) below += 1;
      }
      if (above === below) return fallback;
      return above > below ? "support" : "resistance";
    };

    for (const run of runs) {
      const touches = run.touches;
      const firstTouch = touches[0];
      const lastTouch = touches[touches.length - 1];
      if (touches.length < minTouches) continue;
      if (lastTouch - firstTouch < minBars) continue;

      const score = touches.length * Math.log10(lastTouch - firstTouch + 10);
      const thisRun = runId++;

      let pieceStart = 0;
      for (let k = 1; k <= touches.length; k++) {
        const isLast = k === touches.length;
        if (!isLast && touches[k] - touches[k - 1] < idleBars) continue;
        const startIndex = touches[pieceStart];
        const endIndex = touches[k - 1];
        levels.push({
          price,
          kind: majoritySide(startIndex, endIndex, run.kind),
          touches: k - pieceStart,
          startIndex,
          endIndex,
          startTime: bars[startIndex].date,
          endTime: bars[endIndex].date,
          score,
          _run: thisRun,
        });
        pieceStart = k;
      }
    }
  }

  // maxLevels caps distinct levels (runs), not drawn pieces — once a level
  // earns a spot every real touch-cluster of it is shown, not just the
  // single piece with the most touches.
  const keptRuns = new Set(
    [...new Set(levels.map((lv) => lv._run))]
      .sort((a, b) => {
        const sa = levels.find((lv) => lv._run === a).score;
        const sb = levels.find((lv) => lv._run === b).score;
        return sb - sa;
      })
      .slice(0, Math.max(1, maxLevels))
  );

  return levels
    .filter((lv) => keptRuns.has(lv._run))
    .map(({ _run, ...lv }) => lv)
    .sort((a, b) => a.price - b.price || a.startIndex - b.startIndex);
}
