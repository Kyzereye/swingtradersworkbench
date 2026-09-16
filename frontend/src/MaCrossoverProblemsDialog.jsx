import { useEffect } from "react";

const PROBLEMS = [
  {
    title: "The Lag Penalty",
    body:
      "Moving averages are inherently backward-looking. By the time a short-term MA crosses a long-term MA, the most lucrative portion of the trend has usually already happened. You end up buying late into the rally and selling late into the dip, leaving the best margins on the table.",
  },
  {
    title: "The Whipsaw Effect",
    body:
      "Markets typically exhibit strong directional trends only about 30% of the time. The other 70% of the time, they consolidate or chop sideways. If you run a crossover strategy in a ranging market, you will get relentless false signals. The strategy will force you to buy high and sell low repeatedly, bleeding your account dry through a thousand paper cuts.",
  },
  {
    title: "The Overfitting Trap",
    body:
      'When you run backtests to "optimize" MA pairs—say, discovering that a 13-period and 39-period cross yielded massive returns over the last five years—you are usually just curve-fitting to past noise. The market is highly dynamic. The specific volatility and regime that made those parameters work perfectly will shift, and yesterday\'s optimized holy grail becomes tomorrow\'s failing system.',
  },
  {
    title: "Friction Costs",
    body:
      "Particularly with shorter-term optimized MAs, the strategy generates frequent signals. The constant entering and exiting racks up slippage, bid-ask spread costs, and short-term capital gains taxes, which easily destroy a marginal statistical edge.",
  },
];

const CLOSING =
  "None of this means moving averages are completely useless. Successful quantitative and algorithmic practitioners often use them as a broad directional filter rather than a trigger. For instance, they might only execute a separate, highly calibrated mean-reversion strategy if the broader market is above its 200-day MA.";

/**
 * Informational dialog: known limitations of MA crossover as a trading system.
 */
export default function MaCrossoverProblemsDialog({ open, onClose }) {
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
        aria-labelledby="ma-problems-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="ma-problems-title" className="app-dialog-title">
              Problems with MA crossovers 2
            </h2>
            <p className="app-dialog-subtitle">
              Why a classic fast/slow cross is a weak standalone stock strategy.
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
          {PROBLEMS.map((item) => (
            <section key={item.title} className="ma-problems-section">
              <h3 className="ma-problems-heading">{item.title}</h3>
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
