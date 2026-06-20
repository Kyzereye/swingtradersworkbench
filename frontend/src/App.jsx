import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "./AppHeader.jsx";
import CandlestickChart from "./CandlestickChart.jsx";
import RunningPnlChart, { runningPnlPctPoints } from "./RunningPnlChart.jsx";
import DailySignals from "./DailySignals.jsx";
import DashboardTabs from "./DashboardTabs.jsx";
import { MA_FAST_COLOR, MA_SLOW_COLOR } from "./chartColors.js";
import ScannerPanel from "./ScannerPanel.jsx";
import SymbolAutocomplete from "./SymbolAutocomplete.jsx";
import TradingRules from "./TradingRules.jsx";
import SymbolChangesTab from "./SymbolChangesTab.jsx";
import UserDashboardTab from "./UserDashboardTab.jsx";
import DisclaimerDialog from "./DisclaimerDialog.jsx";
import { formatPct } from "./optimizeMa.js";

const DEFAULT_SYMBOL = "AAPL";
const DEFAULT_MA = { fast: 21, slow: 50 };
const FAVORITES_KEY = "dbma-favorites";
const DISCLAIMER_SESSION_KEY = "dbma-disclaimer-v1";

function loadDisclaimerAccepted() {
  try {
    return sessionStorage.getItem(DISCLAIMER_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((s) => String(s).toUpperCase()) : []);
  } catch {
    return new Set();
  }
}

function parsePeriod(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(2, Math.min(200, Math.floor(n)));
}

function chartMaFromScan(scan) {
  const fast = parsePeriod(scan?.optFast, DEFAULT_MA.fast);
  let slow = parsePeriod(scan?.optSlow, DEFAULT_MA.slow);
  if (slow <= fast) slow = fast + 1;
  return { fast, slow };
}

function formatPnl(v) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}`;
}

function formatDataSpan(fromDate, toDate) {
  if (!fromDate || !toDate) return "";
  const from = new Date(`${fromDate}T12:00:00`);
  const to = new Date(`${toDate}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return "";
  }

  const totalMonths =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) +
    1;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  function plural(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
  }

  if (years === 0) {
    return plural(totalMonths, "month");
  }
  if (months === 0) {
    return plural(years, "year");
  }
  return `${plural(years, "year")} ${plural(months, "month")}`;
}

function formatChartMeta(companyName, sym, fromDate, toDate) {
  const span = formatDataSpan(fromDate, toDate);
  const name = companyName?.trim();
  const parts = name ? [name, sym] : [sym];
  if (span) parts.push(span);
  return parts.join(" - ");
}

