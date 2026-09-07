import { useEffect, useState } from "react";
import { SortableTh, useScanTableSort } from "./scanTableSort.jsx";

const DEFAULT_VISIBLE = 25;

function formatClose(price) {
  if (price == null || !Number.isFinite(Number(price))) return "—";
  return `$${Number(price).toFixed(2)}`;
}

function formatSignal(signal) {
  if (signal === "entry") return "Entry";
  if (signal === "exit") return "Exit";
  return signal ?? "—";
}

/**
 * Dialog: entry/exit on each symbol's last trading session.
 * rows: { symbol, companyName?, assetType?, signal, signalDate?, price?, optFast?, optSlow? }
 */
export default function YesterdaySignalsDialog({
  open,
  onClose,
  title = "Yesterday's signals",
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
    "symbol"
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

  const showAsset = rows.some((r) => r.assetType);
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
        aria-labelledby="yesterday-signals-title"
      >
        <header className="app-dialog-header">
          <div>
            <h2 id="yesterday-signals-title" className="app-dialog-title">
              {title}
            </h2>
            {subtitle ? (
              <p className="app-dialog-subtitle">{subtitle}</p>
            ) : null}
            {note ? <p className="app-dialog-note">{note}</p> : null}
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
                    {showAsset ? (
                      <SortableTh
                        col="assetType"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      >
                        Asset
                      </SortableTh>
                    ) : null}
                    <SortableTh
                      col="signal"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Signal
                    </SortableTh>
                    <SortableTh
                      col="price"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                      className="scanner-col-num"
                    >
                      Close
                    </SortableTh>
                    <SortableTh
                      col="signalDate"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    >
                      Session
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row, i) => (
                    <tr
                      key={`${row.symbol}-${row.signal}-${row.signalDate}`}
                      onClick={() => handleSelect(row)}
                      title={onSelectRow ? "Open chart" : undefined}
                      className={
                        onSelectRow ? "top-performers-row-click" : undefined
                      }
                    >
                      <td>{i + 1}</td>
                      <td>{row.symbol}</td>
                      {showAsset ? (
                        <td>{row.assetType ?? "—"}</td>
                      ) : null}
                      <td>{formatSignal(row.signal)}</td>
                      <td className="scanner-col-num">
                        {formatClose(row.price)}
                      </td>
                      <td>{row.signalDate ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !error ? (
            <p className="scanner-empty">No entry/exit signals on last sessions.</p>
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
