import { useEffect } from "react";

const INTRO =
  "Fibonacci retracement/extension systems buy a pullback to a ratio of the most recent swing leg and target a projected extension above the swing high. The ratios are widely watched, but the leg definition and level choice carry real discretion even when coded as fixed rules.";

const PROS = [
  {
    title: "Objective framework for entries and exits",
    body:
      "Instead of guessing where a stock might find support during a dip or stall during a rally, Fibonacci levels give mathematically derived reference points for setting limit orders, stop-losses, and profit targets.",
  },
  {
    title: "High confluence with other indicators",
    body:
      "Fibs work exceptionally well when layered with other technical tools. If a key retracement level (like the 61.8% \"Golden Ratio\") aligns with a 50-day moving average, a prior breakout level, or a volume node, the probability of a market reaction increases significantly.",
  },
  {
    title: "Reflects market psychology and self-fulfilling dynamics",
    body:
      "Because a massive number of retail participants, algorithmic systems, and institutional desks monitor standard Fibonacci ratios (e.g., 38.2%, 50%, 61.8% for retracements; 127.2%, 161.8% for extensions), orders tend to cluster around these zones, acting as a magnet or psychological pivot.",
  },
  {
    title: "Multi-timeframe and multi-asset versatility",
    body:
      "The system can be applied across any liquid market (stocks, futures, crypto, forex) and on any timeframe — though it tends to be cleaner and more reliable on daily or swing timeframes where swing highs and lows are less prone to intraday noise.",
  },
  {
    title: "Ease of implementation",
    body:
      "Virtually every modern charting platform includes built-in Fibonacci drawing tools that auto-calculate the ratios once you anchor the swing low and swing high (or vice versa).",
  },
];

const CONS = [
  {
    title: "Not predictive on their own",
    body:
      "Fibonacci levels are not magic reversal points; they highlight potential zones of interest, not certainties. In a strong momentum or trend-acceleration phase, price can easily slice through the 61.8% retracement or the 161.8% extension without blinking.",
  },
  {
    title: "Subjectivity in anchoring swings",
    body:
      "Where you place your anchor points matters completely. Should you anchor to the wick or the candle body? Is that minor wiggle a valid swing high or just noise? Different analysts anchor differently, resulting in divergent projections.",
  },
  {
    title: "Ineffective in choppy or range-bound markets",
    body:
      "Fibonacci tools require a clear directional impulse leg to measure. In a sideways, choppy, or non-trending market, drawing Fibonacci grids produces a tangle of arbitrary lines that generate false breakout and reversal signals.",
  },
  {
    title: "Risk of analysis paralysis and over-reliance",
    body:
      "Relying too heavily on Fibonacci lines without supporting context — such as overall market trend, relative strength, volume profile, or fundamental catalysts — can lead to catching falling knives or scaling out of positive swing moves too early.",
  },
];

const TIPS = [
  "Retracements (23.6%, 38.2%, 50%, 61.8%) are best used to time pullbacks with the trend for entries.",
  "Extensions (127.2%, 161.8%, 261.8%) are best used to map scale-out zones or profit targets once price breaks past a prior swing high or low.",
  "Always pair them with confirmation signals (such as candlestick rejection patterns, volume dry-ups on pullbacks, or momentum divergence on the RSI) rather than acting on the line blindly.",
];

export default function FibonacciProblemsDialog({ open, onClose }) {
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
        aria-labelledby="fibonacci-pros-cons-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="fibonacci-pros-cons-title" className="app-dialog-title">
              Pros &amp; cons of Fibonacci retracement/extension
            </h2>
            <p className="app-dialog-subtitle">
              What ratio-based pullback entries do well — and where they
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

          <h3 className="ma-pros-cons-group">Summary strategy tips</h3>
          <section className="ma-problems-section">
            {TIPS.map((tip) => (
              <p key={tip} className="ma-problems-text">
                {tip}
              </p>
            ))}
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
