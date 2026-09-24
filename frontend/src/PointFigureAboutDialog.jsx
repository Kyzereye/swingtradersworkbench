import { useEffect } from "react";

export default function PointFigureAboutDialog({ open, onClose }) {
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
        aria-labelledby="point-figure-about-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="point-figure-about-title" className="app-dialog-title">
              Point &amp; figure
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
              Point &amp; figure charting ignores time and volume, plotting
              only price movement in box-sized increments. Rising columns of
              X&apos;s and falling columns of O&apos;s replace daily bars; a
              column only reverses direction after price moves a set number
              of boxes (the reversal) the other way. The result filters out
              noise below the box size, showing only meaningful moves.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">In this app</h3>
            <p className="ma-problems-text">
              Long only. Box size is a percentage of price (self-scaling — as
              price rises, so does the box size) and columns reverse after a
              fixed number of boxes, set by the reversal count. Entry: a new
              up (X) column trades above the top of the prior X column — a
              classic double top breakout. Exit: a new down (O) column
              trades below the bottom of the prior O column — a double
              bottom breakdown. Fills are at the next bar&apos;s open.
              Defaults are 1% box, 3-box reversal. Load applies scanned
              values when available.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Optimized numbers</h3>
            <p className="ma-problems-text">
              Box size (10 values from 0.5% to 5%) and reversal count (2, 3,
              or 4 boxes) are grid-searched together — 30 combinations per
              symbol. The one combination with the best full-history 1-share
              P/L is chosen and applied to every signal on that symbol&apos;s
              chart, not picked separately per signal. Load fills the
              sidebar with that symbol&apos;s optimized values when a scan
              row exists. This is a hindsight fit shown for information —
              not a recommendation.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Volume</h3>
            <p className="ma-problems-text">
              Volume is not used in this system at this time. This system is based purely on price action: box size and the reversal rule.
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
