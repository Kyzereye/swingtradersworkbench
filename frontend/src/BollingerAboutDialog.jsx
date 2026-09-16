import { useEffect } from "react";

export default function BollingerAboutDialog({ open, onClose }) {
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
        aria-labelledby="bollinger-about-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="bollinger-about-title" className="app-dialog-title">
              Bollinger Band Squeeze &amp; Reversion
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
              Bollinger Bands are an SMA of price plus and minus a multiple of
              the standard deviation. A squeeze occurs when those bands sit
              inside a Keltner Channel (ATR envelope)—volatility contraction.
              The system looks for a breakout from that squeeze, then exits as
              price reverts toward the middle band.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">In this app</h3>
            <p className="ma-problems-text">
              Long only. Entry when the prior bar was in a squeeze and today
              closes above the upper Bollinger band; exit when the close falls
              below the middle SMA. Fills are at the next bar&apos;s open.
              Defaults are period 20, std mult 2, ATR 10, ATR mult 1.5. Load
              applies scanned values when available.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Volume tip</h3>
            <p className="ma-problems-text">
              Squeeze breakouts on rising volume are generally more credible
              than quiet pierces of the upper band.
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
