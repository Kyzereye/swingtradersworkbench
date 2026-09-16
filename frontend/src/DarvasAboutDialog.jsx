import { useEffect } from "react";

export default function DarvasAboutDialog({ open, onClose }) {
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
        aria-labelledby="darvas-about-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="darvas-about-title" className="app-dialog-title">
              Darvas Box
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
              Nicolas Darvas followed momentum with “boxes”: after a strong high,
              price consolidates between a ceiling and a floor; a break above
              the ceiling is the buy, and a break below the floor is the exit.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">In this app (recipe A + trail)</h3>
            <p className="ma-problems-text">
              Long only. When price makes an N-day high, wait a fixed number of
              build days. Box top = that high; box bottom = lowest low during
              the build. Entry when the close breaks above the top; initial stop
              is that box’s floor. While long, new armed boxes raise the stop to
              the new floor (never lower). Exit when the close breaks below the
              current trailed floor. Fills at the next open. Defaults are
              lookback 55 and build 3. Load applies scanned lookback / box build
              when available.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">MA trend filter</h3>
            <p className="ma-problems-text">
              Optional (sidebar checkbox only). When on, the chart shows an SMA
              or EMA (default 200). Long entries are taken only if the whole box
              sits above the MA (box floor &gt; MA). Optimize/scan still searches
              MA settings for scoring; Load and list clicks do not change this
              toggle.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Volume filter</h3>
            <p className="ma-problems-text">
              Optional (sidebar). When on, the breakout day must print volume at
              least a multiple of the average of the prior N days (defaults 50
              and 1.5×). Rejected breaks still end the box. Not in optimize/scan
              yet.
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
