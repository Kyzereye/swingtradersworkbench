import { useEffect } from "react";

/**
 * About dialog for Triple Moving Average Alignment.
 */
export default function TripleMaAboutDialog({ open, onClose }) {
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
        aria-labelledby="triple-ma-about-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="triple-ma-about-title" className="app-dialog-title">
              Triple Moving Average Alignment
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
              Uses three moving averages (fast, medium, and slow) to judge the
              market regime. A classic example stack is about 10 / 20 / 50.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Long only when fully stacked</h3>
            <p className="ma-problems-text">
              Enter long only when the fast MA is above the medium, and the
              medium is above the slow — a full bullish stack. No long entry
              without that alignment.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">In this app</h3>
            <p className="ma-problems-text">
              The stack is checked on each daily close. When alignment turns
              on, the entry fills at the next bar&apos;s open; when alignment
              breaks, it exits at the next open. Periods can be optimized per
              symbol; Load applies the scanned fast / medium / slow when
              available.
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
