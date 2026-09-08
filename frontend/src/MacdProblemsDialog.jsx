import { useEffect } from "react";

const INTRO =
  "MACD (Moving Average Convergence Divergence) combines trend and momentum into one tool. In this app it trades signal-line crosses on daily bars—clear rules, but the same lag and chop that affect other MA-based systems.";

const PROS = [
  {
    title: "Combines Trend and Momentum",
    body:
      "Integrates trend direction and momentum into a single visual tool, making it easy to gauge market strength.",
  },
  {
    title: "Clear Action Signals",
    body:
      "Crossovers between the MACD line and its signal line (typically a 9-period EMA) provide objective, easy-to-read entry and exit triggers.",
  },
  {
    title: "Highlights Trend Reversals",
    body:
      "Divergence between price movement and the MACD line often signals weakening momentum before a potential trend reversal occurs.",
  },
  {
    title: "Versatile Application",
    body:
      "Works across various timeframes—from intraday charts to weekly views—on liquid equities.",
  },
];

const CONS = [
  {
    title: "Lagging Indicator",
    body:
      "Built on historical moving averages, MACD reacts to price changes rather than predicting them, which can cause late entries or exits in fast-moving markets.",
  },
  {
    title: "Prone to Whipsaws",
    body:
      "In choppy or sideways markets, the MACD line frequently crosses the signal line back and forth, generating false signals and unprofitable trades.",
  },
  {
    title: "Divergence Timing Risk",
    body:
      "A divergence can persist for a long time while price continues in the original direction, leading traders to enter reversal trades too early.",
  },
  {
    title: "Requires Context",
    body:
      "Does not indicate absolute overbought or oversold conditions, meaning signals need secondary confirmation from key support/resistance levels or volume.",
  },
];

/** Pros & cons dialog for the MACD system. */
export default function MacdProblemsDialog({ open, onClose }) {
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
        aria-labelledby="macd-pros-cons-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="macd-pros-cons-title" className="app-dialog-title">
              Pros &amp; cons of MACD
            </h2>
            <p className="app-dialog-subtitle">
              What the signal-line cross system does well — and where it
              struggles
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
