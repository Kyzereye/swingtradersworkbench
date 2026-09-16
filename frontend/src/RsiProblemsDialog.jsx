import { useEffect } from "react";

const INTRO =
  "An RSI mean reversion strategy with failure swings seeks to catch trend reversals at extreme overbought or oversold levels. Failure swings add structural confirmation on the RSI line itself—useful for filtering, but still vulnerable in strong trends and fast V-shaped turns.";

const PROS = [
  {
    title: "Structural Confirmation",
    body:
      "Unlike basic overbought/oversold levels, failure swings require an explicit swing break before triggering an entry, filtering out premature entries.",
  },
  {
    title: "Early Reversal Signals",
    body:
      "Pinpoints momentum shifts at market extremes, allowing tight stops to be set and achieve favorable risk-to-reward ratios.",
  },
  {
    title: "Price-Independent Trigger",
    body:
      "Relying on the structural highs and lows of the RSI line itself can reveal hidden momentum failure before it shows up on the price chart.",
  },
  {
    title: "Rule-Based Clarity",
    body:
      "Provides clear, objective rules for entry and stop-loss placement, removing subjective guesswork during market swings.",
  },
];

const CONS = [
  {
    title: "Risk in Strong Trends",
    body:
      "Mean reversion strategies struggle during strong, runaway trends where price continuously moves in one direction while RSI stays pinned at extreme levels.",
  },
  {
    title: "Execution Lag in Fast Reversals",
    body:
      "Waiting for the RSI line to break its prior swing peak or trough can delay entries, missing sharp V-shaped turnarounds.",
  },
  {
    title: "Static Threshold Limitations",
    body:
      "Standard 70/30 bounds are often too strict in strong bull markets (where RSI rarely drops below 40) or strong bear markets (where RSI rarely exceeds 60).",
  },
  {
    title: "Requires Secondary Context",
    body:
      "Signals frequently fail near range breakouts unless validated by key price support/resistance zones, moving averages, or volume metrics.",
  },
];

/** Pros & cons dialog for the RSI system. */
export default function RsiProblemsDialog({ open, onClose }) {
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
        aria-labelledby="rsi-pros-cons-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="rsi-pros-cons-title" className="app-dialog-title">
              Pros &amp; cons of RSI mean reversion
            </h2>
            <p className="app-dialog-subtitle">
              What failure-swing style RSI setups do well — and where they
              struggle
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
