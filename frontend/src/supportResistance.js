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
  mergePct: 0.035,
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
  /**
   * Closes through to the other side of the band in a row required to
   * mark a zone broken (box ends there; the next touch starts a new one).
   */
  breakConfirmBars: 10,
  /**
   * A level going untouched this long ends the piece being drawn. Not a
   * judgement that the level died — it may well be retested later, and that
   * retest draws its own piece. It stops one box being stretched from a
   * cluster of real activity all the way out to an isolated revisit months
   * later, which is the shape of every "this line should stop at X" report.
   * Calibrated against the windows those reports asked for: the gaps inside
   * wanted pieces ran to 112 bars, the ones that had to be cut started at
   * 139.
   */
  idleBars: 120,
  /** Keep only the strongest N zones (stops chart spaghetti). */
  maxLevels: 15,
  /**
   * Keep only the strongest N drawn pieces. A zone legitimately acts as
   * support in one era and resistance in another, so one zone can produce
   * several pieces — measured across 50 symbols that averaged 4.4 pieces per
   * zone and 48 lines per chart, which reads as spaghetti however defensible
   * each line is. Ranking pieces and keeping the best adapts per symbol
   * instead of applying a blunt touch threshold that would delete real
   * levels on quiet charts.
   */
  maxPieces: 12,
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
  const breakConfirmBars = Math.max(
    1,
    options.breakConfirmBars ?? SR_DEFAULTS.breakConfirmBars
  );
  const idleBars = Math.max(1, options.idleBars ?? SR_DEFAULTS.idleBars);
  const maxLevels = options.maxLevels ?? SR_DEFAULTS.maxLevels;
  const maxPieces = options.maxPieces ?? SR_DEFAULTS.maxPieces;

  if (!bars?.length) return [];

  const pivots = findSwingPivots(bars, swingN);
  if (!pivots.length) return [];

  const atrs = atrByBarIndex(bars, atrPeriod);
  const clusters = clusterPivots(pivots, atrs, atrMult, mergePct);
  const last = bars.length - 1;
  const levels = [];
  let runId = 0;

  // Which side the closes between two points mostly sat on — a real trend,
  // not one bar's wobble. Ties (or a near-even split) keep the fallback side
  // rather than flip on ambiguous evidence.
  const sideBetween = (from, to, atPrice, fallback) => {
    let above = 0;
    let below = 0;
    for (let i = from; i <= to; i++) {
      const cl = bars[i].close;
      if (cl > atPrice) above += 1;
      else if (cl < atPrice) below += 1;
    }
    if (above === below) return fallback;
    return above > below ? "support" : "resistance";
  };

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

    // A cluster can span pivots that drifted a few percent over its life
    // (2025's actual touches aren't at the exact price 2024's were). Band/
    // break decisions still use the cluster's mid so a slow drift still
    // reads as "the same level", but each drawn piece shows the price its
    // own pivots actually touched, not a stale blend from a different era.
    const localPrice = (from, to) => {
      const local = [];
      for (let k = 0; k < c.indices.length; k++) {
        if (c.indices[k] >= from && c.indices[k] <= to) local.push(c.prices[k]);
      }
      return local.length ? median(local) : price;
    };

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
    //
    // A touch spans from the bar price entered the band to the last bar it
    // was still in it. Price often arrives and then sits at a level for
    // days or weeks before resolving, and all of that is the level being
    // tested — recording only the arrival bar would end a level's box on
    // the day price got there rather than the day it finally left.
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
          curTouches.push({ entry: i, exit: i });
        } else if (curTouches.length) {
          curTouches[curTouches.length - 1].exit = i;
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

    // A *cluster* (this price) counts as a real level only if its touches,
    // taken together across every run, clear minTouches/minBars — not each
    // run in isolation. A confirmed break legitimately ends a run (price
    // left and came back from the other side), but that shouldn't zero out
    // the level's track record: a level tested, broken, and later retested
    // is still the same level, worth showing every time it was touched, not
    // just the one run that happens to have enough touches on its own.
    if (!runs.length) continue;
    const totalTouches = runs.reduce((n, r) => n + r.touches.length, 0);
    const lastRunTouches = runs[runs.length - 1].touches;
    const firstTouch = runs[0].touches[0].entry;
    const lastTouch = lastRunTouches[lastRunTouches.length - 1].exit;
    if (totalTouches < minTouches) continue;
    if (lastTouch - firstTouch < minBars) continue;

    const score = totalTouches * Math.log10(lastTouch - firstTouch + 10);
    const thisRun = runId++;

    // Once a cluster qualifies, every run draws — including a run with just
    // one touch. Split into pieces wherever the level's own role actually
    // flips (support to resistance or back), not on idle time alone: a
    // level untested for months and then retested from the *same* side is
    // still one piece, however long the quiet stretch; retested from the
    // *other* side is a real boundary, drawn as its own piece from that
    // touch on.
    for (const run of runs) {
      const touches = run.touches;

      // Pass 1: which side the trend of closes leading into each touch was
      // on — a real short stretch of days, not one bar's wobble. For a
      // touch after the first, that's the stretch from where price last
      // left the level to where it came back.
      const rawKind = touches.map((t, k) =>
        k === 0
          ? roleAt(t.entry)
          : sideBetween(touches[k - 1].exit, t.entry, price, roleAt(t.entry))
      );

      // Pass 2: a single touch reading the opposite of *both* neighbors is
      // a wobble that got reverted right back, not a real flip — smoothed
      // to match them. A touch at the very end of the run has no "next" to
      // revert it, so a lone flip there stands: that's the genuine
      // single-touch retest from the other side.
      const kind = [...rawKind];
      for (let k = 1; k < kind.length - 1; k++) {
        if (kind[k] !== kind[k - 1] && kind[k - 1] === kind[k + 1]) {
          kind[k] = kind[k - 1];
        }
      }

      // Pass 3: group consecutive touches sharing the same (smoothed) kind
      // into one drawn piece each.
      let segStart = 0;
      for (let k = 1; k <= touches.length; k++) {
        const isLast = k === touches.length;
        if (!isLast) {
          const flipped = kind[k] !== kind[segStart];
          const wentQuiet = touches[k].entry - touches[k - 1].exit >= idleBars;
          if (!flipped && !wentQuiet) continue;
        }
        const startIndex = touches[segStart].entry;
        const endIndex = touches[k - 1].exit;
        const piecePrice = localPrice(startIndex, endIndex);
        levels.push({
          price: piecePrice,
          kind: kind[segStart],
          touches: k - segStart,
          startIndex,
          endIndex,
          startTime: bars[startIndex].date,
          endTime: bars[endIndex].date,
          score,
          _run: thisRun,
        });
        segStart = k;
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

  const kept = levels.filter((lv) => keptRuns.has(lv._run));

  // A level's pieces are already split at every real flip, but a confirmed
  // break still leaves a gap between the run that broke and the next run
  // that retested it — even when both runs land on the same side. Stretch
  // each piece forward to meet the next piece of its own level when they
  // agree on side, so a level tested, broken, and retested from the same
  // side reads as one continuous line across the quiet break instead of two
  // disconnected fragments. A piece followed by the *opposite* side is a
  // real boundary, not a gap, so it's left alone — and neither is a stretch
  // longer than idleBars, which would undo the split that just separated a
  // level's real activity from a much later isolated revisit.
  const byRun = new Map();
  for (const lv of kept) {
    if (!byRun.has(lv._run)) byRun.set(lv._run, []);
    byRun.get(lv._run).push(lv);
  }
  for (const pieces of byRun.values()) {
    pieces.sort((a, b) => a.startIndex - b.startIndex);
    for (let i = 0; i < pieces.length - 1; i++) {
      if (pieces[i].kind !== pieces[i + 1].kind) continue;
      if (pieces[i + 1].startIndex - pieces[i].endIndex >= idleBars) continue;
      pieces[i].endIndex = pieces[i + 1].startIndex;
      pieces[i].endTime = pieces[i + 1].startTime;
      // The stretch just added was picked precisely because it agreed with
      // this piece's side, but re-grounding the price/kind in the fuller
      // range (touches *and* the quiet break) keeps both honest now that
      // the box is longer than just its own touches.
      pieces[i].kind = sideBetween(
        pieces[i].startIndex,
        pieces[i].endIndex,
        pieces[i].price,
        pieces[i].kind
      );
    }
  }

  // Rank the drawn pieces the same way zones are ranked — touches weighted
  // by how long the piece held — and keep the strongest. Applied after
  // bridging so a piece is judged on the span it actually draws.
  const pieceStrength = (lv) =>
    lv.touches * Math.log10(lv.endIndex - lv.startIndex + 10);
  const strongest =
    kept.length > maxPieces
      ? [...kept]
          .sort((a, b) => pieceStrength(b) - pieceStrength(a))
          .slice(0, Math.max(1, maxPieces))
      : kept;

  return strongest
    .map(({ _run, ...lv }) => lv)
    .sort((a, b) => a.price - b.price || a.startIndex - b.startIndex);
}
