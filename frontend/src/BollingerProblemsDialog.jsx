import { useEffect } from "react";

const INTRO =
  "Bollinger squeeze systems wait for volatility to contract (bands inside a Keltner Channel), then enter on the breakout and exit toward the middle band. Clear and mechanical, but choppy markets still produce failed breakouts.";

const PROS = [
  {
    title: "Volatility timing",
    body:
      "The squeeze filter waits for compression before taking a breakout, reducing entries in already-expanded volatility.",
  },
  {
    title: "Objective bands",
    body:
      "SMA ± stdev and Keltner comparison are fully rule-based—easy to scan and backtest.",
  },
  {
    title: "Built-in mean target",
    body:
      "Exiting at the middle band matches the “reversion” side of the system without inventing a separate target.",
  },
  {
    title: "Daily-bar friendly",
    body:
      "Needs only OHLC. ATR for the squeeze compare is already available in this app.",
  },
];

const CONS = [
  {
    title: "Failed breakouts",
    body:
      "Price can pierce the upper band after a squeeze and reverse immediately, especially in ranges.",
  },
  {
    title: "Late to the move",
    body:
      "Waiting for squeeze then an upper-band close means part of the expansion may already be gone.",
  },
  {
    title: "Parameter sensitivity",
    body:
      "Period, std mult, and Keltner ATR mult change how often squeeze fires. Optimization can overfit quiet vs wild regimes.",
  },
  {
    title: "Long-only truncation",
    body:
      "Classic squeeze packs work both directions; this app only takes upside breakouts.",
  },
];

export default function BollingerProblemsDialog({ open, onClose }) {
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
        aria-labelledby="bollinger-pros-cons-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="bollinger-pros-cons-title" className="app-dialog-title">
              Pros &amp; cons of Bollinger squeeze
            </h2>
            <p className="app-dialog-subtitle">
              What squeeze breakouts do well — and where they struggle
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
