import { useCallback, useEffect, useMemo, useState } from "react";
import SymbolAutocomplete from "./SymbolAutocomplete.jsx";
import MaCrossoverChart from "./MaCrossoverChart.jsx";
import OpensClosesTable from "./OpensClosesTable.jsx";
import TopPerformersDialog from "./TopPerformersDialog.jsx";
import { simulateMaCrossover } from "./maCrossoverSignals.js";

const DEFAULT_SYMBOL = "AAPL";

function parsePeriod(value, fallback) {
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.max(2, Math.min(200, Math.floor(n)));
}

/**
 * Shared TA system dashboard shell (chart-tab layout).
 * MA crossover is wired first; other systems leave the body blank for now.
 */
export default function TaSystemDashboard({ system }) {
  const [input, setInput] = useState(DEFAULT_SYMBOL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bars, setBars] = useState([]);

  const [maType, setMaType] = useState("sma");
  const [fastInput, setFastInput] = useState("21");
  const [slowInput, setSlowInput] = useState("50");
  const [topOpen, setTopOpen] = useState(false);
  const [topRows, setTopRows] = useState([]);
  const [topAsOf, setTopAsOf] = useState(null);
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState(null);

  const isMaCrossover = system?.id === "ma-crossover";
  const fast = parsePeriod(fastInput, 21);
  const slow = Math.max(parsePeriod(slowInput, 50), fast + 1);

  const { trades, markers } = useMemo(() => {
    if (!isMaCrossover || !bars.length) return { trades: [], markers: [] };
    return simulateMaCrossover(bars, fast, slow, maType);
  }, [isMaCrossover, bars, fast, slow, maType]);

  const loadSymbol = useCallback(async (raw) => {
    const next = String(raw ?? "")
      .trim()
      .toUpperCase();
    if (!next) return;
    setInput(next);
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ symbol: next });
      const res = await fetch(`/api/daily-stock-data?${q}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `Request failed (${res.status})`);
        setBars([]);
        return;
      }
      setBars(body.data ?? []);
    } catch (err) {
      setError(err?.message || String(err));
      setBars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMaCrossover) loadSymbol(DEFAULT_SYMBOL);
  }, [isMaCrossover, loadSymbol]);

  useEffect(() => {
    if (!topOpen || !isMaCrossover) return undefined;
    let cancelled = false;
    (async () => {
      setTopLoading(true);
      setTopError(null);
      try {
        const res = await fetch(
          "/api/systems/ma-crossover/top-performers?top=50",
          { cache: "no-store" }
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setTopRows([]);
          setTopAsOf(null);
          setTopError(body.error || `Request failed (${res.status})`);
          return;
        }
        setTopRows(body.top ?? []);
        setTopAsOf(body.asOfDate ?? null);
      } catch (err) {
        if (cancelled) return;
        setTopRows([]);
        setTopAsOf(null);
        setTopError(err?.message || "Top performers request failed");
      } finally {
        if (!cancelled) setTopLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topOpen, isMaCrossover]);

  function onSubmit(e) {
    e.preventDefault();
    loadSymbol(input);
  }

  function onSelectTopRow(row) {
    if (row.optFast != null) setFastInput(String(row.optFast));
    if (row.optSlow != null) setSlowInput(String(row.optSlow));
    setMaType("sma");
    loadSymbol(row.symbol);
  }

  const asOfDate = bars.length ? bars[bars.length - 1].date : null;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h1 className="sidebar-title">Chart Settings</h1>
        <form className="sidebar-form" onSubmit={onSubmit}>
          <label className="sidebar-field">
            <span>Symbol</span>
            <SymbolAutocomplete
              value={input}
              onChange={setInput}
              onPick={loadSymbol}
              disabled={loading}
            />
          </label>
          <button type="submit" className="sidebar-load" disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </button>
        </form>

        {error ? <div className="error sidebar-error">{error}</div> : null}

        {isMaCrossover ? (
          <div className="ma-controls" aria-label="MA crossover settings">
            <div className="ma-controls-title">MA settings</div>
            <label className="ma-controls-field">
              <span>Type</span>
              <select
                value={maType}
                onChange={(e) => setMaType(e.target.value === "ema" ? "ema" : "sma")}
                aria-label="MA type"
              >
                <option value="sma">SMA</option>
                <option value="ema">EMA</option>
              </select>
            </label>
            <label className="ma-controls-field">
              <span>Fast</span>
              <input
                type="text"
                inputMode="numeric"
                value={fastInput}
                onChange={(e) => setFastInput(e.target.value.replace(/\D/g, ""))}
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
                aria-label="Slow MA period"
              />
            </label>
            <button
              type="button"
              className="sidebar-top-performers"
              onClick={() => setTopOpen(true)}
            >
              Top performers
            </button>
          </div>
        ) : null}
      </aside>

      <main className="main-content" aria-label={system?.name ?? "TA system"}>
        {isMaCrossover ? (
          <>
            <h1 className="systems-dash-title">{system.name}</h1>
            <div className="panel">
              <MaCrossoverChart
                data={bars}
                markers={markers}
                fastPeriod={fast}
                slowPeriod={slow}
                maType={maType}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
          </>
        ) : null}
      </main>

      {isMaCrossover ? (
        <TopPerformersDialog
          open={topOpen}
          onClose={() => setTopOpen(false)}
          title="MA crossover — top performers"
          subtitle={
            topAsOf
              ? `Optimized SMA crossover (1-share $ P/L) · as of ${topAsOf}`
              : "Optimized SMA crossover (1-share $ P/L)"
          }
          rows={topRows}
          loading={topLoading}
          error={topError}
          onSelectRow={onSelectTopRow}
        />
      ) : null}
    </div>
  );
}
