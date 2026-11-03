/**
 * Golden tests: each system's scan on fixed fixture bars must match the saved output.
 * They guard refactors. If a system's rules change on purpose, regenerate with:
 *
 *   UPDATE_GOLDEN=1 npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const SYSTEMS = {
  "price-ma": scanSymbol,
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

const SYMBOLS = ["AAPL", "MSFT", "SPY"];
const DECIMALS = 6;

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const goldenDir = path.join(fixturesDir, "golden");
const updateGolden = process.env.UPDATE_GOLDEN === "1";

function loadBars(symbol) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, "bars", `${symbol}.json`), "utf8"));
}

// Round floats so harmless last-digit differences don't fail the test.
function roundNumbers(value) {
  if (typeof value === "number") return Number(value.toFixed(DECIMALS));
  if (Array.isArray(value)) return value.map(roundNumbers);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, roundNumbers(item)]));
  }
  return value;
}

const barsBySymbol = Object.fromEntries(SYMBOLS.map((symbol) => [symbol, loadBars(symbol)]));

for (const [systemId, scan] of Object.entries(SYSTEMS)) {
  test(`golden: ${systemId}`, () => {
    const actual = {};
    for (const symbol of SYMBOLS) {
      actual[symbol] = roundNumbers(scan(barsBySymbol[symbol]));
    }

    const goldenPath = path.join(goldenDir, `${systemId}.json`);
    if (updateGolden) {
      fs.mkdirSync(goldenDir, { recursive: true });
      fs.writeFileSync(goldenPath, JSON.stringify(actual, null, 2) + "\n");
      return;
    }

    assert.ok(fs.existsSync(goldenPath), `Missing ${goldenPath}. Run: UPDATE_GOLDEN=1 npm test`);
    const expected = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
    assert.deepEqual(actual, expected);
  });
}
