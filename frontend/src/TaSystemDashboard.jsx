import { useCallback, useEffect, useMemo, useState } from "react";
import SymbolAutocomplete from "./SymbolAutocomplete.jsx";
import MaCrossoverChart from "./MaCrossoverChart.jsx";
import OpensClosesTable from "./OpensClosesTable.jsx";
import TopPerformersDialog from "./TopPerformersDialog.jsx";
import YesterdaySignalsDialog from "./YesterdaySignalsDialog.jsx";
import DowStocksDialog from "./DowStocksDialog.jsx";
import MaCrossoverProblemsDialog from "./MaCrossoverProblemsDialog.jsx";
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
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState(null);
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [signalRows, setSignalRows] = useState([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsError, setSignalsError] = useState(null);
  const [dowOpen, setDowOpen] = useState(false);
  const [dowRows, setDowRows] = useState([]);
  const [dowLoading, setDowLoading] = useState(false);
  const [dowError, setDowError] = useState(null);
  const [problemsOpen, setProblemsOpen] = useState(false);

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
      const [barsRes, pairRes] = await Promise.all([
        fetch(`/api/daily-stock-data?${q}`),
        fetch(`/api/systems/ma-crossover/pair?${q}`, { cache: "no-store" }),
      ]);
      const barsBody = await barsRes.json().catch(() => ({}));
      if (!barsRes.ok) {
        setError(barsBody.error || `Request failed (${barsRes.status})`);
        setBars([]);
        return;
      }
      setBars(barsBody.data ?? []);

      const pairBody = await pairRes.json().catch(() => ({}));
      const pair = pairRes.ok ? pairBody.pair : null;
      if (pair?.fast != null && pair?.slow != null) {
        setFastInput(String(pair.fast));
        setSlowInput(String(pair.slow));
        setMaType("sma");
      } else {
        setFastInput("21");
        setSlowInput("50");
        setMaType("sma");
      }
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
          setTopError(body.error || `Request failed (${res.status})`);
          return;
        }
        setTopRows(body.top ?? []);
      } catch (err) {
        if (cancelled) return;
        setTopRows([]);
        setTopError(err?.message || "Top performers request failed");
      } finally {
        if (!cancelled) setTopLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topOpen, isMaCrossover]);

  useEffect(() => {
    if (!signalsOpen || !isMaCrossover) return undefined;
    let cancelled = false;
    (async () => {
      setSignalsLoading(true);
      setSignalsError(null);
      try {
        const res = await fetch(
          "/api/systems/ma-crossover/yesterday-signals",
          { cache: "no-store" }
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setSignalRows([]);
          setSignalsError(body.error || `Request failed (${res.status})`);
          return;
        }
        setSignalRows(body.signals ?? []);
      } catch (err) {
        if (cancelled) return;
        setSignalRows([]);
        setSignalsError(err?.message || "Yesterday signals request failed");
      } finally {
        if (!cancelled) setSignalsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signalsOpen, isMaCrossover]);

  useEffect(() => {
    if (!dowOpen || !isMaCrossover) return undefined;
    let cancelled = false;
    (async () => {
      setDowLoading(true);
      setDowError(null);
      try {
        const res = await fetch("/api/systems/ma-crossover/dow", {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setDowRows([]);
          setDowError(body.error || `Request failed (${res.status})`);
          return;
        }
        setDowRows(body.stocks ?? []);
      } catch (err) {
        if (cancelled) return;
        setDowRows([]);
        setDowError(err?.message || "Dow stocks request failed");
      } finally {
        if (!cancelled) setDowLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dowOpen, isMaCrossover]);

  function onSubmit(e) {
    e.preventDefault();
    loadSymbol(input);
  }

  function onSelectTopRow(row) {
    loadSymbol(row.symbol);
  }

  function onSelectSignalRow(row) {
    loadSymbol(row.symbol);
  }

  function onSelectDowRow(row) {
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
            <button
              type="button"
              className="sidebar-top-performers"
              onClick={() => setSignalsOpen(true)}
            >
              Yesterday&apos;s signals
            </button>
            <button
              type="button"
              className="sidebar-top-performers"
              onClick={() => setDowOpen(true)}
            >
              Dow 30
            </button>
            <button
              type="button"
              className="sidebar-top-performers"
              onClick={() => setProblemsOpen(true)}
            >
              Problems with MA crossovers
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
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="MA crossover — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "The MA pair was chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why." +
              "Also review the 'Problems with the MA Crossover system'"
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="MA crossover — yesterday's signals"
            subtitle="Entry/exit on each symbol's last trading session (all assets)"
            note="Close is the signal-day close (when the cross fired), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="MA crossover — Dow 30"
            subtitle={"This is a quick list of the Dow stocks.  Profit for stock is calculated of the about the last 2 years.  " +
            "One share was bought and sold to calculate the profit or loss."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <MaCrossoverProblemsDialog
            open={problemsOpen}
            onClose={() => setProblemsOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
