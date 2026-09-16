import { useMemo, useState } from "react";
import { OUTCOME_LABEL, legsWithTrades } from "./fibonacci.js";
import FibonacciLegDialog from "./FibonacciLegDialog.jsx";

function formatPnl(v) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}`;
}

/** Every Fibonacci leg (swing low → swing high); click a row for detail. */
export default function FibonacciLegsTable({
  data,
  trades,
  swingN,
  entryLevel = 0.618,
  legOpts,
}) {
  const [selectedLeg, setSelectedLeg] = useState(null);

  const rows = useMemo(() => {
    if (!data?.length) return [];
    return legsWithTrades(
      data,
      swingN,
      trades ?? [],
      entryLevel,
      legOpts
    ).reverse();
  }, [data, trades, swingN, entryLevel, legOpts]);

  if (!rows.length) return null;

  const withSignals = rows.filter((l) => l.trade).length;

  return (
    <>
      <details className="expand-panel">
        <summary className="trades-opens-summary">
          <span>
            Fibonacci legs ({rows.length}, {withSignals} with signals)
          </span>
          <span className="trades-opens-summary-note">
            Each swing low → swing high. Click a row for its levels.
          </span>
        </summary>
        <div className="expand-body">
          <table className="trades-table fib-legs-table">
            <thead>
              <tr>
                <th>Swing low</th>
                <th>Low price</th>
                <th>Swing high</th>
                <th>High price</th>
                <th className="trades-col-num">Leg %</th>
                <th>Outcome</th>
                <th className="trades-col-num">P/L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr
                  key={`${l.lowTime}-${l.highTime}`}
                  onClick={() => setSelectedLeg(l)}
                >
                  <td>{l.lowTime}</td>
                  <td>{l.lowPrice.toFixed(2)}</td>
                  <td>{l.highTime}</td>
                  <td>{l.highPrice.toFixed(2)}</td>
                  <td className="trades-col-num">
                    {((l.highPrice / l.lowPrice - 1) * 100).toFixed(1)}%
                  </td>
                  <td>{OUTCOME_LABEL[l.outcome]}</td>
                  <td className="trades-col-num">
                    {l.trade && !l.trade.open
                      ? formatPnl(l.trade.exitPrice - l.trade.entryPrice)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <FibonacciLegDialog
        open={!!selectedLeg}
        leg={selectedLeg}
        bars={data}
        swingN={swingN}
        onClose={() => setSelectedLeg(null)}
      />
    </>
  );
}
