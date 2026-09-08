import { useEffect } from "react";

/**
 * About dialog for the MACD system.
 */
export default function MacdAboutDialog({ open, onClose }) {
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
        aria-labelledby="macd-about-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="macd-about-title" className="app-dialog-title">
              MACD system
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
              MACD (Moving Average Convergence Divergence) is the difference
              between a fast and a slow EMA of price. A signal line (EMA of
              MACD) smooths that difference. Classic defaults are 12 / 26 / 9.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Signal-line cross (long only)</h3>
            <p className="ma-problems-text">
              Enter long when the MACD line crosses above the signal line.
              Exit when MACD crosses back below the signal line. No short
              trades.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">In this app</h3>
            <p className="ma-problems-text">
              Crosses are checked on each daily close. When a cross fires, the
              trade opens or exits at the next bar&apos;s open. Fast / slow /
              signal periods can be optimized per symbol; Load applies the
              scanned values when available. The chart shows price candles
              above and the MACD pane (line, signal, and histogram) below.
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
