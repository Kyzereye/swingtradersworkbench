import { simulateDarvas } from "./darvasSignals.js";
import { runningTotalWithMtm } from "./util/tradePnl.js";

function range(lo, hi, step) {
  const out = [];
  for (let n = lo; n <= hi; n += step) out.push(n);
  return out;
}

const HIGH_LOOKBACKS = range(15, 100, 5);
const BOX_BUILDS = range(2, 8, 1);
const MA_PERIODS = range(20, 200, 10);
const MA_TYPES = ["sma", "ema"];

const DEFAULT = {
  highLookback: 55,
  boxBuild: 3,
  maFilter: false,
  maPeriod: 200,
  maType: "sma",
};

export const SCORE_BARS = 504;

export function scoreWindowStart(bars) {
  if (!bars?.length) return null;
  if (bars.length <= SCORE_BARS) return bars[0].date;
  return bars[bars.length - SCORE_BARS].date;
}

/** Grid candidates: MA off, plus on × periods × types. */
function maCandidates() {
  const out = [
    { maFilter: false, maPeriod: DEFAULT.maPeriod, maType: DEFAULT.maType },
  ];
  for (const maPeriod of MA_PERIODS) {
    for (const maType of MA_TYPES) {
      out.push({ maFilter: true, maPeriod, maType });
    }
  }
  return out;
}

/**
 * Grid-search Darvas lookback / boxBuild / MA filter over full history.
 * Lookback 15–100 step 5; boxBuild 2–8; MA off or 20–200 step 10 × SMA/EMA.
 * Defaults 55 / 3 / off.
 */
export function optimizeDarvas(bars) {
  if (!bars?.length) {
    return {
      best: { ...DEFAULT, runningTotal: null, trades: null },
      usedDefault: true,
    };
  }

  const markPrice = bars[bars.length - 1].close;
  let best = null;
  const maOpts = maCandidates();

  for (const highLookback of HIGH_LOOKBACKS) {
    for (const boxBuild of BOX_BUILDS) {
      for (const { maFilter, maPeriod, maType } of maOpts) {
        const { trades } = simulateDarvas(
          bars,
          highLookback,
          boxBuild,
          maFilter,
          maPeriod,
          maType
        );
        const runningTotal = runningTotalWithMtm(trades, markPrice);
        if (runningTotal == null) continue;
        if (!best || runningTotal > best.runningTotal) {
          best = {
            highLookback,
            boxBuild,
            maFilter,
            maPeriod,
            maType,
            runningTotal,
            trades,
          };
        }
      }
    }
  }

  if (!best) {
    const { trades } = simulateDarvas(
      bars,
      DEFAULT.highLookback,
      DEFAULT.boxBuild,
      DEFAULT.maFilter,
      DEFAULT.maPeriod,
      DEFAULT.maType
    );
    return {
      best: {
        ...DEFAULT,
        runningTotal: runningTotalWithMtm(trades, markPrice),
        trades,
      },
      usedDefault: true,
    };
  }
  return { best, usedDefault: false };
}
