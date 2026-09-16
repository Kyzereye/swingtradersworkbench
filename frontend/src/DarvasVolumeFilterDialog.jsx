import { useEffect } from "react";

export default function DarvasVolumeFilterDialog({ open, onClose }) {
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
        aria-labelledby="darvas-vol-filter-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="darvas-vol-filter-title" className="app-dialog-title">
              Volume filter
            </h2>
            <p className="app-dialog-subtitle">How the volume check works</p>
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
            <h3 className="ma-problems-heading">Vol avg period</h3>
            <p className="ma-problems-text">
              Number of prior sessions used to compute an average volume.
              The breakout day itself is not included. Default is 50.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Vol multiple</h3>
            <p className="ma-problems-text">
              On a breakout day, volume must be at least this many times the
              prior average. Default is 1.5 (50% above the recent average).
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Example</h3>
            <p className="ma-problems-text">
              With period 5 and multiple 1.5: average the last 5 days’ volume. If
              that average is 50,000, the breakout day needs volume of at least
              75,000 to take the long entry. Rejected breakouts still clear the
              box. This filter is sidebar-only and is not searched by
              optimize/scan yet.
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
