/**
 * Scan row and optimizer contracts (see CLAUDE.md, "Per-system file set" and "Scan row fields").
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { scanSymbol } from "../../frontend/src/scanSymbol.js";
import { scanMaCrossover } from "../../frontend/src/scanMaCrossover.js";
import { scanTripleMa } from "../../frontend/src/scanTripleMa.js";
import { scanMacd } from "../../frontend/src/scanMacd.js";
import { scanRsi } from "../../frontend/src/scanRsi.js";
import { scanDonchian } from "../../frontend/src/scanDonchian.js";
import { scanKeltner } from "../../frontend/src/scanKeltner.js";
import { scanBollinger } from "../../frontend/src/scanBollinger.js";
import { scanDarvas } from "../../frontend/src/scanDarvas.js";
import { scanFibonacci } from "../../frontend/src/scanFibonacci.js";
import { scanPointFigure } from "../../frontend/src/scanPointFigure.js";
import { optimizeMaCrossover } from "../../frontend/src/optimizeMaCrossover.js";
import { optimizeTripleMa } from "../../frontend/src/optimizeTripleMa.js";
import { optimizeMacd } from "../../frontend/src/optimizeMacd.js";
import { optimizeRsi } from "../../frontend/src/optimizeRsi.js";
import { optimizeDonchian } from "../../frontend/src/optimizeDonchian.js";
import { optimizeKeltner } from "../../frontend/src/optimizeKeltner.js";
import { optimizeBollinger } from "../../frontend/src/optimizeBollinger.js";
import { optimizeDarvas } from "../../frontend/src/optimizeDarvas.js";
import { optimizeFibonacci } from "../../frontend/src/optimizeFibonacci.js";
import { optimizePointFigure } from "../../frontend/src/optimizePointFigure.js";
import { loadFixtureBars } from "./helpers.mjs";

const CATALOG_SCANS = {
  "ma-crossover": scanMaCrossover,
  "triple-ma": scanTripleMa,
  macd: scanMacd,
  rsi: scanRsi,
  donchian: scanDonchian,
  keltner: scanKeltner,
  bollinger: scanBollinger,
  darvas: scanDarvas,
  fibonacci: scanFibonacci,
  "point-figure": scanPointFigure,
};

const CATALOG_OPTIMIZERS = {
  "ma-crossover": optimizeMaCrossover,
  "triple-ma": optimizeTripleMa,
  macd: optimizeMacd,
  rsi: optimizeRsi,
  donchian: optimizeDonchian,
  keltner: optimizeKeltner,
  bollinger: optimizeBollinger,
  darvas: optimizeDarvas,
  fibonacci: optimizeFibonacci,
  "point-figure": optimizePointFigure,
};

const LAST_SIGNALS = ["entry", "exit", "open", "none"];
const CATALOG_ROW_FIELDS = [
  "asOfDate",
  "optUsedDefault",
  "runningTotal",
  "runningTotalPct",
  "tradeCount",
  "lastSignal",
  "signalDate",
  "signalClose",
  "barCount",
];
// The legacy price-vs-MA scan predates tradeCount and signalClose.
const LEGACY_ROW_FIELDS = CATALOG_ROW_FIELDS.filter(
  (field) => field !== "tradeCount" && field !== "signalClose"
);

const aaplBars = loadFixtureBars("AAPL");
const shortBars = aaplBars.slice(0, 10);

function checkScanRow(row, bars, requiredFields) {
  for (const field of requiredFields) {
    assert.ok(field in row, `missing field ${field}`);
  }
  assert.equal(row.asOfDate, bars[bars.length - 1].date);
  assert.equal(row.barCount, bars.length);
  assert.equal(typeof row.optUsedDefault, "boolean");
  assert.ok(LAST_SIGNALS.includes(row.lastSignal), `lastSignal "${row.lastSignal}"`);
  if (row.lastSignal === "none") {
    assert.equal(row.signalDate, null);
  } else {
    assert.match(row.signalDate, /^\d{4}-\d{2}-\d{2}$/);
  }
}

for (const [systemId, scan] of Object.entries(CATALOG_SCANS)) {
  test(`scan row: ${systemId}`, () => {
    assert.equal(scan([]), null, "no bars gives no row");

    checkScanRow(scan(aaplBars), aaplBars, CATALOG_ROW_FIELDS);

    const shortRow = scan(shortBars);
    checkScanRow(shortRow, shortBars, CATALOG_ROW_FIELDS);
    assert.equal(shortRow.optUsedDefault, true, "too little data falls back to defaults");
    assert.equal(shortRow.lastSignal, "none");
    assert.equal(shortRow.tradeCount, 0);
  });
}

test("scan row: price-ma (legacy)", () => {
  assert.equal(scanSymbol([]), null);
  checkScanRow(scanSymbol(aaplBars), aaplBars, LEGACY_ROW_FIELDS);
  assert.equal(scanSymbol(shortBars).optUsedDefault, true);
});

for (const [systemId, optimize] of Object.entries(CATALOG_OPTIMIZERS)) {
  test(`optimizer: ${systemId} returns { best, usedDefault }`, () => {
    const result = optimize(shortBars);
    assert.deepEqual(Object.keys(result).sort(), ["best", "usedDefault"]);
    assert.equal(result.usedDefault, true, "too little data falls back to defaults");
    assert.deepEqual(result.best.trades, []);
    assert.equal(result.best.runningTotal, null);
  });
}
