import { useEffect } from "react";

export default function DarvasMaFilterDialog({ open, onClose }) {
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
        aria-labelledby="darvas-ma-filter-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="darvas-ma-filter-title" className="app-dialog-title">
              MA trend filter
            </h2>
            <p className="app-dialog-subtitle">How the MA check works</p>
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
            <h3 className="ma-problems-heading">Rule</h3>
            <p className="ma-problems-text">
              When on, long entries are taken only if the whole armed box sits
              above the moving average (box floor &gt; MA). The chart draws the
              MA when the filter is enabled. The defaults period is 200 and type is SMA.
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
