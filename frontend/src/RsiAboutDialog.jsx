import { useEffect } from "react";

/**
 * About dialog for the RSI mean reversion system.
 */
export default function RsiAboutDialog({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="app-dialog-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="app-dialog ma-problems-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rsi-about-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="rsi-about-title" className="app-dialog-title">
              RSI mean reversion
            </h2>
            <p className="app-dialog-subtitle">How this system works</p>
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
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Core idea</h3>
            <p className="ma-problems-text">
              An RSI mean reversion strategy with failure swings seeks to catch
              trend reversals when price reaches extreme overbought (above 70)
              or oversold (below 30) levels. Defined by RSI creator J. Welles
              Wilder, a failure swing occurs when the RSI enters an extreme
              zone, pulls back, retests without making a new RSI extreme, and
              then breaks its previous swing high or low—confirming momentum
              exhaustion independent of price action.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">In this app</h3>
            <p className="ma-problems-text">
              Long only. Entry when RSI crosses up through the oversold level
              on the daily close; exit when RSI crosses up through the
              overbought level. Fills are at the next bar&apos;s open. Period
              and levels can be optimized per symbol; Load applies the scanned
              values when available. The chart shows price candles above and
              the RSI pane (with oversold / overbought lines) below.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Improving reliability</h3>
            <p className="ma-problems-text">
              Combining RSI failure swings with higher-timeframe trend filters
              (like a 200-day moving average) or key support/resistance zones
              significantly increases signal reliability by preventing entries
              against strong prevailing trends.
            </p>
          </section>
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
