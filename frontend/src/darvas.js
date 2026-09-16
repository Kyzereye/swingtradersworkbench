/**
 * Darvas box (recipe A): after an N-day high, wait fixed boxBuild days,
 * then arm box (top = that high, bottom = lowest low during build days).
 */

function isNDayHigh(bars, i, highLookback) {
  if (i < highLookback) return false;
  const hi = bars[i].high;
  for (let j = i - highLookback; j < i; j++) {
    if (bars[j].high >= hi) return false;
  }
  return true;
}

/**
 * Discrete box episodes for chart rectangles.
 * Each item: { startTime, endTime, boxTop, boxLow }
 * Levels freeze when the box arms; box ends on breakout, floor fail, or last bar.
 */
export function computeDarvasBoxes(
  bars,
  highLookback = 55,
  boxBuild = 3
) {
  const nLook = Math.max(2, Math.floor(highLookback) || 55);
  const buildN = Math.max(1, Math.floor(boxBuild) || 3);
  if (!bars?.length) return [];

  const boxes = [];
  let phase = null; // null | 'building' | 'armed'
  let boxTop = null;
  let boxLow = null;
  let buildLeft = 0;
  let startI = null;

  function pushBox(endI) {
    if (
      startI == null ||
      boxTop == null ||
      !Number.isFinite(boxLow) ||
      endI < startI
    ) {
      return;
    }
    boxes.push({
      startTime: bars[startI].date,
      endTime: bars[endI].date,
      boxTop,
      boxLow,
    });
  }

  function clearBox() {
    phase = null;
    boxTop = null;
    boxLow = null;
    buildLeft = 0;
    startI = null;
  }

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

    if (phase === "building") {
      if (bar.high > boxTop) {
        boxTop = bar.high;
        boxLow = bar.low;
        buildLeft = buildN;
        startI = i;
      } else {
        if (!Number.isFinite(boxLow)) boxLow = bar.low;
        else boxLow = Math.min(boxLow, bar.low);
        buildLeft -= 1;
        if (buildLeft <= 0) phase = "armed";
      }
    } else if (phase === "armed") {
      const brokeUp = bar.close > boxTop;
      const brokeDown = Number.isFinite(boxLow) && bar.close < boxLow;
      if (brokeUp || brokeDown) {
        pushBox(i);
        clearBox();
      }
    }

    if (phase == null && isNDayHigh(bars, i, nLook)) {
      boxTop = bar.high;
      boxLow = Infinity;
      buildLeft = buildN;
      startI = i;
      phase = "building";
    }
  }

  if (phase === "armed" && Number.isFinite(boxLow)) {
    pushBox(bars.length - 1);
  }

  return boxes;
}
