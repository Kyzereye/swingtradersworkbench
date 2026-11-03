/**
 * Shared rules every system's simulate* must follow (see CLAUDE.md, "Trading conventions"):
 * long only, signal on one bar and fill at the next bar's open, marker text "Open" / "Close",
 * and at most one active entry, which is last.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { simulateTrades } from "../../frontend/src/tradeSignals.js";
import { simulateMaCrossover } from "../../frontend/src/maCrossoverSignals.js";
import { simulateTripleMa } from "../../frontend/src/tripleMaSignals.js";
import { simulateMacd } from "../../frontend/src/macdSignals.js";
import { simulateRsi } from "../../frontend/src/rsiSignals.js";
import { simulateDonchian } from "../../frontend/src/donchianSignals.js";
import { simulateKeltner } from "../../frontend/src/keltnerSignals.js";
import { simulateBollinger } from "../../frontend/src/bollingerSignals.js";
import { simulateDarvas } from "../../frontend/src/darvasSignals.js";
import { simulateFibonacci } from "../../frontend/src/fibonacciSignals.js";
import { simulatePointFigure } from "../../frontend/src/pointFigureSignals.js";
import { barsFromCloses, loadFixtureBars } from "./helpers.mjs";

// Each system run with its default parameters.
const SYSTEMS = {
  "price-ma": (bars) => simulateTrades(bars),
  "ma-crossover": (bars) => simulateMaCrossover(bars),
  "triple-ma": (bars) => simulateTripleMa(bars),
  macd: (bars) => simulateMacd(bars),
  rsi: (bars) => simulateRsi(bars),
  donchian: (bars) => simulateDonchian(bars),
  keltner: (bars) => simulateKeltner(bars),
  bollinger: (bars) => simulateBollinger(bars),
  darvas: (bars) => simulateDarvas(bars),
  fibonacci: (bars) => simulateFibonacci(bars),
  "point-figure": (bars) => simulatePointFigure(bars),
};

const SYMBOLS = ["AAPL", "MSFT", "SPY"];

function checkSignalRules(bars, { trades, markers }) {
  const indexByDate = new Map(bars.map((bar, index) => [bar.date, index]));
  const markerTextsByDate = new Map();
  for (const marker of markers) {
    assert.ok(marker.text === "Open" || marker.text === "Close", `marker text "${marker.text}"`);
    const texts = markerTextsByDate.get(marker.time) ?? [];
    texts.push(marker.text);
    markerTextsByDate.set(marker.time, texts);
  }

  function signalOnPriorBar(fillDate, text) {
    const fillIndex = indexByDate.get(fillDate);
    assert.ok(fillIndex > 0, `fill on ${fillDate} has no prior bar`);
    const priorDate = bars[fillIndex - 1].date;
    return (markerTextsByDate.get(priorDate) ?? []).includes(text);
  }

  let previousExitIndex = -1;
  trades.forEach((entry, position) => {
    const entryIndex = indexByDate.get(entry.entryDate);
    assert.ok(entryIndex != null, `entry date ${entry.entryDate} is not a bar`);
    assert.equal(entry.entryPrice, bars[entryIndex].open, "entry fills at that bar's open");
    assert.ok(signalOnPriorBar(entry.entryDate, "Open"), `"Open" marker on the bar before ${entry.entryDate}`);
    assert.ok(entryIndex > previousExitIndex, "entries do not overlap (long only, one at a time)");

    if (entry.open) {
      assert.equal(position, trades.length - 1, "only the last entry can be active");
      assert.equal(entry.exitDate, undefined);
      return;
    }

    const exitIndex = indexByDate.get(entry.exitDate);
    assert.ok(exitIndex > entryIndex, "exit comes after entry");
    assert.equal(entry.exitPrice, bars[exitIndex].open, "exit fills at that bar's open");
    assert.ok(signalOnPriorBar(entry.exitDate, "Close"), `"Close" marker on the bar before ${entry.exitDate}`);
    previousExitIndex = exitIndex;
  });
}

for (const [systemId, simulate] of Object.entries(SYSTEMS)) {
  test(`signal rules: ${systemId}`, () => {
    for (const symbol of SYMBOLS) {
      const bars = loadFixtureBars(symbol);
      const result = simulate(bars);
      assert.ok(Array.isArray(result.trades) && Array.isArray(result.markers));
      checkSignalRules(bars, result);
    }
  });
}

test("RSI: entry fills at the next open, and a signal on the last bar does not fill", () => {
  // Period 2. Declines hold RSI at 0, then +2 on bar 4 lifts it to 66.7 (up through 30).
  // Bar 5 is flat, so RSI eases to 66.7 and stays under 70 (no exit).
  const closes = [10, 9, 8, 7, 9, 9];
  const bars = barsFromCloses(closes, { 5: { open: 9.2 } });
  const { trades, markers } = simulateRsi(bars, 2, 30, 70);

  assert.deepEqual(markers.map((marker) => [marker.time, marker.text]), [[bars[4].date, "Open"]]);
  assert.equal(trades.length, 1);
  assert.equal(trades[0].entryDate, bars[5].date);
  assert.equal(trades[0].entryPrice, 9.2);
  assert.equal(trades[0].open, true);

  const lastBarSignal = simulateRsi(bars.slice(0, 5), 2, 30, 70);
  assert.equal(lastBarSignal.markers.length, 1, "the signal still shows on the chart");
  assert.equal(lastBarSignal.trades.length, 0, "but there is no next bar to fill on");
});

test("simulate functions handle empty and very short input", () => {
  for (const simulate of Object.values(SYSTEMS)) {
    assert.deepEqual(simulate([]).trades, []);
    assert.deepEqual(simulate(barsFromCloses([1, 2, 3])).trades, []);
  }
});
