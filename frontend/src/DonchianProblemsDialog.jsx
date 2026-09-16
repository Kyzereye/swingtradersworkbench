import { useEffect } from "react";

const INTRO =
  "Donchian / Turtle-style breakouts buy strength when price clears an N-day high and exit on an M-day low break. The rules are simple and catch large trends, but they struggle in choppy, range-bound markets.";

const PROS = [
  {
    title: "Rule clarity",
    body:
      "Highest-high / lowest-low breaks are objective and easy to code, scan, and audit—no indicator divergence or discretionary levels.",
  },
  {
    title: "Catches major trends",
    body:
      "Designed to stay with multi-week and multi-month moves after a range expansion, which is where trend systems earn their keep.",
  },
  {
    title: "Built-in exit structure",
    body:
      "A shorter exit channel (Turtle-style) can cut losers or lock trend progress without inventing a separate stop formula.",
  },
  {
    title: "Works on daily bars",
    body:
      "Pure price channels—no intraday data required. Fits end-of-day swing workflows.",
  },
];

const CONS = [
  {
    title: "Whipsaws in ranges",
    body:
      "Sideways markets produce repeated breakouts that fail, generating a string of small declines before a real trend appears.",
  },
  {
    title: "Late entries and exits",
    body:
      "By definition you buy after the high is broken and sell after the low is broken, so you give up the edges of the move.",
  },
  {
    title: "No regime filter",
    body:
      "The raw system does not know bull vs bear or high vs low volatility; it will take breakouts in poor environments unless you add filters.",
  },
  {
    title: "Parameter sensitivity",
    body:
      "20/10 vs 55/20 changes signal frequency and drawdowns. Heavy optimization on past data can overfit quiet or trending history.",
  },
];

/** Pros & cons dialog for Donchian breakout. */
export default function DonchianProblemsDialog({ open, onClose }) {
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
        aria-labelledby="donchian-pros-cons-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="donchian-pros-cons-title" className="app-dialog-title">
              Pros &amp; cons of Donchian breakout
            </h2>
            <p className="app-dialog-subtitle">
              What Turtle-style channels do well — and where they struggle
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
