import { useEffect } from "react";

/**
 * About dialog for Donchian / Turtle-style breakout.
 */
export default function DonchianAboutDialog({ open, onClose }) {
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
        aria-labelledby="donchian-about-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="donchian-about-title" className="app-dialog-title">
              Donchian Breakout (Turtle)
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
              Donchian channels mark the highest high and lowest low over a
              lookback. Richard Dennis and William Eckhardt used this style of
              breakout in the Turtle Traders experiment: buy strength when
              price clears an N-day high; exit when it breaks an M-day low.
              Classic Turtle entry windows were often 20 or 55 days, with a
              shorter exit channel.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">In this app</h3>
            <p className="ma-problems-text">
              Long only. Entry when price penetrates the prior entry-period
              high (bar high above the channel); exit when price penetrates
              the prior exit-period low. Fills are at the next bar&apos;s
              open. Defaults are 20 / 10. Periods can be optimized per
              symbol; Load applies scanned values when available. Full Turtle
              money management (ATR sizing, pyramids) is not included.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Volume tip</h3>
            <p className="ma-problems-text">
              Breakouts of the upper channel on above-average volume are
              generally more reliable than quiet breakouts—volume is an
              optional filter, not part of the core rules here.
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
