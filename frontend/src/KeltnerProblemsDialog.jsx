import { useEffect } from "react";

const INTRO =
  "Keltner Channel trend systems buy strength when price closes above an ATR-based upper band and exit when price falls back through the middle EMA. They adapt to volatility, but still suffer in chop and late breakouts.";

const PROS = [
  {
    title: "Volatility-aware bands",
    body:
      "ATR scaling widens the channel in wild markets and tightens it in quiet ones, so breakouts require a move that fits current volatility.",
  },
  {
    title: "Clear trend trigger",
    body:
      "A close above the upper band is an objective breakout signal—easy to code, scan, and audit.",
  },
  {
    title: "Built-in trail via the mid",
    body:
      "Exiting on a close back below the middle EMA gives a natural trailing structure without inventing a separate stop formula.",
  },
  {
    title: "Works on daily bars",
    body:
      "EMA + ATR need only OHLC. No intraday data required.",
  },
];

const CONS = [
  {
    title: "Whipsaws in ranges",
    body:
      "Sideways markets produce repeated band pierces that fail, stacking small declines before a real trend.",
  },
  {
    title: "Late entries",
    body:
      "Waiting for a close above the upper band means you buy after the move has already expanded—classic trend lag.",
  },
  {
    title: "Parameter sensitivity",
    body:
      "EMA length, ATR length, and multiplier change how often signals fire. Heavy optimization can overfit past volatility regimes.",
  },
  {
    title: "No regime filter",
    body:
      "The raw system takes every upper-band close, including weak environments, unless you add trend or volume filters.",
  },
];

export default function KeltnerProblemsDialog({ open, onClose }) {
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
        aria-labelledby="keltner-pros-cons-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="keltner-pros-cons-title" className="app-dialog-title">
              Pros &amp; cons of Keltner Channel trend
            </h2>
            <p className="app-dialog-subtitle">
              What ATR envelopes do well — and where they struggle
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
