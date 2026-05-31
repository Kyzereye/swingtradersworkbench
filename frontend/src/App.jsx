import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "./AppHeader.jsx";
import CandlestickChart from "./CandlestickChart.jsx";
import { MA_FAST_COLOR, MA_SLOW_COLOR, MR_BAND_COLOR, MR_ENTRY_COLOR, MR_EXIT_COLOR, MR_MA_COLOR, MR_UPPER_BAND_COLOR, MR_UPPER_ENTRY_COLOR, MR_UPPER_EXIT_COLOR } from "./chartColors.js";
import { formatPct, optimizeMa } from "./optimizeMa.js";
import { optimizeMr, optimizeUpperMr } from "./optimizeMr.js";
import {
  MR_LOWER_EXIT,
  MR_UPPER_EXIT,
  simulateMeanRevertTrades,
  simulateUpperMeanRevertTrades,
} from "./meanRevertSignals.js";
import ScannerPanel from "./ScannerPanel.jsx";
import SymbolAutocomplete from "./SymbolAutocomplete.jsx";
import TradingRules from "./TradingRules.jsx";
import TradesTable from "./TradesTable.jsx";
import { ENTRY_CONFIRM, simulateTrades } from "./tradeSignals.js";

const DEFAULT_SYMBOL = "AAPL";
const DEFAULT_MA = { fast: 21, slow: 50, maType: "ema" };
const DEFAULT_MR_BAND = { maPeriod: 21, deviationPct: 3 };

function parsePeriod(value, fallback) {
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.max(2, Math.min(200, Math.floor(n)));
}

function clampMaConfig(fast, slow, maType, fallback = DEFAULT_MA) {
  const f = parsePeriod(fast, fallback.fast);
  let s = parsePeriod(slow, fallback.slow);
  if (s <= f) s = f + 1;
  return { fast: f, slow: s, maType: maType === "sma" ? "sma" : "ema" };
}

function syncMaInputs(periods, setFastInput, setSlowInput) {
  setFastInput(String(periods.fast));
  setSlowInput(String(periods.slow));
}

function parseDeviation(value, fallback) {
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0.5, Math.min(20, Math.round(n * 10) / 10));
}

function clampMrBandConfig(maPeriod, deviationPct, fallback = DEFAULT_MR_BAND) {
  return {
    maPeriod: parsePeriod(maPeriod, fallback.maPeriod),
    deviationPct: parseDeviation(deviationPct, fallback.deviationPct),
  };
}

function syncMrBandInputs(config, setMaPeriodInput, setDeviationInput) {
  setMaPeriodInput(String(config.maPeriod));
  setDeviationInput(String(config.deviationPct));
}

