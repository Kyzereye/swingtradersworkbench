/**
 * Point & Figure box/column construction from daily OHLC bars.
 *
 * Box levels sit on one shared percentage grid (boxPct% steps, anchored at
 * the first bar's close) so every column's boxes line up on the same rows —
 * this is what a chart draws as the price scale. High/low method: a bar
 * first tries to extend the current column; only if it can't does it check
 * for a reversalBoxes-box reversal in the other direction.
 */

/** Ceiling on grid rows; only reachable with absurd data. Returns null past it. */
const MAX_LEVELS = 10000;

/** Ingested data occasionally carries a zero or bogus price; those bars would
 * otherwise drive the grid toward zero and never terminate. */
function isUsableBar(b) {
  return (
    Number.isFinite(b?.open) &&
    Number.isFinite(b?.high) &&
    Number.isFinite(b?.low) &&
    Number.isFinite(b?.close) &&
    b.open > 0 &&
    b.high > 0 &&
    b.low > 0 &&
    b.close > 0
  );
}

function buildLevelGrid(bars, pct) {
  const factor = 1 + pct / 100;
  const anchor = bars[0].close;
  let lo = bars[0].low;
  let hi = bars[0].high;
  for (const b of bars) {
    if (b.low < lo) lo = b.low;
    if (b.high > hi) hi = b.high;
  }

  const below = [];
  let lvl = anchor;
  while (lvl > lo) {
    if (below.length >= MAX_LEVELS) return null;
    lvl /= factor;
    below.push(lvl);
  }
  below.reverse();

  const above = [];
  lvl = anchor;
  while (lvl < hi) {
    if (below.length + above.length >= MAX_LEVELS) return null;
    lvl *= factor;
    above.push(lvl);
  }

  return {
    levels: [...below, anchor, ...above],
    anchorIndex: below.length,
  };
}

/**
 * Returns { columns, levels, boxPct, reversalBoxes }.
 * levels: price[] — the shared box grid, ascending, one row per index.
 * columns: {
 *   direction: "X"|"O",
 *   boxes: { levelIndex, level, barIndex, date }[],
 *   topIndex, bottomIndex, top, bottom, startDate, endDate,
 * }[]
 */
export function buildPointFigureColumns(bars, boxPct = 1, reversalBoxes = 3) {
  const pct = Number(boxPct);
  const revBoxes = Math.max(1, Math.floor(Number(reversalBoxes)) || 3);
  const empty = {
    columns: [],
    levels: [],
    boxPct: pct,
    reversalBoxes: revBoxes,
  };
  if (!bars?.length || !Number.isFinite(pct) || pct <= 0) return empty;

  const usable = bars.filter(isUsableBar);
  if (!usable.length) return empty;

  const grid = buildLevelGrid(usable, pct);
  if (!grid) return empty;
  const { levels, anchorIndex } = grid;

  const columns = [];
  let direction = null; // "X" | "O" | null (undetermined)
  let currentIndex = anchorIndex;
  let currentColumn = null;

  function startColumn(dir, idx, barIndex, date) {
    currentColumn = {
      direction: dir,
      boxes: [{ levelIndex: idx, level: levels[idx], barIndex, date }],
      topIndex: idx,
      bottomIndex: idx,
      startDate: date,
      endDate: date,
    };
    columns.push(currentColumn);
    currentIndex = idx;
    direction = dir;
  }

  function addBox(idx, barIndex, date) {
    currentColumn.boxes.push({ levelIndex: idx, level: levels[idx], barIndex, date });
    currentColumn.topIndex = Math.max(currentColumn.topIndex, idx);
    currentColumn.bottomIndex = Math.min(currentColumn.bottomIndex, idx);
    currentColumn.endDate = date;
    currentIndex = idx;
  }

  for (let i = 1; i < usable.length; i++) {
    const bar = usable[i];

    if (direction == null) {
      let up = currentIndex;
      while (up + 1 < levels.length && bar.high >= levels[up + 1]) up++;
      let down = currentIndex;
      while (down - 1 >= 0 && bar.low <= levels[down - 1]) down--;
      const stepsUp = up - currentIndex;
      const stepsDown = currentIndex - down;
      if (stepsUp === 0 && stepsDown === 0) continue;

      if (stepsUp > 0) {
        startColumn("X", currentIndex, 0, usable[0].date);
        for (let idx = currentIndex + 1; idx <= up; idx++) addBox(idx, i, bar.date);
      } else {
        startColumn("O", currentIndex, 0, usable[0].date);
        for (let idx = currentIndex - 1; idx >= down; idx--) addBox(idx, i, bar.date);
      }
      continue;
    }

    if (direction === "X") {
      let up = currentIndex;
      while (up + 1 < levels.length && bar.high >= levels[up + 1]) up++;
      if (up > currentIndex) {
        for (let idx = currentIndex + 1; idx <= up; idx++) addBox(idx, i, bar.date);
        continue;
      }

      const reversalIndex = currentIndex - revBoxes;
      if (reversalIndex >= 0 && bar.low <= levels[reversalIndex]) {
        const newIndex = currentIndex - 1;
        startColumn("O", newIndex, i, bar.date);
        let down = newIndex;
        while (down - 1 >= 0 && bar.low <= levels[down - 1]) down--;
        for (let idx = newIndex - 1; idx >= down; idx--) addBox(idx, i, bar.date);
      }
    } else {
      let down = currentIndex;
      while (down - 1 >= 0 && bar.low <= levels[down - 1]) down--;
      if (down < currentIndex) {
        for (let idx = currentIndex - 1; idx >= down; idx--) addBox(idx, i, bar.date);
        continue;
      }

      const reversalIndex = currentIndex + revBoxes;
      if (reversalIndex < levels.length && bar.high >= levels[reversalIndex]) {
        const newIndex = currentIndex + 1;
        startColumn("X", newIndex, i, bar.date);
        let up = newIndex;
        while (up + 1 < levels.length && bar.high >= levels[up + 1]) up++;
        for (let idx = newIndex + 1; idx <= up; idx++) addBox(idx, i, bar.date);
      }
    }
  }

  for (const col of columns) {
    col.top = levels[col.topIndex];
    col.bottom = levels[col.bottomIndex];
  }

  return { columns, levels, boxPct: pct, reversalBoxes: revBoxes };
}
