import { useEffect } from "react";

const INTRO =
  "Point & figure charting ignores time and volume, plotting only price movement in box-sized increments. Rising columns of X's and falling columns of O's filter out noise and show only meaningful moves, making trend changes and reversals easy to spot.";

const PROS = [
  {
    title: "Filters out market noise",
    body:
      "Because P&F charts ignore minor day-to-day fluctuations and lateral chop, they successfully filter out short-term market noise and allow focus on meaningful trend movements.",
  },
  {
    title: "Clear support and resistance levels",
    body:
      "The grid-like structure makes it exceptionally easy to spot horizontal bands of support and resistance, breakout points, and classic formations like double tops and triple bottoms.",
  },
  {
    title: "Objective, rule-based analysis",
    body:
      "Drawing trendlines and generating entry or exit signals follow strict mechanical rules. This removes much of the subjective guesswork and emotional bias often found in interpreting traditional candlestick or bar charts.",
  },
  {
    title: "Event-driven and compact",
    body:
      "Because time is excluded, quiet periods of consolidation do not stretch out the chart horizontally. The chart only updates when significant price actions or reversals occur, making historical data dense and easy to review at a glance.",
  },
  {
    title: "Effective long-term price targets",
    body:
      "P&F charts allow calculation of mathematical price objectives based on the horizontal width of accumulation or distribution zones, helping forecast how far a breakout might travel.",
  },
];

const CONS = [
  {
    title: "Absence of time dimension",
    body:
      "By completely removing time, P&F charts hide how long a consolidation phase lasted or the speed at which a move unfolded. You cannot see intraday progression, and macro developments can lose their chronological context.",
  },
  {
    title: "Lacks volume and gap data",
    body:
      "Traditional P&F charts do not display trading volume or overnight gaps (such as earnings announcements or weekend news gaps), meaning critical clues about institutional participation or sudden shifts in sentiment can be missed.",
  },
  {
    title: "Parameter sensitivity",
    body:
      "The appearance and signals of a P&F chart change dramatically depending on the chosen box size and reversal amount. If settings are poorly calibrated for a specific stock's volatility, you may experience frequent false signals or delayed entries.",
  },
  {
    title: "Incompatibility with standard indicators",
    body:
      "Most popular time-based technical indicators (such as Moving Averages, RSI, or MACD) do not map cleanly onto a P&F framework, forcing reliance heavily on price patterns alone.",
  },
  {
    title: "Steeper learning curve",
    body:
      "For traders accustomed to modern visual formats like Japanese candlesticks, reading a dense matrix of X's and O's can feel counterintuitive, and charting software often treats P&F as a secondary feature rather than a default.",
  },
];

const SUMMARY =
  "Point and Figure is best suited for swing and position traders who prioritize macro price trends, objective risk levels, and clean support/resistance boundaries over intraday timing. Day traders, scalpers, or those heavily reliant on volume and momentum indicators generally find P&F too lagging or restrictive for short-term execution.";

export default function PointFigureProblemsDialog({ open, onClose }) {
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
        aria-labelledby="point-figure-pros-cons-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="point-figure-pros-cons-title" className="app-dialog-title">
              Pros &amp; cons of Point &amp; figure
            </h2>
            <p className="app-dialog-subtitle">
              What box charting does well — and where it struggles
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

          <h3 className="ma-pros-cons-group">Who it works for</h3>
          <p className="ma-problems-text">{SUMMARY}</p>
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