function formatChartTimeframe(fromDate, toDate) {
  if (!fromDate || !toDate) return "";
  const from = new Date(`${fromDate}T12:00:00`);
  const to = new Date(`${toDate}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";

  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) {
    parts.push(`${years} year${years === 1 ? "" : "s"}`);
  }
  if (months > 0) {
    parts.push(`${months} month${months === 1 ? "" : "s"}`);
  }
  if (!parts.length) {
    const days = Math.max(
      1,
      Math.round((to.getTime() - from.getTime()) / 86_400_000)
    );
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  return parts.join(", ");
}

function formatChartMeta(payload, symbol) {
  if (!payload) return "";
  const timeframe = formatChartTimeframe(payload.fromDate, payload.toDate);
  const name = payload.companyName?.trim();
  if (name) {
    return timeframe ? `${name} - ${symbol} - ${timeframe}` : `${name} - ${symbol}`;
  }
  return timeframe ? `${symbol} - ${timeframe}` : symbol;
}

export default function App() {
  const [page, setPage] = useState("chart");
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [input, setInput] = useState(DEFAULT_SYMBOL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [maPeriods, setMaPeriods] = useState(DEFAULT_MA);
  const [fastInput, setFastInput] = useState(String(DEFAULT_MA.fast));
  const [slowInput, setSlowInput] = useState(String(DEFAULT_MA.slow));
  const [entryConfirm, setEntryConfirm] = useState(ENTRY_CONFIRM.SINGLE);
  const [maEnabled, setMaEnabled] = useState(true);
  const [mrEnabled, setMrEnabled] = useState(false);
  const [mrLowerEnabled, setMrLowerEnabled] = useState(true);
  const [mrUpperEnabled, setMrUpperEnabled] = useState(true);
  const [mrShowExitMarkers, setMrShowExitMarkers] = useState(true);
  const [mrMaType, setMrMaType] = useState("ema");
  const [mrLowerConfig, setMrLowerConfig] = useState(DEFAULT_MR_BAND);
  const [mrUpperConfig, setMrUpperConfig] = useState(DEFAULT_MR_BAND);
  const [mrLowerMaPeriodInput, setMrLowerMaPeriodInput] = useState(
    String(DEFAULT_MR_BAND.maPeriod)
  );
  const [mrLowerDeviationInput, setMrLowerDeviationInput] = useState(
    String(DEFAULT_MR_BAND.deviationPct)
  );
  const [mrUpperMaPeriodInput, setMrUpperMaPeriodInput] = useState(
    String(DEFAULT_MR_BAND.maPeriod)
  );
  const [mrUpperDeviationInput, setMrUpperDeviationInput] = useState(
    String(DEFAULT_MR_BAND.deviationPct)
  );

  const load = useCallback(async (sym) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ symbol: s });
      const res = await fetch(`/api/daily-stock-data?${q}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `Request failed (${res.status})`);
        setPayload(null);
        return;
      }
      setPayload(body);
      setSymbol(s);
    } catch (err) {
      setError(err?.message || String(err));
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(DEFAULT_SYMBOL);
  }, [load]);

  function onSubmit(e) {
    e.preventDefault();
    load(input);
  }

  function onSelectFromScanner(sym, optFast, optSlow) {
    setInput(sym);
    setMaEnabled(true);
    applyMaPeriods(
      clampMaConfig(optFast, optSlow, "ema", { fast: optFast, slow: optSlow, maType: "ema" })
    );
    load(sym);
  }

  function applyMaPeriods(next) {
    setMaPeriods(next);
    syncMaInputs(next, setFastInput, setSlowInput);
  }

  function applyMa(fast, slow) {
    applyMaPeriods(clampMaConfig(fast, slow, maPeriods.maType, maPeriods));
  }

  function updateMaType(maType) {
    applyMaPeriods(clampMaConfig(maPeriods.fast, maPeriods.slow, maType, maPeriods));
  }

  function commitMaInputs() {
    applyMaPeriods(clampMaConfig(fastInput, slowInput, maPeriods.maType, maPeriods));
  }

  function applyMrLowerConfig(next) {
    setMrLowerConfig(next);
    syncMrBandInputs(next, setMrLowerMaPeriodInput, setMrLowerDeviationInput);
  }

  function applyMrUpperConfig(next) {
    setMrUpperConfig(next);
    syncMrBandInputs(next, setMrUpperMaPeriodInput, setMrUpperDeviationInput);
  }

  function applyMrLower(maPeriod, deviationPct) {
    applyMrLowerConfig(clampMrBandConfig(maPeriod, deviationPct, mrLowerConfig));
  }

  function applyMrUpper(maPeriod, deviationPct) {
    applyMrUpperConfig(clampMrBandConfig(maPeriod, deviationPct, mrUpperConfig));
  }

  function commitMrLowerInputs() {
    applyMrLowerConfig(
      clampMrBandConfig(mrLowerMaPeriodInput, mrLowerDeviationInput, mrLowerConfig)
    );
  }

  function commitMrUpperInputs() {
    applyMrUpperConfig(
      clampMrBandConfig(mrUpperMaPeriodInput, mrUpperDeviationInput, mrUpperConfig)
    );
  }

  const series = payload?.data ?? [];
  const { fast, slow, maType } = maPeriods;

  const optimizeResult = useMemo(
    () => (series.length ? optimizeMa(series) : null),
    [series]
  );

  useEffect(() => {
    const top = optimizeResult?.top?.[0];
    if (top) {
      applyMaPeriods({ fast: top.fast, slow: top.slow, maType: "ema" });
    } else {
      applyMaPeriods(DEFAULT_MA);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when symbol/data changes
  }, [optimizeResult, symbol]);

  const optimizeMrResult = useMemo(
    () => (series.length ? optimizeMr(series) : null),
    [series]
  );

  const optimizeUpperMrResult = useMemo(
    () => (series.length ? optimizeUpperMr(series) : null),
    [series]
  );

  useEffect(() => {
    const top = optimizeMrResult?.top?.[0];
    if (top) {
      applyMrLowerConfig({
        maPeriod: top.maPeriod,
        deviationPct: top.deviationPct,
      });
    } else {
      applyMrLowerConfig(DEFAULT_MR_BAND);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when symbol/data changes
  }, [optimizeMrResult, symbol]);

  useEffect(() => {
    const top = optimizeUpperMrResult?.top?.[0];
    if (top) {
      applyMrUpperConfig({
        maPeriod: top.maPeriod,
        deviationPct: top.deviationPct,
      });
    } else {
      applyMrUpperConfig(DEFAULT_MR_BAND);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when symbol/data changes
  }, [optimizeUpperMrResult, symbol]);

  const { trades, markers } = useMemo(
    () =>
      series.length && maEnabled
        ? simulateTrades(series, fast, slow, maType, { entryConfirm })
        : { trades: [], markers: [] },
    [series, maEnabled, fast, slow, maType, entryConfirm]
  );

  const { maPeriod: mrLowerPeriod, deviationPct: mrLowerDeviationPct } = mrLowerConfig;
  const { maPeriod: mrUpperPeriod, deviationPct: mrUpperDeviationPct } = mrUpperConfig;

  const { trades: mrTrades, markers: mrMarkers } = useMemo(
    () =>
      series.length && mrEnabled && mrLowerEnabled
        ? simulateMeanRevertTrades(
            series,
            mrLowerPeriod,
            mrLowerDeviationPct,
            mrMaType
          )
        : { trades: [], markers: [] },
    [series, mrEnabled, mrLowerEnabled, mrLowerPeriod, mrLowerDeviationPct, mrMaType]
  );

  const { trades: mrUpperTrades, markers: mrUpperMarkers } = useMemo(
    () =>
      series.length && mrEnabled && mrUpperEnabled
        ? simulateUpperMeanRevertTrades(
            series,
            mrUpperPeriod,
            mrUpperDeviationPct,
            mrMaType
          )
        : { trades: [], markers: [] },
    [series, mrEnabled, mrUpperEnabled, mrUpperPeriod, mrUpperDeviationPct, mrMaType]
  );

  const mrChartMarkers = useMemo(() => {
    const markers = [
      ...(mrEnabled && mrLowerEnabled ? mrMarkers : []),
      ...(mrEnabled && mrUpperEnabled ? mrUpperMarkers : []),
    ];
    if (mrShowExitMarkers) return markers;
    return markers.filter(
      (m) => m.text !== MR_LOWER_EXIT && m.text !== MR_UPPER_EXIT
    );
  }, [
    mrEnabled,
    mrLowerEnabled,
    mrUpperEnabled,
    mrMarkers,
    mrUpperMarkers,
    mrShowExitMarkers,
  ]);

  const mrOnChart = mrEnabled && (mrLowerEnabled || mrUpperEnabled);

  return (
    <div className="app-shell">
      <AppHeader
        page={page}
        onGoChart={() => setPage("chart")}
        onGoRules={() => setPage("rules")}
      />
      {page === "rules" ? (
        <TradingRules />
      ) : (
    <div className="app-layout">
      <aside className="sidebar">
        <h1 className="sidebar-title">DBMA</h1>
        <p className="sidebar-sub">Stock chart</p>

        <form className="sidebar-form" onSubmit={onSubmit}>
          <label className="sidebar-field">
            <span>Symbol</span>
            <SymbolAutocomplete
              value={input}
              onChange={setInput}
              onPick={load}
              disabled={loading}
            />
          </label>
          <button type="submit" className="sidebar-load" disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </button>
        </form>

        {error ? <div className="error sidebar-error">{error}</div> : null}

        <details className="expand-panel sidebar-panel" open>
          <summary>MA settings</summary>
          <div className="expand-body sidebar-panel-body">
            <div className="ma-controls" aria-label="Moving average settings">
              <label className="ma-controls-field mr-toggle">
                <span>Show on chart</span>
                <input
                  type="checkbox"
                  checked={maEnabled}
                  onChange={(e) => setMaEnabled(e.target.checked)}
                  aria-label="Show moving averages on chart"
                />
              </label>
              <label className="ma-controls-field">
                <span>Type</span>
                <select
                  value={maType}
                  onChange={(e) => updateMaType(e.target.value)}
                  aria-label="MA type"
                >
                  <option value="ema">EMA</option>
                  <option value="sma">SMA</option>
                </select>
              </label>
              <label className="ma-controls-field">
                <span>Fast</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fastInput}
                  onChange={(e) => setFastInput(e.target.value.replace(/\D/g, ""))}
                  onBlur={commitMaInputs}
                  onKeyDown={(e) => e.key === "Enter" && commitMaInputs()}
                  aria-label="Fast MA period"
                />
              </label>
              <label className="ma-controls-field">
                <span>Slow</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={slowInput}
                  onChange={(e) => setSlowInput(e.target.value.replace(/\D/g, ""))}
                  onBlur={commitMaInputs}
                  onKeyDown={(e) => e.key === "Enter" && commitMaInputs()}
                  aria-label="Slow MA period"
                />
              </label>
              <label className="ma-controls-field">
                <span>Entry confirm</span>
                <select
                  value={entryConfirm}
                  onChange={(e) => setEntryConfirm(e.target.value)}
                  aria-label="Entry confirmation"
                >
                  <option value={ENTRY_CONFIRM.SINGLE}>One close above fast</option>
                  <option value={ENTRY_CONFIRM.DOUBLE}>
                    Two closes above fast
                  </option>
                </select>
              </label>
            </div>

            {maEnabled ? (
              <div className="ma-legend" aria-label="Moving average legend">
                <div className="ma-legend-item">
                  <span
                    className="ma-legend-swatch"
                    style={{ background: MA_FAST_COLOR }}
                  />
                  {maType.toUpperCase()} {fast}
                </div>
                <div className="ma-legend-item">
                  <span
                    className="ma-legend-swatch"
                    style={{ background: MA_SLOW_COLOR }}
                  />
                  {maType.toUpperCase()} {slow}
                </div>
              </div>
            ) : null}
          </div>
        </details>

        <details className="expand-panel sidebar-panel" open>
          <summary>Mean Reversion</summary>
          <div className="expand-body sidebar-panel-body">
            <div className="ma-controls mr-controls" aria-label="Mean reversion settings">
              <label className="ma-controls-field mr-toggle">
                <span>Show on chart</span>
                <input
                  type="checkbox"
                  checked={mrEnabled}
                  onChange={(e) => setMrEnabled(e.target.checked)}
                  aria-label="Show mean reversion on chart"
                />
              </label>
              <label className="ma-controls-field mr-toggle">
                <span>Lower band MR</span>
                <input
                  type="checkbox"
                  checked={mrLowerEnabled}
                  onChange={(e) => setMrLowerEnabled(e.target.checked)}
                  disabled={!mrEnabled}
                  aria-label="Show lower band mean reversion on chart"
                />
              </label>
              <label className="ma-controls-field mr-toggle">
                <span>Upper band MR</span>
                <input
                  type="checkbox"
                  checked={mrUpperEnabled}
                  onChange={(e) => setMrUpperEnabled(e.target.checked)}
                  disabled={!mrEnabled}
                  aria-label="Show upper band mean reversion on chart"
                />
              </label>
              <label className="ma-controls-field mr-toggle">
                <span>Show exit markers</span>
                <input
                  type="checkbox"
                  checked={mrShowExitMarkers}
                  onChange={(e) => setMrShowExitMarkers(e.target.checked)}
                  disabled={!mrEnabled || (!mrLowerEnabled && !mrUpperEnabled)}
                  aria-label="Show mean reversion exit markers on chart"
                />
              </label>
              <label className="ma-controls-field">
                <span>Type</span>
                <select
                  value={mrMaType}
                  onChange={(e) => setMrMaType(e.target.value === "sma" ? "sma" : "ema")}
                  aria-label="MR MA type"
                >
                  <option value="ema">EMA</option>
                  <option value="sma">SMA</option>
                </select>
              </label>

              <div className="ma-controls-title">Lower band</div>
              <label className="ma-controls-field">
                <span>MA period</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mrLowerMaPeriodInput}
                  onChange={(e) =>
                    setMrLowerMaPeriodInput(e.target.value.replace(/\D/g, ""))
                  }
                  onBlur={commitMrLowerInputs}
                  onKeyDown={(e) => e.key === "Enter" && commitMrLowerInputs()}
                  aria-label="Lower MR MA period"
                />
              </label>
              <label className="ma-controls-field">
                <span>Deviation %</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={mrLowerDeviationInput}
                  onChange={(e) =>
                    setMrLowerDeviationInput(e.target.value.replace(/[^\d.]/g, ""))
                  }
                  onBlur={commitMrLowerInputs}
                  onKeyDown={(e) => e.key === "Enter" && commitMrLowerInputs()}
                  aria-label="Lower MR deviation percent"
                />
              </label>

              <div className="ma-controls-title">Upper band</div>
              <label className="ma-controls-field">
                <span>MA period</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mrUpperMaPeriodInput}
                  onChange={(e) =>
                    setMrUpperMaPeriodInput(e.target.value.replace(/\D/g, ""))
                  }
                  onBlur={commitMrUpperInputs}
                  onKeyDown={(e) => e.key === "Enter" && commitMrUpperInputs()}
                  aria-label="Upper MR MA period"
                />
              </label>
              <label className="ma-controls-field">
                <span>Deviation %</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={mrUpperDeviationInput}
                  onChange={(e) =>
                    setMrUpperDeviationInput(e.target.value.replace(/[^\d.]/g, ""))
                  }
                  onBlur={commitMrUpperInputs}
                  onKeyDown={(e) => e.key === "Enter" && commitMrUpperInputs()}
                  aria-label="Upper MR deviation percent"
                />
              </label>
            </div>

            {mrOnChart ? (
              <div className="ma-legend" aria-label="Mean reversion legend">
                {mrLowerEnabled ? (
                  <>
                    <div className="ma-legend-item">
                      <span className="ma-legend-swatch" style={{ background: MR_MA_COLOR }} />
                      Lower MR {mrMaType.toUpperCase()} {mrLowerPeriod}
                    </div>
                    <div className="ma-legend-item">
                      <span className="ma-legend-swatch" style={{ background: MR_BAND_COLOR }} />
                      −{mrLowerDeviationPct}% band
                    </div>
                    <div className="ma-legend-item">
                      <span className="ma-legend-swatch" style={{ background: MR_ENTRY_COLOR }} />
                      Lower MR entry
                    </div>
                    {mrShowExitMarkers ? (
                      <div className="ma-legend-item">
                        <span className="ma-legend-swatch" style={{ background: MR_EXIT_COLOR }} />
                        Lower MR exit
                      </div>
                    ) : null}
                  </>
                ) : null}
                {mrUpperEnabled ? (
                  <>
                    <div className="ma-legend-item">
                      <span className="ma-legend-swatch" style={{ background: MR_MA_COLOR }} />
                      Upper MR {mrMaType.toUpperCase()} {mrUpperPeriod}
                    </div>
                    <div className="ma-legend-item">
                      <span className="ma-legend-swatch" style={{ background: MR_UPPER_BAND_COLOR }} />
                      +{mrUpperDeviationPct}% band
                    </div>
                    <div className="ma-legend-item">
                      <span className="ma-legend-swatch" style={{ background: MR_UPPER_ENTRY_COLOR }} />
                      Upper MR entry
                    </div>
                    {mrShowExitMarkers ? (
                      <div className="ma-legend-item">
                        <span className="ma-legend-swatch" style={{ background: MR_UPPER_EXIT_COLOR }} />
                        Upper MR exit
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </details>
      </aside>

      <main className="main-content">
        <ScannerPanel
          activeSymbol={symbol}
          onSelectSymbol={onSelectFromScanner}
        />

        <p className="sub">
          Daily OHLC from MySQL ({payload?.historyYears ?? 3}-year window).{" "}
          {maType.toUpperCase()} {fast} / {maType.toUpperCase()} {slow}
        </p>

        {payload ? (
          <>
            <div className="meta">{formatChartMeta(payload, symbol)}</div>
          <div className="panel">
            {series.length ? (
              <>
                <CandlestickChart
                  data={series}
                  markers={markers}
                  maEnabled={maEnabled}
                  fastPeriod={fast}
                  slowPeriod={slow}
                  maType={maType}
                  mrEnabled={mrOnChart}
                  mrLowerEnabled={mrLowerEnabled}
                  mrUpperEnabled={mrUpperEnabled}
                  mrLowerPeriod={mrLowerPeriod}
                  mrLowerDeviationPct={mrLowerDeviationPct}
                  mrUpperPeriod={mrUpperPeriod}
                  mrUpperDeviationPct={mrUpperDeviationPct}
                  mrMaType={mrMaType}
                  mrMarkers={mrChartMarkers}
                />
              </>
            ) : (
              <p>No rows returned.</p>
            )}
          </div>

          {maEnabled && series.length && trades.length ? (
            <TradesTable trades={trades} summaryLabel="Entries & exits" />
          ) : null}

          {mrEnabled && mrLowerEnabled && series.length && mrTrades.length ? (
            <TradesTable
              trades={mrTrades}
              summaryLabel="Lower mean reversion trades"
              rowKeyPrefix="mr-"
            />
          ) : null}

          {mrEnabled && mrUpperEnabled && series.length && mrUpperTrades.length ? (
            <TradesTable
              trades={mrUpperTrades}
              summaryLabel="Upper mean reversion trades"
              rowKeyPrefix="mr-upper-"
              shortPnl
            />
          ) : null}

          {optimizeResult ? (
            <details className="expand-panel">
              <summary>Optimized MAs — {symbol}</summary>
              <div className="expand-body">
              <p className="optimize-note">
                Top 3 by min(3y, 1y return). Click a row to apply fast/slow to
                the chart.
                {optimizeResult.totalPairs
                  ? ` ${optimizeResult.totalPairs} pairs tested.`
                  : ""}
              </p>
              {optimizeResult.baseline ? (
                <p className="optimize-note">
                  Default 21/50: rank #{optimizeResult.baseline.rank} · 3y{" "}
                  {formatPct(optimizeResult.baseline.r3y)} · 1y{" "}
                  {formatPct(optimizeResult.baseline.r1y)}
                </p>
              ) : null}
              {optimizeResult.top.length ? (
                <div className="optimize-scroll">
                  <table className="optimize-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Fast</th>
                        <th>Slow</th>
                        <th>3y</th>
                        <th>1y</th>
                        <th>Min</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optimizeResult.top.map((row, i) => {
                        const active =
                          maEnabled &&
                          row.fast === fast &&
                          row.slow === slow &&
                          maType === "ema";
                        return (
                          <tr
                            key={`${row.fast}-${row.slow}`}
                            className={active ? "optimize-row-active" : ""}
                            onClick={() => {
                              setMaEnabled(true);
                              applyMa(row.fast, row.slow);
                            }}
                            title="Apply to chart"
                          >
                            <td>{i + 1}</td>
                            <td>{row.fast}</td>
                            <td>{row.slow}</td>
                            <td>{formatPct(row.r3y)}</td>
                            <td>{formatPct(row.r1y)}</td>
                            <td>{formatPct(row.minReturn)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No pairs met minimum trade counts.</p>
              )}
              </div>
            </details>
          ) : null}

          {optimizeMrResult ? (
            <details className="expand-panel">
              <summary>Optimized lower mean reversion — {symbol}</summary>
              <div className="expand-body">
                <p className="optimize-note">
                  Top 3 by min(3y, 1y return). Click a row to apply lower-band MA
                  period and deviation %.
                  {optimizeMrResult.totalPairs
                    ? ` ${optimizeMrResult.totalPairs} pairs tested.`
                    : ""}
                </p>
                {optimizeMrResult.baseline ? (
                  <p className="optimize-note">
                    Default 21 / 3%: rank #{optimizeMrResult.baseline.rank} · 3y{" "}
                    {formatPct(optimizeMrResult.baseline.r3y)} · 1y{" "}
                    {formatPct(optimizeMrResult.baseline.r1y)}
                  </p>
                ) : null}
                {optimizeMrResult.top.length ? (
                  <div className="optimize-scroll">
                    <table className="optimize-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>MA</th>
                          <th>Dev %</th>
                          <th>3y</th>
                          <th>1y</th>
                          <th>Min</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optimizeMrResult.top.map((row, i) => {
                          const active =
                            mrEnabled &&
                            mrLowerEnabled &&
                            row.maPeriod === mrLowerPeriod &&
                            row.deviationPct === mrLowerDeviationPct &&
                            mrMaType === "ema";
                          return (
                            <tr
                              key={`lower-${row.maPeriod}-${row.deviationPct}`}
                              className={active ? "optimize-row-active" : ""}
                              onClick={() => {
                                setMrEnabled(true);
                                setMrLowerEnabled(true);
                                applyMrLower(row.maPeriod, row.deviationPct);
                              }}
                              title="Apply to lower band"
                            >
                              <td>{i + 1}</td>
                              <td>{row.maPeriod}</td>
                              <td>{row.deviationPct}</td>
                              <td>{formatPct(row.r3y)}</td>
                              <td>{formatPct(row.r1y)}</td>
                              <td>{formatPct(row.minReturn)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No pairs met minimum trade counts.</p>
                )}
              </div>
            </details>
          ) : null}

          {optimizeUpperMrResult ? (
            <details className="expand-panel">
              <summary>Optimized upper mean reversion — {symbol}</summary>
              <div className="expand-body">
                <p className="optimize-note">
                  Top 3 by min(3y, 1y fade return). Click a row to apply upper-band
                  MA period and deviation %.
                  {optimizeUpperMrResult.totalPairs
                    ? ` ${optimizeUpperMrResult.totalPairs} pairs tested.`
                    : ""}
                </p>
                {optimizeUpperMrResult.baseline ? (
                  <p className="optimize-note">
                    Default 21 / 3%: rank #{optimizeUpperMrResult.baseline.rank} · 3y{" "}
                    {formatPct(optimizeUpperMrResult.baseline.r3y)} · 1y{" "}
                    {formatPct(optimizeUpperMrResult.baseline.r1y)}
                  </p>
                ) : null}
                {optimizeUpperMrResult.top.length ? (
                  <div className="optimize-scroll">
                    <table className="optimize-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>MA</th>
                          <th>Dev %</th>
                          <th>3y</th>
                          <th>1y</th>
                          <th>Min</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optimizeUpperMrResult.top.map((row, i) => {
                          const active =
                            mrEnabled &&
                            mrUpperEnabled &&
                            row.maPeriod === mrUpperPeriod &&
                            row.deviationPct === mrUpperDeviationPct &&
                            mrMaType === "ema";
                          return (
                            <tr
                              key={`upper-${row.maPeriod}-${row.deviationPct}`}
                              className={active ? "optimize-row-active" : ""}
                              onClick={() => {
                                setMrEnabled(true);
                                setMrUpperEnabled(true);
                                applyMrUpper(row.maPeriod, row.deviationPct);
                              }}
                              title="Apply to upper band"
                            >
                              <td>{i + 1}</td>
                              <td>{row.maPeriod}</td>
                              <td>{row.deviationPct}</td>
                              <td>{formatPct(row.r3y)}</td>
                              <td>{formatPct(row.r1y)}</td>
                              <td>{formatPct(row.minReturn)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No pairs met minimum trade counts.</p>
                )}
              </div>
            </details>
          ) : null}
        </>
        ) : null}
      </main>
    </div>
      )}
    </div>
  );
}
