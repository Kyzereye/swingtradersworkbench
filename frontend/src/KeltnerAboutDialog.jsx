import { useEffect } from "react";

export default function KeltnerAboutDialog({ open, onClose }) {
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
        aria-labelledby="keltner-about-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="keltner-about-title" className="app-dialog-title">
              Keltner Channel Trend
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
              Keltner Channels wrap an EMA with bands scaled by Average True
              Range (ATR). Unlike fixed-percent envelopes, the channel widens
              when volatility rises and tightens when it falls. A close above
              the upper band is treated as a volatility breakout in the
              direction of the trend.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">In this app</h3>
            <p className="ma-problems-text">
              Long only. Entry when the daily close is above the upper
              channel; exit when the close falls back below the middle EMA.
              Fills are at the next bar&apos;s open. Defaults are EMA 20, ATR
              10, multiplier 2. Periods and multiplier can be optimized per
              symbol; Load applies scanned values when available.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Volume tip</h3>
            <p className="ma-problems-text">
              Upper-band breakouts on above-average volume are generally more
              reliable than quiet pierces—volume is an optional filter, not
              part of the core rules here.
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
