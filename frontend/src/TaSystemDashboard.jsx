import { useCallback, useEffect, useMemo, useState } from "react";
import SymbolAutocomplete from "./SymbolAutocomplete.jsx";
import MaCrossoverChart from "./MaCrossoverChart.jsx";
import TripleMaChart from "./TripleMaChart.jsx";
import MacdChart from "./MacdChart.jsx";
import OpensClosesTable from "./OpensClosesTable.jsx";
import TopPerformersDialog from "./TopPerformersDialog.jsx";
import YesterdaySignalsDialog from "./YesterdaySignalsDialog.jsx";
import DowStocksDialog from "./DowStocksDialog.jsx";
import MaCrossoverProblemsDialog from "./MaCrossoverProblemsDialog.jsx";
import TripleMaAboutDialog from "./TripleMaAboutDialog.jsx";
import TripleMaProblemsDialog from "./TripleMaProblemsDialog.jsx";
import MacdProblemsDialog from "./MacdProblemsDialog.jsx";
import MacdAboutDialog from "./MacdAboutDialog.jsx";
import { simulateMaCrossover } from "./maCrossoverSignals.js";
import { simulateTripleMa } from "./tripleMaSignals.js";
import { simulateMacd } from "./macdSignals.js";
import { parsePeriod } from "./util/parsePeriod.js";

const DEFAULT_SYMBOL = "AAPL";

/**
 * Shared TA system dashboard shell (chart-tab layout).
 * MA crossover, Triple MA, and MACD are wired; other systems blank for now.
 */
