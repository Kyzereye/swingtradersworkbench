import { useMemo } from "react";
import { formatPnl } from "./optimizeMa.js";

function enrichTradesForTable(trades, shortPnl = false) {
  const chronological = [...trades].sort((a, b) =>
    a.entryDate.localeCompare(b.entryDate)
  );
  let runningTotal = 0;
  const enriched = chronological.map((t) => {
    const tradePnl = t.open
      ? null
      : shortPnl
        ? t.entryPrice - t.exitPrice
        : t.exitPrice - t.entryPrice;
    if (tradePnl != null) {
      runningTotal += tradePnl;
    }
    return { ...t, tradePnl, runningTotal };
  });
  return enriched.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

export default function TradesTable({
  trades,
  summaryLabel,
  rowKeyPrefix = "",
  shortPnl = false,
}) {
  const rows = useMemo(
    () => enrichTradesForTable(trades, shortPnl),
    [trades, shortPnl]
  );
  const closedCount = trades.filter((t) => !t.open).length;
  const hasOpen = trades.some((t) => t.open);

  return (
    <details className="expand-panel">
      <summary>
        {summaryLabel} ({closedCount}
        {hasOpen ? ", 1 open" : ""})
      </summary>
      <div className="expand-body">
        <table className="trades-table">
          <thead>
            <tr>
              <th>Entry</th>
              <th>Entry price</th>
              <th>Exit</th>
              <th>Exit price</th>
              <th className="trades-col-num">P/L</th>
              <th className="trades-col-num">Running total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={`${rowKeyPrefix}${t.entryDate}-${i}`}>
                <td>{t.entryDate}</td>
                <td>{t.entryPrice.toFixed(2)}</td>
                <td>{t.open ? "—" : t.exitDate}</td>
                <td>{t.open ? "Open" : t.exitPrice.toFixed(2)}</td>
                <td className="trades-col-num">
                  {t.tradePnl == null ? "—" : formatPnl(t.tradePnl)}
                </td>
                <td className="trades-col-num">{formatPnl(t.runningTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