function enrichTradesForTable(trades, asOfDate) {
  const chronological = [...trades].sort((a, b) =>
    a.entryDate.localeCompare(b.entryDate)
  );
  let runningTotal = 0;
  let compoundFactor = 1;
  let hasClosedTrade = false;
  const enriched = chronological.map((t) => {
    const tradePnl = t.open ? null : t.exitPrice - t.entryPrice;
    const tradePnlPct =
      t.open || !t.entryPrice ? null : (t.exitPrice / t.entryPrice - 1) * 100;
    const end = t.open ? asOfDate : t.exitDate;
    const daysInTrade =
      t.entryDate && end
        ? Math.max(
            0,
            Math.round(
              (new Date(`${end}T12:00:00`) - new Date(`${t.entryDate}T12:00:00`)) /
                86400000
            )
          )
        : null;
    if (tradePnl != null) {
      runningTotal += tradePnl;
      compoundFactor *= t.exitPrice / t.entryPrice;
      hasClosedTrade = true;
    }
    const runningTotalPct = hasClosedTrade ? (compoundFactor - 1) * 100 : null;
    return { ...t, tradePnl, tradePnlPct, daysInTrade, runningTotal, runningTotalPct };
  });
  return enriched.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

export default function App() {
  const [page, setPage] = useState("app");
  const [tab, setTab] = useState("home");
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [input, setInput] = useState(DEFAULT_SYMBOL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(loadDisclaimerAccepted);

  function acceptDisclaimer() {
    try {
      sessionStorage.setItem(DISCLAIMER_SESSION_KEY, "1");
    } catch {
      // ignore storage errors
    }
    setDisclaimerAccepted(true);
  }

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites].sort()));
  }, [favorites]);

  const isFavorite = favorites.has(symbol);

  function toggleFavorite() {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

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

  function onSelectFromScanner(sym) {
    setInput(sym);
    setPage("app");
    setTab("chart");
    load(sym);
  }

  function goHome() {
    setPage("app");
    setTab("home");
  }

  const series = payload?.data ?? [];
  const scan = payload?.scan ?? null;
  const { fast, slow } = useMemo(() => chartMaFromScan(scan), [scan]);
  const trades = scan?.trades ?? [];
  const markers = scan?.markers ?? [];

  const tradesDisplay = useMemo(() => {
    const asOfDate = series.length ? series[series.length - 1].date : null;
    return enrichTradesForTable(trades, asOfDate);
  }, [trades, series]);

  const runningPnlPctSeries = useMemo(
    () => runningPnlPctPoints(trades),
    [trades]
  );

  return (
    <>
      {!disclaimerAccepted ? (
        <DisclaimerDialog onAccept={acceptDisclaimer} />
      ) : (
    <div className="app-shell">
      <AppHeader
        page={page}
        onGoHome={goHome}
        onGoRules={() => setPage("rules")}
      />
      {page === "rules" ? (
        <TradingRules />
      ) : (
        <>
          <DashboardTabs tab={tab} onChange={setTab} />
          {tab === "home" ? (
            <UserDashboardTab
              onSelectSymbol={onSelectFromScanner}
              onGoRules={() => setPage("rules")}
            />
          ) : null}
          {tab === "signals" ? (
            <ScannerPanel
              activeSymbol={symbol}
              onSelectSymbol={onSelectFromScanner}
            />
          ) : null}
          {tab === "daily" ? (
            <DailySignals onSelectSymbol={onSelectFromScanner} />
          ) : null}
          {tab === "symbolchanges" ? <SymbolChangesTab /> : null}
          {tab === "chart" ? (
    <div className="app-layout">
      <aside className="sidebar">
        <h1 className="sidebar-title">Chart Settings</h1>
        {/* <p className="sidebar-sub">Stock chart</p> */}

        <div className="ma-legend" aria-label="Moving average legend">
          <div className="ma-legend-item">
            <span
              className="ma-legend-swatch"
              style={{ background: MA_FAST_COLOR }}
            />
            Fast SMA {fast}
          </div>
          <div className="ma-legend-item">
            <span
              className="ma-legend-swatch"
              style={{ background: MA_SLOW_COLOR }}
            />
            Slow SMA {slow}
          </div>
        </div>

        <form className="sidebar-form" onSubmit={onSubmit}>
          <label className="sidebar-field">
            <div className="sidebar-field-label">
              <span>Symbol</span>
              <button
                type="button"
                className={`sidebar-favorite-btn${isFavorite ? " is-favorite" : ""}`}
                onClick={toggleFavorite}
                title="Favorite"
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isFavorite}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>
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

        <div className="ma-controls" aria-label="Analyze scan">
        <div className="ma-controls-title">From analyze-symbols</div>
        {scan ? (
          <>
            <p className="sidebar-scan-row">
              Running P/L %:{" "}
              {scan.runningTotalPct == null
                ? "n/a"
                : formatPct(scan.runningTotalPct)}
            </p>
            <p className="sidebar-scan-row">
              MA pair: {scan.optFast}/{scan.optSlow} SMA
            </p>
            <p className="sidebar-scan-row">
              Signal: {scan.lastSignal}
              {scan.signalDate ? ` @ ${scan.signalDate}` : ""}
            </p>
          </>
        ) : (
          <p className="sidebar-scan-row sidebar-scan-missing">
            No scan data — run <code>npm run analyze-symbols</code> for this
            symbol.
          </p>
        )}
        </div>

        <div className="sidebar-trades-help" aria-label="Opens and closes column definitions">
          <p className="sidebar-trades-help-title">Opens &amp; closes</p>
          <dl>
            <dt>P/L</dt>
            <dd>Close price minus open price.</dd>
            <dt>P/L%</dt>
            <dd>(close ÷ open − 1) × 100.</dd>
            <dt>DiT - Days in Trade</dt>
            <dd>Calendar days from open to close; open trades use the latest chart date.</dd>
            <dt>Running P/L</dt>
            <dd>Sum of P/L from closed trades up to that row.</dd>
            <dt>Running P/L %</dt>
            <dd>Compounded return from those closed trades: multiply (close ÷ open) for each, then − 1, × 100.</dd>
          </dl>
        </div>
      </aside>

      <main className="main-content">
        {payload ? (
          <>
            <div className="meta">
              {formatChartMeta(
                payload.companyName,
                symbol,
                payload.fromDate,
                payload.toDate
              )}
            </div>
          <div className="panel">
            {series.length ? (
              <>
                <CandlestickChart
                  data={series}
                  markers={markers}
                  fastPeriod={fast}
                  slowPeriod={slow}
                  maType="sma"
                />
              </>
            ) : (
              <p>No rows returned.</p>
            )}
          </div>

          {series.length && trades.length ? (
            <details className="expand-panel">
              <summary>Running P/L %</summary>
              <div className="expand-body">
                <RunningPnlChart points={runningPnlPctSeries} />
              </div>
            </details>
          ) : null}

          {series.length && trades.length ? (
            <details className="expand-panel">
              <summary>
                Opens &amp; closes ({trades.filter((t) => !t.open).length}
                {trades.some((t) => t.open) ? ", 1 still open" : ""})
              </summary>
              <div className="expand-body">
                <table className="trades-table">
                  <thead>
                    <tr>
                      <th>Open</th>
                      <th>Open price</th>
                      <th>Close</th>
                      <th>Close price</th>
                      <th className="trades-col-num">DiT</th>
                      <th className="trades-col-num">P/L</th>
                      <th className="trades-col-num">P/L%</th>
                      <th className="trades-col-num">Running P/L</th>
                      <th className="trades-col-num">Running P/L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradesDisplay.map((t, i) => (
                      <tr key={`${t.entryDate}-${i}`}>
                        <td>{t.entryDate}</td>
                        <td>{t.entryPrice.toFixed(2)}</td>
                        <td>{t.open ? "—" : t.exitDate}</td>
                        <td>{t.open ? "—" : t.exitPrice.toFixed(2)}</td>
                        <td className="trades-col-num">
                          {t.daysInTrade == null ? "—" : t.daysInTrade}
                        </td>
                        <td className="trades-col-num">
                          {t.tradePnl == null ? "—" : formatPnl(t.tradePnl)}
                        </td>
                        <td className="trades-col-num">
                          {t.tradePnlPct == null ? "—" : formatPct(t.tradePnlPct)}
                        </td>
                        <td className="trades-col-num">
                          {formatPnl(t.runningTotal)}
                        </td>
                        <td className="trades-col-num">
                          {t.runningTotalPct == null ? "—" : formatPct(t.runningTotalPct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}
        </>
        ) : null}
      </main>
    </div>
          ) : null}
        </>
      )}
    </div>
      )}
    </>
  );
}
