import { formatPct } from "./optimizeMa.js";

function formatPnl(v) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}`;
}

export function enrichTradesForTable(trades, asOfDate) {
  const chronological = [...trades].sort((a, b) =>
    a.entryDate.localeCompare(b.entryDate)
  );
  let runningTotal = 0;
  let runningTotalPct = 0;
  let hasClosedTrade = false;
  const enriched = chronological.map((t) => {
    const tradePnl = t.open ? null : t.exitPrice - t.entryPrice;
    const tradePnlPct =
      t.open || !t.entryPrice ? null : (t.exitPrice / t.entryPrice - 1) * 100;
    const end = t.open ? asOfDate : t.exitDate;
    const daysInTrade =
      t.entryDate && end
        ? Math.max(
            0,
            Math.round(
              (new Date(`${end}T12:00:00`) - new Date(`${t.entryDate}T12:00:00`)) /
                86400000
            )
          )
        : null;
    if (tradePnl != null && tradePnlPct != null) {
      runningTotal += tradePnl;
      runningTotalPct += tradePnlPct;
      hasClosedTrade = true;
    }
    return {
      ...t,
      tradePnl,
      tradePnlPct,
      daysInTrade,
      runningTotal,
      runningTotalPct: hasClosedTrade ? runningTotalPct : null,
    };
  });
  return enriched.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

/** Opens & closes table — same columns as the Chart tab. */
export default function OpensClosesTable({ trades, asOfDate }) {
  if (!trades?.length) return null;

  const rows = enrichTradesForTable(trades, asOfDate);
  const closedCount = trades.filter((t) => !t.open).length;
  const stillOpen = trades.some((t) => t.open);

  return (
    <details className="expand-panel">
      <summary>
        Opens &amp; closes ({closedCount}
        {stillOpen ? ", 1 still open" : ""})
      </summary>
      <div className="expand-body">
        <table className="trades-table">
          <thead>
            <tr>
              <th>Open</th>
              <th>Open price</th>
              <th>Close</th>
              <th>Close price</th>
              <th className="trades-col-num">DiT</th>
              <th className="trades-col-num">P/L</th>
              <th className="trades-col-num">P/L%</th>
              <th className="trades-col-num">Running P/L</th>
              <th className="trades-col-num">Running P/L %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={`${t.entryDate}-${i}`}>
                <td>{t.entryDate}</td>
                <td>{t.entryPrice.toFixed(2)}</td>
                <td>{t.open ? "—" : t.exitDate}</td>
                <td>{t.open ? "—" : t.exitPrice.toFixed(2)}</td>
                <td className="trades-col-num">
                  {t.daysInTrade == null ? "—" : t.daysInTrade}
                </td>
                <td className="trades-col-num">
                  {t.tradePnl == null ? "—" : formatPnl(t.tradePnl)}
                </td>
                <td className="trades-col-num">
                  {t.tradePnlPct == null ? "—" : formatPct(t.tradePnlPct)}
                </td>
                <td className="trades-col-num">{formatPnl(t.runningTotal)}</td>
                <td className="trades-col-num">
                  {t.runningTotalPct == null ? "—" : formatPct(t.runningTotalPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
