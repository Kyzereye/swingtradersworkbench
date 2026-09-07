import { useEffect, useState } from "react";
import { formatPct } from "./optimizeMa.js";
import { SortableTh, useScanTableSort } from "./scanTableSort.jsx";

function formatPnl(v) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

/**
 * Dow 30 dialog: symbol + ~2y running P/L / P/L%.
 * rows: { symbol, runningTotal?, runningTotalPct?, optFast?, optSlow? }
 */
export default function DowStocksDialog({
  open,
  onClose,
  title = "Dow 30",
  subtitle = null,
  rows = [],
  loading = false,
  error = null,
  onSelectRow,
}) {
  const { sortedRows, sortKey, sortDir, toggleSort } = useScanTableSort(
    rows,
    "pnlPct"
  );

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleSelect(row) {
    onSelectRow?.(row);
    onClose?.();
  }

  return (
    <div
      className="app-dialog-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="app-dialog top-performers-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dow-stocks-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="dow-stocks-title" className="app-dialog-title">
              {title}
            </h2>
            {subtitle ? (
              <p className="app-dialog-subtitle">{subtitle}</p>
            ) : null}
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
          {error ? <p className="error">{error}</p> : null}
          {loading ? (
            <p className="daily-signals-status">Loading…</p>
          ) : sortedRows.length > 0 ? (
            <div className="top-performers-table-wrap">
              <table className="scanner-table top-performers-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <SortableTh
                      col="symbol"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Symbol
                    </SortableTh>
                    <SortableTh
                      col="pnl"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                      className="scanner-col-num"
                    >
                      P/L
                    </SortableTh>
                    <SortableTh
                      col="pnlPct"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                      className="scanner-col-num"
                    >
                      P/L%
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, i) => (
                    <tr
                      key={row.symbol}
                      onClick={() => handleSelect(row)}
                      title={onSelectRow ? "Open chart" : undefined}
                      className={
                        onSelectRow ? "top-performers-row-click" : undefined
                      }
                    >
                      <td>{i + 1}</td>
                      <td>{row.symbol}</td>
                      <td className="scanner-col-num">
                        {formatPnl(row.runningTotal)}
                      </td>
                      <td className="scanner-col-num">
                        {formatPct(row.runningTotalPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !error ? (
            <p className="scanner-empty">No Dow scan data yet.</p>
          ) : null}
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
