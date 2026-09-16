import { useEffect, useState } from "react";
import { formatPct } from "./optimizeMa.js";
import { SortableTh, useScanTableSort } from "./scanTableSort.jsx";

function formatPnl(v) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

const DEFAULT_VISIBLE = 10;

/**
 * Reusable top-performers dialog (Systems and future lists).
 *
 * rows: { symbol, companyName?, runningTotal?, runningTotalPct?, tradeCount? }
 */
export default function TopPerformersDialog({
  open,
  onClose,
  title = "Top performers",
  subtitle = null,
  note = null,
  rows = [],
  loading = false,
  error = null,
  initialVisible = DEFAULT_VISIBLE,
  onSelectRow,
}) {
  const [visibleCount, setVisibleCount] = useState(initialVisible);
  const { sortedRows, sortKey, sortDir, toggleSort } = useScanTableSort(
    rows,
    "pnlPct"
  );

  useEffect(() => {
    if (open) setVisibleCount(initialVisible);
  }, [open, initialVisible]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const showTrades = rows.some((r) => r.tradeCount != null);
  const visible = sortedRows.slice(0, visibleCount);
  const canShowMore = visibleCount < sortedRows.length;

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
        aria-labelledby="top-performers-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="top-performers-title" className="app-dialog-title">
              {title}
            </h2>
            {subtitle ? (
              <p className="app-dialog-subtitle">{subtitle}</p>
            ) : null}
            {note ? (
              <p className="app-dialog-note">{note}</p>
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
          ) : visible.length > 0 ? (
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
                      col="company"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Company
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
                    {showTrades ? (
                      <SortableTh
                        col="tradeCount"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        className="scanner-col-num"
                      >
                        Signals
                      </SortableTh>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row, i) => (
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
                      <td className="daily-signals-company">
                        {row.companyName ?? "—"}
                      </td>
                      <td className="scanner-col-num">
                        {formatPnl(row.runningTotal)}
                      </td>
                      <td className="scanner-col-num">
                        {formatPct(row.runningTotalPct)}
                      </td>
                      {showTrades ? (
                        <td className="scanner-col-num">
                          {row.tradeCount ?? "—"}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !error ? (
            <p className="scanner-empty">No top performers yet.</p>
          ) : null}
        </div>

        <footer className="app-dialog-footer">
          {canShowMore ? (
            <button
              type="button"
              className="app-dialog-secondary"
              onClick={() =>
                setVisibleCount((n) =>
                  Math.min(sortedRows.length, n + initialVisible)
                )
              }
            >
              Show more
            </button>
          ) : (
            <span />
          )}
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
