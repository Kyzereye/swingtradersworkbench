import { buildPointFigureColumns } from "./pointFigure.js";

/**
 * Point & Figure trend (long only).
 * Entry: Double Top breakout — a new X column's top exceeds the top of the
 * immediately preceding X column → fill next open.
 * Exit: Double Bottom breakdown — a new O column's bottom breaks below the
 * bottom of the immediately preceding O column → fill next open.
 */
export function simulatePointFigure(bars, boxPct = 1, reversalBoxes = 3) {
  const { columns } = buildPointFigureColumns(bars, boxPct, reversalBoxes);

  const entryByDate = new Map();
  const exitByDate = new Map();

  for (let i = 2; i < columns.length; i++) {
    const col = columns[i];
    const prev = columns[i - 2];
    if (col.direction !== prev.direction) continue;

    if (col.direction === "X") {
      if (col.topIndex > prev.topIndex) {
        const box = col.boxes.find((b) => b.levelIndex > prev.topIndex);
        if (box && !entryByDate.has(box.date)) {
          entryByDate.set(box.date, box.levelIndex);
        }
      }
    } else if (col.bottomIndex < prev.bottomIndex) {
      const box = col.boxes.find((b) => b.levelIndex < prev.bottomIndex);
      if (box && !exitByDate.has(box.date)) {
        exitByDate.set(box.date, box.levelIndex);
      }
    }
  }

  const trades = [];
  const markers = [];
  let inTrade = false;
  let open = null;
  let pendingEntry = false;
  let pendingExit = false;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

    if (pendingExit && inTrade && open) {
      open.exitDate = bar.date;
      open.exitPrice = bar.open;
      trades.push(open);
      inTrade = false;
      open = null;
    }
    pendingExit = false;

    if (pendingEntry && !inTrade) {
      inTrade = true;
      open = { entryDate: bar.date, entryPrice: bar.open };
    }
    pendingEntry = false;

    const hasNextBar = i < bars.length - 1;

    if (!inTrade && entryByDate.has(bar.date)) {
      markers.push({
        time: bar.date,
        position: "belowBar",
        shape: "arrowUp",
        color: "#6abf69",
        text: "Open",
        size: 2,
        levelIndex: entryByDate.get(bar.date),
      });
      if (hasNextBar) pendingEntry = true;
    } else if (inTrade && exitByDate.has(bar.date)) {
      markers.push({
        time: bar.date,
        position: "aboveBar",
        shape: "arrowDown",
        color: "#ef5350",
        text: "Close",
        size: 2,
        levelIndex: exitByDate.get(bar.date),
      });
      if (hasNextBar) pendingExit = true;
    }
  }

  if (inTrade && open) {
    trades.push({ ...open, open: true });
  }

  return { trades, markers };
}
