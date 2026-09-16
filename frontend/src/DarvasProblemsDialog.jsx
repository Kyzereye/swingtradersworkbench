import { useEffect } from "react";

const INTRO =
  "Darvas boxes turn a post-high consolidation into a breakout entry: buy strength through the top, stop at that floor, then trail the exit up as higher boxes arm. Simple once the rules are fixed, but boxes fail often in chop.";

const PROS = [
  {
    title: "Momentum focus",
    body:
      "Only arms after an N-day high, so setups start from strength rather than random ranges.",
  },
  {
    title: "Clear risk line",
    body:
      "Entry risk is the breakout box floor; winners can trail up as later boxes arm.",
  },
  {
    title: "Mechanical recipe",
    body:
      "Fixed build days after the high keep the system programmable and scannable.",
  },
  {
    title: "Daily bars",
    body:
      "Needs only OHLC—no intraday data.",
  },
];

const CONS = [
  {
    title: "Failed breakouts",
    body:
      "Price can pierce the box top and reverse back through the floor quickly.",
  },
  {
    title: "Parameter sensitivity",
    body:
      "Lookback and build length change how often boxes arm. Optimization can overfit.",
  },
  {
    title: "Late entries",
    body:
      "Waiting for the high, then build days, then a close above the top means part of the move may already be gone.",
  },
  {
    title: "Volume filter is manual",
    body:
      "Optional volume confirmation (breakout vs recent average) is in the sidebar only; nightly optimize does not search it yet.",
  },
];

export default function DarvasProblemsDialog({ open, onClose }) {
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
        aria-labelledby="darvas-pros-cons-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="darvas-pros-cons-title" className="app-dialog-title">
              Pros &amp; cons of Darvas Box
            </h2>
            <p className="app-dialog-subtitle">
              What box breakouts do well — and where they struggle
            </p>
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
          <p className="ma-problems-text">{INTRO}</p>

          <h3 className="ma-pros-cons-group">The good</h3>
          {PROS.map((item) => (
            <section key={item.title} className="ma-problems-section">
              <h4 className="ma-problems-heading">{item.title}</h4>
              <p className="ma-problems-text">{item.body}</p>
            </section>
          ))}

          <h3 className="ma-pros-cons-group ma-pros-cons-group-bad">
            The not so good
          </h3>
          {CONS.map((item) => (
            <section key={item.title} className="ma-problems-section">
              <h4 className="ma-problems-heading">{item.title}</h4>
              <p className="ma-problems-text">{item.body}</p>
            </section>
          ))}
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
