import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

/** Real daily bars saved by tests/tools/export-fixtures.mjs. */
export function loadFixtureBars(symbol) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, "bars", `${symbol}.json`), "utf8"));
}

/** Date string for day `index`, counting up from 2024-01-01. */
export function dayDate(index) {
  const date = new Date(Date.UTC(2024, 0, 1 + index));
  return date.toISOString().slice(0, 10);
}

/**
 * Bars from a list of closes. Open, high, and low all equal the close
 * unless `overrides[index]` sets them.
 */
export function barsFromCloses(closes, overrides = {}) {
  return closes.map((close, index) => ({
    date: dayDate(index),
    open: close,
    high: close,
    low: close,
    close,
    volume: 1000,
    ...overrides[index],
  }));
}

/** Values of a { time, value }[] series, rounded so float noise doesn't matter. */
export function seriesValues(series, decimals = 6) {
  return series.map((point) => Number(point.value.toFixed(decimals)));
}
