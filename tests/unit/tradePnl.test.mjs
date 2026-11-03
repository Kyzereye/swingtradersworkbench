import { test } from "node:test";
import assert from "node:assert/strict";

import { runningTotalWithMtm, runningTotalPctWithMtm } from "../../frontend/src/util/tradePnl.js";

// One finished entry/exit pair (10 → 12) and one active entry at 20.
const SIGNALS = [
  { entryDate: "2024-01-02", entryPrice: 10, exitDate: "2024-02-01", exitPrice: 12 },
  { entryDate: "2024-04-01", entryPrice: 20, open: true },
];

test("$ total adds finished pairs and marks the active entry to the last close", () => {
  // (12 - 10) + (25 - 20) = 7
  assert.equal(runningTotalWithMtm(SIGNALS, 25), 7);
});

test("% total adds each pair's percent change", () => {
  // (12 / 10 - 1) * 100 + (25 / 20 - 1) * 100 = 20 + 25
  assert.ok(Math.abs(runningTotalPctWithMtm(SIGNALS, 25) - 45) < 1e-9);
});

test("the window start drops pairs that exited before it, but keeps the active entry", () => {
  assert.equal(runningTotalWithMtm(SIGNALS, 25, "2024-03-01"), 5);
  assert.ok(Math.abs(runningTotalPctWithMtm(SIGNALS, 25, "2024-03-01") - 25) < 1e-9);
});

test("a pair that exits on the window start day still counts", () => {
  assert.equal(runningTotalWithMtm(SIGNALS, 25, "2024-02-01"), 7);
});

test("no signals, or only an active entry with no mark price, gives null", () => {
  assert.equal(runningTotalWithMtm([], 25), null);
  assert.equal(runningTotalPctWithMtm([], 25), null);
  assert.equal(runningTotalWithMtm([SIGNALS[1]], null), null);
  assert.equal(runningTotalPctWithMtm([SIGNALS[1]], null), null);
});
