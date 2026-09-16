import { useEffect } from "react";

const INTRO =
  "The triple moving average (MA) alignment system—typically requiring a short, medium, and long-term average to stack sequentially (e.g., 20 > 50 > 200)—is a classic trend-following strategy. It can keep you on the right side of a mature trend, but its reliance on lagging data also creates clear weaknesses for end-of-day swing analysis.";

const PROS = [
  {
    title: "Algorithmic Objectivity",
    body:
      "The system relies on strict mathematical conditions rather than subjective chart interpretation. For an application scanning daily stock market data to generate end-of-day swing signals, the triple MA provides a clean, easily programmable boolean trigger—the averages are either perfectly stacked or they aren't.",
  },
  {
    title: "Multi-Timeframe Confirmation",
    body:
      "A single moving average crossover often falls victim to sudden, short-lived price spikes. Requiring a short, medium, and long-term average to align ensures that the immediate momentum agrees with the broader underlying trend before capital is deployed.",
  },
  {
    title: "Built-in exit management",
    body:
      "The layered averages create natural, dynamic support levels. An analyst can scale out of positions systematically—for example, taking partial profits when the short-term MA breaks down, and fully exiting only if the medium-term MA crosses the long-term line.",
  },
  {
    title: "Forced Patience",
    body:
      "By demanding full alignment before an entry, the system naturally restricts signal frequency. It acts as a structural filter that keeps capital on the sidelines during messy, consolidating, or highly volatile market conditions where the majority of false breakouts occur.",
  },
];

const CONS = [
  {
    title: "Severe Lag on Entry and Exit",
    body:
      "Moving averages are mathematically backward-looking. By the time the short, medium, and long-term averages fully align to generate a buy signal, the underlying stock has often already made a substantial upward move. Conversely, waiting for the alignment to completely break before triggering a sell signal usually means giving back a significant portion of your open profits.",
  },
  {
    title: "Whipsaws in Choppy Markets",
    body:
      "MAs excel in directional markets but fail aggressively during consolidation. When a stock moves sideways in a tight range, the averages compress and cross each other repeatedly. A mechanical triple MA system will trigger multiple false buy and sell signals during these periods, resulting in a string of small declines.",
  },
  {
    title: "The Risk-Reward Squeeze",
    body:
      "Because the entry signal is inherently delayed by waiting for all three lines to cross, the logical stop-loss level (often placed below the longest moving average or the most recent swing low) is usually quite far from your entry price. This requires taking on a wider initial risk, which degrades your overall risk-to-reward ratio.",
  },
  {
    title: "The Optimization Illusion (Curve Fitting)",
    body:
      "When building and backtesting a mechanical system, it is incredibly tempting to tweak the moving average lengths to make the historical buy/sell signals look perfect. However, heavily optimizing these parameters to fit past daily-bar data rarely translates to robust live-market performance, as market volatility and cycles constantly shift.",
  },
];

/**
 * Pros & cons dialog for Triple MA alignment.
 */
export default function TripleMaProblemsDialog({ open, onClose }) {
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
        aria-labelledby="triple-ma-pros-cons-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="triple-ma-pros-cons-title" className="app-dialog-title">
              Pros &amp; cons of Triple MA alignment
            </h2>
            <p className="app-dialog-subtitle">
              What the stacked three-MA system does well — and where it struggles
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