export default function TaSystemDashboard({ system }) {
  const isMaCrossover = system?.id === "ma-crossover";
  const isTripleMa = system?.id === "triple-ma";
  const isMacd = system?.id === "macd";
  const usesChart = isMaCrossover || isTripleMa || isMacd;

  const [input, setInput] = useState(DEFAULT_SYMBOL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bars, setBars] = useState([]);

  const [maType, setMaType] = useState("sma");
  const [fastInput, setFastInput] = useState(
    isTripleMa ? "10" : isMacd ? "12" : "21"
  );
  const [mediumInput, setMediumInput] = useState("20");
  const [slowInput, setSlowInput] = useState(
    isTripleMa ? "50" : isMacd ? "26" : "50"
  );
  const [signalInput, setSignalInput] = useState("9");
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
  const [tripleAboutOpen, setTripleAboutOpen] = useState(false);
  const [tripleProblemsOpen, setTripleProblemsOpen] = useState(false);
  const [macdAboutOpen, setMacdAboutOpen] = useState(false);
  const [macdProblemsOpen, setMacdProblemsOpen] = useState(false);

  const fast = parsePeriod(
    fastInput,
    isTripleMa ? 10 : isMacd ? 12 : 21
  );
  const medium = Math.max(parsePeriod(mediumInput, 20), fast + 1);
  const slow = Math.max(
    parsePeriod(slowInput, isTripleMa ? 50 : isMacd ? 26 : 50),
    (isTripleMa ? medium : fast) + 1
  );
  const signalPeriod = Math.max(1, parsePeriod(signalInput, 9));

  const { trades, markers } = useMemo(() => {
    if (!bars.length) return { trades: [], markers: [] };
    if (isMaCrossover) {
      return simulateMaCrossover(bars, fast, slow, maType);
    }
    if (isTripleMa) {
      return simulateTripleMa(bars, fast, medium, slow, maType);
    }
    if (isMacd) {
      return simulateMacd(bars, fast, slow, signalPeriod);
    }
    return { trades: [], markers: [] };
  }, [
    isMaCrossover,
    isTripleMa,
    isMacd,
    bars,
    fast,
    medium,
    slow,
    maType,
    signalPeriod,
  ]);

  const loadSymbol = useCallback(
    async (raw) => {
      const next = String(raw ?? "")
        .trim()
        .toUpperCase();
      if (!next) return;
      setInput(next);
      setLoading(true);
      setError("");
      try {
        const q = new URLSearchParams({ symbol: next });
        const barsPromise = fetch(`/api/daily-stock-data?${q}`);
        const pairPromise = isMaCrossover
          ? fetch(`/api/systems/ma-crossover/pair?${q}`, { cache: "no-store" })
          : isTripleMa
            ? fetch(`/api/systems/triple-ma/pair?${q}`, { cache: "no-store" })
            : isMacd
              ? fetch(`/api/systems/macd/pair?${q}`, { cache: "no-store" })
              : null;

        const barsRes = await barsPromise;
        const barsBody = await barsRes.json().catch(() => ({}));
        if (!barsRes.ok) {
          setError(barsBody.error || `Request failed (${barsRes.status})`);
          setBars([]);
          return;
        }
        setBars(barsBody.data ?? []);

        if (pairPromise) {
          const pairRes = await pairPromise;
          const pairBody = await pairRes.json().catch(() => ({}));
          const pair = pairRes.ok ? pairBody.pair : null;
          if (isMaCrossover) {
            if (pair?.fast != null && pair?.slow != null) {
              setFastInput(String(pair.fast));
              setSlowInput(String(pair.slow));
            } else {
              setFastInput("21");
              setSlowInput("50");
            }
            setMaType("sma");
          } else if (isTripleMa) {
            if (
              pair?.fast != null &&
              pair?.medium != null &&
              pair?.slow != null
            ) {
              setFastInput(String(pair.fast));
              setMediumInput(String(pair.medium));
              setSlowInput(String(pair.slow));
            } else {
              setFastInput("10");
              setMediumInput("20");
              setSlowInput("50");
            }
            setMaType("sma");
          } else if (isMacd) {
            if (
              pair?.fast != null &&
              pair?.slow != null &&
              pair?.signal != null
            ) {
              setFastInput(String(pair.fast));
              setSlowInput(String(pair.slow));
              setSignalInput(String(pair.signal));
            } else {
              setFastInput("12");
              setSlowInput("26");
              setSignalInput("9");
            }
          }
        }
      } catch (err) {
        setError(err?.message || String(err));
        setBars([]);
      } finally {
        setLoading(false);
      }
    },
    [isMaCrossover, isTripleMa, isMacd]
  );

  useEffect(() => {
    if (usesChart) loadSymbol(DEFAULT_SYMBOL);
  }, [usesChart, loadSymbol]);

  useEffect(() => {
    if (!topOpen || (!isMaCrossover && !isTripleMa && !isMacd))
      return undefined;
    let cancelled = false;
    (async () => {
      setTopLoading(true);
      setTopError(null);
      try {
        const url = isMacd
          ? "/api/systems/macd/top-performers?top=50"
          : isTripleMa
            ? "/api/systems/triple-ma/top-performers?top=50"
            : "/api/systems/ma-crossover/top-performers?top=50";
        const res = await fetch(url, { cache: "no-store" });
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
  }, [topOpen, isMaCrossover, isTripleMa, isMacd]);

  useEffect(() => {
    if (!signalsOpen || (!isMaCrossover && !isTripleMa && !isMacd))
      return undefined;
    let cancelled = false;
    (async () => {
      setSignalsLoading(true);
      setSignalsError(null);
      try {
        const url = isMacd
          ? "/api/systems/macd/yesterday-signals"
          : isTripleMa
            ? "/api/systems/triple-ma/yesterday-signals"
            : "/api/systems/ma-crossover/yesterday-signals";
        const res = await fetch(url, { cache: "no-store" });
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
  }, [signalsOpen, isMaCrossover, isTripleMa, isMacd]);

  useEffect(() => {
    if (!dowOpen || (!isMaCrossover && !isTripleMa && !isMacd))
      return undefined;
    let cancelled = false;
    (async () => {
      setDowLoading(true);
      setDowError(null);
      try {
        const url = isMacd
          ? "/api/systems/macd/dow"
          : isTripleMa
            ? "/api/systems/triple-ma/dow"
            : "/api/systems/ma-crossover/dow";
        const res = await fetch(url, { cache: "no-store" });
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
  }, [dowOpen, isMaCrossover, isTripleMa, isMacd]);

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
    if (isTripleMa) {
      if (row.optFast != null) setFastInput(String(row.optFast));
      if (row.optMedium != null) setMediumInput(String(row.optMedium));
      if (row.optSlow != null) setSlowInput(String(row.optSlow));
      setMaType("sma");
    } else if (isMacd) {
      if (row.optFast != null) setFastInput(String(row.optFast));
      if (row.optSlow != null) setSlowInput(String(row.optSlow));
      if (row.optSignal != null) setSignalInput(String(row.optSignal));
    }
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
                onChange={(e) =>
                  setMaType(e.target.value === "ema" ? "ema" : "sma")
                }
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
                onChange={(e) =>
                  setFastInput(e.target.value.replace(/\D/g, ""))
                }
                aria-label="Fast MA period"
              />
            </label>
            <label className="ma-controls-field">
              <span>Slow</span>
              <input
                type="text"
                inputMode="numeric"
                value={slowInput}
                onChange={(e) =>
                  setSlowInput(e.target.value.replace(/\D/g, ""))
                }
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
              Pros and Cons
            </button>
          </div>
        ) : null}

        {isTripleMa ? (
          <div className="ma-controls" aria-label="Triple MA settings">
            <div className="ma-controls-title">MA settings</div>
            <label className="ma-controls-field">
              <span>Type</span>
              <select
                value={maType}
                onChange={(e) =>
                  setMaType(e.target.value === "ema" ? "ema" : "sma")
                }
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
                onChange={(e) =>
                  setFastInput(e.target.value.replace(/\D/g, ""))
                }
                aria-label="Fast MA period"
              />
            </label>
            <label className="ma-controls-field">
              <span>Medium</span>
              <input
                type="text"
                inputMode="numeric"
                value={mediumInput}
                onChange={(e) =>
                  setMediumInput(e.target.value.replace(/\D/g, ""))
                }
                aria-label="Medium MA period"
              />
            </label>
            <label className="ma-controls-field">
              <span>Slow</span>
              <input
                type="text"
                inputMode="numeric"
                value={slowInput}
                onChange={(e) =>
                  setSlowInput(e.target.value.replace(/\D/g, ""))
                }
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
              onClick={() => setTripleProblemsOpen(true)}
            >
              Pros &amp; cons
            </button>
          </div>
        ) : null}

        {isMacd ? (
          <div className="ma-controls" aria-label="MACD settings">
            <div className="ma-controls-title">MACD settings</div>
            <label className="ma-controls-field">
              <span>Fast</span>
              <input
                type="text"
                inputMode="numeric"
                value={fastInput}
                onChange={(e) =>
                  setFastInput(e.target.value.replace(/\D/g, ""))
                }
                aria-label="MACD fast period"
              />
            </label>
            <label className="ma-controls-field">
              <span>Slow</span>
              <input
                type="text"
                inputMode="numeric"
                value={slowInput}
                onChange={(e) =>
                  setSlowInput(e.target.value.replace(/\D/g, ""))
                }
                aria-label="MACD slow period"
              />
            </label>
            <label className="ma-controls-field">
              <span>Signal</span>
              <input
                type="text"
                inputMode="numeric"
                value={signalInput}
                onChange={(e) =>
                  setSignalInput(e.target.value.replace(/\D/g, ""))
                }
                aria-label="MACD signal period"
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
              onClick={() => setMacdProblemsOpen(true)}
            >
              Pros &amp; cons
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

        {isTripleMa ? (
          <>
            <div className="systems-dash-title-row">
              <h1 className="systems-dash-title">{system.name}</h1>
              <button
                type="button"
                className="systems-about-btn"
                onClick={() => setTripleAboutOpen(true)}
                aria-label="About Triple Moving Average Alignment"
                title="About this system"
              >
                ?
              </button>
            </div>
            <div className="panel">
              <TripleMaChart
                data={bars}
                markers={markers}
                fastPeriod={fast}
                mediumPeriod={medium}
                slowPeriod={slow}
                maType={maType}
              />
            </div>
            {bars.length && trades.length ? (
              <OpensClosesTable trades={trades} asOfDate={asOfDate} />
            ) : null}
          </>
        ) : null}

        {isMacd ? (
          <>
            <div className="systems-dash-title-row">
              <h1 className="systems-dash-title">{system.name}</h1>
              <button
                type="button"
                className="systems-about-btn"
                onClick={() => setMacdAboutOpen(true)}
                aria-label="About MACD system"
                title="About this system"
              >
                ?
              </button>
            </div>
            <div className="panel">
              <MacdChart
                data={bars}
                markers={markers}
                fastPeriod={fast}
                slowPeriod={slow}
                signalPeriod={signalPeriod}
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
            subtitle={
              "This is a quick list of the Dow stocks.  Profit for stock is calculated of the about the last 2 years.  " +
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

      {isTripleMa ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="Triple MA — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "The MA periods were chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why. " +
              "Also review the Pros & cons of Triple MA alignment."
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="Triple MA — yesterday's signals"
            subtitle="Entry/exit on each symbol's last trading session (all assets)"
            note="Close is the signal-day close (when alignment flipped), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="Triple MA — Dow 30"
            subtitle={
              "Dow stocks using optimized triple MA alignment. " +
              "Profit is about the last 2 years, one share bought and sold."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <TripleMaAboutDialog
            open={tripleAboutOpen}
            onClose={() => setTripleAboutOpen(false)}
          />
          <TripleMaProblemsDialog
            open={tripleProblemsOpen}
            onClose={() => setTripleProblemsOpen(false)}
          />
        </>
      ) : null}

      {isMacd ? (
        <>
          <TopPerformersDialog
            open={topOpen}
            onClose={() => setTopOpen(false)}
            title="MACD — top performers"
            subtitle="Highest ~2y score (1-share $ P/L) · stock & ETF"
            note={
              "The top performers were sorted by profit over about the last 2 years (percent). " +
              "The MACD periods were chosen using the stock’s full price history. " +
              "Percent gains can look huge next to dollar gains — " +
              "open the chart’s opens & closes table to compare.\n\n" +
              "Be wary, some of the the P/L and P/L% can be misleading.  Review the chart will often show why."
            }
            rows={topRows}
            loading={topLoading}
            error={topError}
            onSelectRow={onSelectTopRow}
          />
          <YesterdaySignalsDialog
            open={signalsOpen}
            onClose={() => setSignalsOpen(false)}
            title="MACD — yesterday's signals"
            subtitle="Entry/exit on each symbol's last trading session (all assets)"
            note="Close is the signal-day close (when MACD crossed the signal line), not the next-open fill. Session dates differ by market (e.g. stocks vs forex)."
            rows={signalRows}
            loading={signalsLoading}
            error={signalsError}
            onSelectRow={onSelectSignalRow}
          />
          <DowStocksDialog
            open={dowOpen}
            onClose={() => setDowOpen(false)}
            title="MACD — Dow 30"
            subtitle={
              "Dow stocks using optimized MACD. " +
              "Profit is about the last 2 years, one share bought and sold."
            }
            rows={dowRows}
            loading={dowLoading}
            error={dowError}
            onSelectRow={onSelectDowRow}
          />
          <MacdProblemsDialog
            open={macdProblemsOpen}
            onClose={() => setMacdProblemsOpen(false)}
          />
          <MacdAboutDialog
            open={macdAboutOpen}
            onClose={() => setMacdAboutOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
