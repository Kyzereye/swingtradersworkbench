/**
 * Darvas box breakout (recipe A + trail, long only).
 * After N-day high, wait boxBuild days → arm box.
 * Entry: close above box top → next open; stop = that box floor.
 * Optional MA filter: entry only if entire box is above MA (boxLow > MA).
 * Optional volume filter: breakout volume ≥ mult × SMA(volume, prior period).
 * While long: new armed boxes raise stop to new floor (never lower).
 * Exit: close below current trail floor → next open.
 */
import { computeMaSeries } from "./ma.js";

export function simulateDarvas(
  bars,
  highLookback = 55,
  boxBuild = 3,
  maFilter = false,
  maPeriod = 200,
  maType = "sma",
  volFilter = false,
  volPeriod = 50,
  volMult = 1.5
) {
  const nLook = Math.max(2, Math.floor(highLookback) || 55);
  const buildN = Math.max(1, Math.floor(boxBuild) || 3);
  const useMa = Boolean(maFilter);
  const maLen = Math.max(2, Math.floor(maPeriod) || 200);
  const maKind = maType === "ema" ? "ema" : "sma";
  const useVol = Boolean(volFilter);
  const volLen = Math.max(2, Math.floor(volPeriod) || 50);
  const volX = Number.isFinite(volMult) && volMult > 0 ? volMult : 1.5;

  const maByTime = useMa
    ? new Map(
        computeMaSeries(bars, maLen, maKind).map((p) => [p.time, p.value])
      )
    : null;

  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;
  let entryFloor = null;
  let trailFloor = null;

  let phase = null; // null | 'building' | 'armed'
  let boxTop = null;
  let boxLow = null;
  let buildLeft = 0;

  function clearBox() {
    phase = null;
    boxTop = null;
    boxLow = null;
    buildLeft = 0;
  }

  function raiseTrail() {
    if (
      inTrade &&
      Number.isFinite(boxLow) &&
      (trailFloor == null || boxLow > trailFloor)
    ) {
      trailFloor = boxLow;
    }
  }

  function isNDayHigh(i) {
    if (i < nLook) return false;
    const hi = bars[i].high;
    for (let j = i - nLook; j < i; j++) {
      if (bars[j].high >= hi) return false;
    }
    return true;
  }

  function boxAboveMa(bar) {
    if (!useMa) return true;
    const ma = maByTime.get(bar.date);
    if (!Number.isFinite(ma) || !Number.isFinite(boxLow)) return false;
    return boxLow > ma;
  }

  /** Breakout volume vs average of the prior volLen bars (excludes today). */
  function volumeOk(i) {
    if (!useVol) return true;
    if (i < volLen) return false;
    let sum = 0;
    for (let j = i - volLen; j < i; j++) {
      const v = bars[j].volume;
      if (!Number.isFinite(v)) return false;
      sum += v;
    }
    const avg = sum / volLen;
    const v = bars[i].volume;
    if (!Number.isFinite(v) || !(avg > 0)) return false;
    return v >= volX * avg;
  }

  function entryFiltersOk(i, bar) {
    return boxAboveMa(bar) && volumeOk(i);
  }

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

    if (pendingExit && inTrade && open) {
      open.exitDate = bar.date;
      open.exitPrice = bar.open;
      trades.push(open);
      inTrade = false;
      open = null;
      trailFloor = null;
      entryFloor = null;
      clearBox();
    }
    pendingExit = false;

    if (pendingEntry && !inTrade) {
      inTrade = true;
      open = { entryDate: bar.date, entryPrice: bar.open };
      trailFloor = entryFloor;
      entryFloor = null;
    }
    pendingEntry = false;

    // --- box state machine ---
    if (phase === "building") {
      if (bar.high > boxTop) {
        boxTop = bar.high;
        boxLow = bar.low;
        buildLeft = buildN;
      } else {
        if (!Number.isFinite(boxLow)) boxLow = bar.low;
        else boxLow = Math.min(boxLow, bar.low);
        buildLeft -= 1;
        if (buildLeft <= 0) {
          phase = "armed";
          raiseTrail();
        }
      }
    } else if (phase === "armed") {
      if (!inTrade) {
        if (Number.isFinite(boxLow) && bar.close < boxLow) {
          clearBox();
        }
      } else {
        if (
          (boxTop != null && bar.close > boxTop) ||
          (Number.isFinite(boxLow) && bar.close < boxLow)
        ) {
          clearBox();
        }
      }
    }

    if (phase == null && isNDayHigh(i)) {
      boxTop = bar.high;
      boxLow = Infinity;
      buildLeft = buildN;
      phase = "building";
    }

    const hasNextBar = i < bars.length - 1;

    if (
      !inTrade &&
      phase === "armed" &&
      boxTop != null &&
      bar.close > boxTop
    ) {
      if (entryFiltersOk(i, bar)) {
        markers.push({
          time: bar.date,
          position: "belowBar",
          shape: "arrowUp",
          color: "#6abf69",
          text: "Open",
          size: 2,
        });
        entryFloor = boxLow;
        if (hasNextBar) pendingEntry = true;
      }
      // Always end the box on upside break (chart does too). Rejected
      // MA/volume filters must not leave the box armed.
      clearBox();
    } else if (
      inTrade &&
      Number.isFinite(trailFloor) &&
      bar.close < trailFloor
    ) {
      markers.push({
        time: bar.date,
        position: "aboveBar",
        shape: "arrowDown",
        color: "#ef5350",
        text: "Close",
        size: 2,
      });
      if (hasNextBar) pendingExit = true;
    }
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}
