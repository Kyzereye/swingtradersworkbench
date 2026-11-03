import { test } from "node:test";
import assert from "node:assert/strict";

import { computeMaSeries } from "../../frontend/src/ma.js";
import { computeRsiSeries } from "../../frontend/src/rsi.js";
import { trueRange, computeAtrSeries } from "../../frontend/src/atr.js";
import { computeDonchianSeries } from "../../frontend/src/donchian.js";
import { computeBollingerSeries } from "../../frontend/src/bollinger.js";
import { computeKeltnerSeries } from "../../frontend/src/keltner.js";
import { computeMacdSeries } from "../../frontend/src/macd.js";
import { barsFromCloses, dayDate, seriesValues, loadFixtureBars } from "./helpers.mjs";

test("SMA averages the last N closes and starts on bar N", () => {
  const series = computeMaSeries(barsFromCloses([1, 2, 3, 4, 5]), 3, "sma");
  assert.deepEqual(seriesValues(series), [2, 3, 4]);
  assert.equal(series[0].time, dayDate(2));
});

test("EMA seeds with the SMA, then weights by 2 / (N + 1)", () => {
  // Period 3: seed = (2 + 4 + 6) / 3 = 4, k = 0.5, next = 8 * 0.5 + 4 * 0.5 = 6.
  const series = computeMaSeries(barsFromCloses([2, 4, 6, 8]), 3, "ema");
  assert.deepEqual(seriesValues(series), [4, 6]);
});

test("MA returns nothing when there are fewer bars than the period", () => {
  assert.deepEqual(computeMaSeries(barsFromCloses([1, 2]), 3, "sma"), []);
  assert.deepEqual(computeMaSeries(barsFromCloses([1, 2]), 3, "ema"), []);
});

test("RSI is 100 with only gains and 0 with only declines", () => {
  assert.deepEqual(seriesValues(computeRsiSeries(barsFromCloses([1, 2, 3]), 2)), [100]);
  assert.deepEqual(seriesValues(computeRsiSeries(barsFromCloses([3, 2, 1]), 2)), [0]);
});

test("RSI uses Wilder smoothing", () => {
  // Period 2. Changes +1, -1 give avg gain 0.5 and avg decline 0.5, so RSI 50.
  // Next change +2: avg gain (0.5 + 2) / 2 = 1.25, avg decline 0.5 / 2 = 0.25, RS 5, RSI 83.333333.
  const series = computeRsiSeries(barsFromCloses([10, 11, 10, 12]), 2);
  assert.deepEqual(seriesValues(series), [50, 83.333333]);
});

test("true range uses the prior close when it widens the range", () => {
  assert.equal(trueRange({ high: 10, low: 8 }, null), 2);
  assert.equal(trueRange({ high: 14, low: 10 }, 9), 5);
  assert.equal(trueRange({ high: 10, low: 8 }, 12), 4);
});

test("ATR averages the first N true ranges, then uses Wilder smoothing", () => {
  const bars = barsFromCloses([9, 10, 13], {
    0: { high: 10, low: 8 },
    1: { high: 11, low: 9 },
    2: { high: 14, low: 10 },
  });
  // True ranges 2, 2, 4. First ATR (2 + 2) / 2 = 2, next (2 * 1 + 4) / 2 = 3.
  assert.deepEqual(seriesValues(computeAtrSeries(bars, 2)), [2, 3]);
});

test("Donchian uses the prior N bars and excludes the current bar", () => {
  const bars = barsFromCloses([3, 4, 5, 6], {
    0: { high: 5, low: 1 },
    1: { high: 7, low: 2 },
    2: { high: 6, low: 3 },
    3: { high: 9, low: 4 },
  });
  const series = computeDonchianSeries(bars, 2);
  assert.deepEqual(
    series.map(({ upper, lower }) => ({ upper, lower })),
    [
      { upper: 7, lower: 1 },
      { upper: 7, lower: 2 },
    ]
  );
});

test("Bollinger bands are the SMA plus and minus a multiple of the population stdev", () => {
  // Closes 1, 2, 3: mean 2, population stdev sqrt(2 / 3).
  const [point] = computeBollingerSeries(barsFromCloses([1, 2, 3]), 3, 2);
  const width = 2 * Math.sqrt(2 / 3);
  assert.equal(point.mid, 2);
  assert.ok(Math.abs(point.upper - (2 + width)) < 1e-9);
  assert.ok(Math.abs(point.lower - (2 - width)) < 1e-9);
});

test("Keltner bands are the EMA plus and minus a multiple of ATR", () => {
  const bars = loadFixtureBars("AAPL");
  const keltner = computeKeltnerSeries(bars, 20, 10, 2);
  const atrByTime = new Map(computeAtrSeries(bars, 10).map((point) => [point.time, point.value]));
  const emaByTime = new Map(computeMaSeries(bars, 20, "ema").map((point) => [point.time, point.value]));

  assert.ok(keltner.length > 0);
  for (const point of keltner) {
    const atr = atrByTime.get(point.time);
    assert.ok(Math.abs(point.mid - emaByTime.get(point.time)) < 1e-9);
    assert.ok(Math.abs(point.upper - (point.mid + 2 * atr)) < 1e-9);
    assert.ok(Math.abs(point.lower - (point.mid - 2 * atr)) < 1e-9);
  }
});

test("MACD is fast EMA minus slow EMA, and the histogram is MACD minus signal", () => {
  const bars = loadFixtureBars("AAPL");
  const { macd, signal, histogram } = computeMacdSeries(bars, 12, 26, 9);
  const fastByTime = new Map(computeMaSeries(bars, 12, "ema").map((point) => [point.time, point.value]));
  const slowByTime = new Map(computeMaSeries(bars, 26, "ema").map((point) => [point.time, point.value]));
  const macdByTime = new Map(macd.map((point) => [point.time, point.value]));
  const signalByTime = new Map(signal.map((point) => [point.time, point.value]));

  assert.ok(histogram.length > 0);
  for (const point of macd) {
    const expected = fastByTime.get(point.time) - slowByTime.get(point.time);
    assert.ok(Math.abs(point.value - expected) < 1e-9);
  }
  for (const point of histogram) {
    const expected = macdByTime.get(point.time) - signalByTime.get(point.time);
    assert.ok(Math.abs(point.value - expected) < 1e-9);
  }
});
