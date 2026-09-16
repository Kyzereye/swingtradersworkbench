import { useEffect } from "react";

export default function DarvasSettingsDialog({ open, onClose }) {
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
        aria-labelledby="darvas-settings-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="darvas-settings-title" className="app-dialog-title">
              Darvas settings
            </h2>
            <p className="app-dialog-subtitle">What these numbers mean</p>
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
            <h3 className="ma-problems-heading">High lookback</h3>
            <p className="ma-problems-text">
              How many prior days define an N-day high that starts a box.
              Default is 55. Load applies the scanned lookback when available.
            </p>
          </section>
          <section className="ma-problems-section">
            <h3 className="ma-problems-heading">Box build days</h3>
            <p className="ma-problems-text">
              After that high, wait this many days to set the box floor (lowest
              low in the build). Then the box arms. Default is 3. Load applies
              the scanned build when available.
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
