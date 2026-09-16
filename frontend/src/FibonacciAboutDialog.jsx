import { useEffect } from "react";

export default function FibonacciAboutDialog({ open, onClose }) {
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
        className="app-dialog fib-leg-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fibonacci-about-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="fibonacci-about-title" className="app-dialog-title">
              Fibonacci Retracement / Extension
            </h2>
            <p className="app-dialog-subtitle">How this system works</p>
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

        <div className="app-dialog-body">
          <div className="fib-leg-body">
            <div className="fib-leg-main ma-problems-body">
              <section className="ma-problems-section">
                <h3 className="ma-problems-heading">Core idea</h3>
                <p className="ma-problems-text">
                  After price rises from a swing low to a swing high, it often
                  pulls back to one of the Fibonacci ratios of that move (38.2%,
                  50%, 61.8% or 78.6%) before continuing higher. This system
                  uses that pullback as the entry and uses a Fibonacci extension
                  above the swing high as the target.
                </p>
              </section>
              <section className="ma-problems-section">
                <h3 className="ma-problems-heading">In this app</h3>
                <p className="ma-problems-text">
                  The system is long only. A leg begins at a swing low, which is
                  a bar whose low is below the lows of the previous ten bars,
                  and ends at the highest high that follows it. That high is
                  confirmed either when ten more bars pass without exceeding it
                  or when price pulls back into the entry zone sooner. A leg
                  must be at least 5% of the price or three times the 14-day
                  ATR, whichever is reached first, so that a small wiggle is not
                  treated as a leg.
                </p>
                <p className="ma-problems-text">
                  The entry zone runs from the chosen retracement level down to
                  the next deeper Fibonacci ratio. With the default of 61.8%,
                  the zone is 61.8% to 78.6%, which is often called the golden
                  zone. An entry signal occurs when a bar closes inside that
                  zone. An exit signal occurs when a bar closes at or above the
                  extension target, or when a bar closes below the swing low,
                  which acts as a protective stop. All fills happen at the next
                  bar&apos;s open.
                </p>
                <p className="ma-problems-text">
                  The defaults are a swing lookback of 10 bars, an entry zone
                  top of 61.8%, and an extension target of 161.8%. The minimum
                  leg size is fixed and is not optimized.
                </p>
              </section>
              <section className="ma-problems-section">
                <h3 className="ma-problems-heading">Chart</h3>
                <p className="ma-problems-text">
                  The chart shows the entry and exit markers along with a small
                  &quot;ƒ&quot; icon at the start of every leg. The icon&apos;s
                  color shows the leg&apos;s outcome. Clicking an icon, or a row
                  in the Fibonacci legs panel below the chart, opens a dialog
                  that draws that leg with its retracement levels and extension
                  targets.
                </p>
              </section>
            </div>

            <aside className="fib-leg-side ma-problems-body">
              <section className="ma-problems-section">
                <h3 className="ma-problems-heading">Optimized numbers</h3>
                <p className="ma-problems-text">
                  The nightly scan tests every combination of swing lookback (5,
                  8, 10 or 15 bars), entry zone top (38.2%, 50%, 61.8% or 78.6%)
                  and extension target (127.2%, 161.8% or 200%) on each
                  symbol&apos;s full price history. It keeps the one combination
                  that produced the highest total one-share P/L for that symbol.
                  That single combination is then applied to every leg on the
                  chart, so the optimization is per symbol, not per leg.
                </p>
                <p className="ma-problems-text">
                  When a scan row exists for a symbol, Load fills the sidebar
                  with its optimized values. Otherwise the defaults are used.
                  These values are a hindsight fit. They show which settings
                  would have worked best on that symbol&apos;s past data, which
                  is information about how the symbol has behaved, not a
                  recommendation for the future. Different symbols will land on
                  different numbers.
                </p>
              </section>
            </aside>
          </div>
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
