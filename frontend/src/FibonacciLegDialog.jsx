import { useEffect } from "react";
import {
  retracementPrice,
  extensionPrice,
  RETRACEMENT_RATIOS,
  EXTENSION_RATIOS,
  OUTCOME_LABEL,
} from "./fibonacci.js";
import FibonacciLegMiniChart from "./FibonacciLegMiniChart.jsx";

function formatPrice(v) {
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "—";
}

function formatPnl(entry, exit) {
  if (!Number.isFinite(entry) || !Number.isFinite(exit)) return null;
  const pl = exit - entry;
  const sign = pl > 0 ? "+" : "";
  return `${sign}${pl.toFixed(2)}`;
}

/**
 * leg: { lowTime, lowPrice, highTime, highPrice, trade?: { entryDate,
 * entryPrice, exitDate?, exitPrice?, open? } }
 * bars: full bar array the leg indexes into (for the mini chart).
 */
export default function FibonacciLegDialog({
  open,
  onClose,
  leg,
  bars = [],
  swingN = 10,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !leg) return null;

  const trade = leg.trade;
  const pnl = trade ? formatPnl(trade.entryPrice, trade.exitPrice) : null;

  return (
    <div
      className="app-dialog-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="app-dialog fib-leg-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fibonacci-leg-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="fibonacci-leg-title" className="app-dialog-title">
              Fibonacci leg
              <span className={`fib-leg-badge fib-leg-badge-${leg.outcome}`}>
                {OUTCOME_LABEL[leg.outcome] ?? OUTCOME_LABEL.none}
              </span>
            </h2>
            <p className="app-dialog-subtitle">
              {leg.lowTime} → {leg.highTime}
            </p>
          </div>
          <button
            type="button"
            className="app-dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="app-dialog-body ma-problems-body">
          {bars.length ? (
            <FibonacciLegMiniChart bars={bars} leg={leg} swingN={swingN} />
          ) : null}

          <div className="fib-leg-body">
            <div className="fib-leg-main ma-problems-body">
              <section className="ma-problems-section">
                <h3 className="ma-problems-heading">Swing points</h3>
                <p className="ma-problems-text">
                  Swing low: {formatPrice(leg.lowPrice)} on {leg.lowTime}
                  <br />
                  Swing high: {formatPrice(leg.highPrice)} on {leg.highTime}
                </p>
              </section>

              <section className="ma-problems-section">
                <h3 className="ma-problems-heading">Entry &amp; exit</h3>
                {trade ? (
                  <p className="ma-problems-text">
                    Entry: {formatPrice(trade.entryPrice)} on {trade.entryDate}
                    <br />
                    {trade.open
                      ? "Still active"
                      : `Exit: ${formatPrice(trade.exitPrice)} on ${trade.exitDate}`}
                    {pnl ? (
                      <>
                        <br />
                        P/L: {pnl}
                      </>
                    ) : null}
                  </p>
                ) : (
                  <p className="ma-problems-text">No signal from this leg.</p>
                )}
              </section>
            </div>

            <aside className="fib-leg-side ma-problems-body">
              <section className="ma-problems-section">
                <h3 className="ma-problems-heading">Retracement levels</h3>
                <p className="ma-problems-text">
                  {RETRACEMENT_RATIOS.map((r) => (
                    <span key={r}>
                      {(r * 100).toFixed(1)}%:{" "}
                      {formatPrice(retracementPrice(leg, r))}
                      <br />
                    </span>
                  ))}
                </p>
              </section>

              <section className="ma-problems-section">
                <h3 className="ma-problems-heading">Extension targets</h3>
                <p className="ma-problems-text">
                  {EXTENSION_RATIOS.map((r) => (
                    <span key={r}>
                      {(r * 100).toFixed(1)}%:{" "}
                      {formatPrice(extensionPrice(leg, r))}
                      <br />
                    </span>
                  ))}
                </p>
              </section>
            </aside>
          </div>
        </div>

        <footer className="app-dialog-footer">
          <span />
          <button
            type="button"
            className="app-dialog-primary"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
