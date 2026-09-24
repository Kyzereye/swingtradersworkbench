import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildPointFigureColumns } from "./pointFigure.js";

const LABEL_GUTTER = 60;
const RIGHT_PAD = 16;
const TOP_PAD = 12;
const BOTTOM_PAD = 12;
const MAX_CELL_W = 26;
const MAX_CELL_H = 18;
const MAX_ZOOM = 12;
const ZOOM_STEP = 1.25;
const WHEEL_ZOOM_STEP = 1.1;
/** Keeps the fitted chart just inside the viewport so fitting can't trip a
 * scrollbar, which would shrink the viewport and oscillate. */
const SCROLLBAR_ALLOWANCE = 14;
const UP_COLOR = "#6abf69";
const DOWN_COLOR = "#ef5350";
const GRID_COLOR = "#2d3a4a";
const TEXT_COLOR = "#8b9bab";
// Entry rings land on a green X and exit rings on a red O, so both ring
// colours sit outside the glyph palette to stay visible against them.
const ENTRY_RING_COLOR = "#3b82f6";
const EXIT_RING_COLOR = "#f5b942";

/**
 * Locates the box that triggered an entry/exit marker. The marker carries the
 * trigger's own level, so this rings the box that actually broke the prior
 * column's top/bottom — not whichever box that session happened to end on.
 */
function findMarkerCell(columns, marker) {
  const wantDirection = marker.text === "Open" ? "X" : "O";
  for (let ci = columns.length - 1; ci >= 0; ci--) {
    const col = columns[ci];
    if (col.direction !== wantDirection) continue;
    const box = col.boxes.find(
      (b) => b.date === marker.time && b.levelIndex === marker.levelIndex,
    );
    if (!box) continue;
    return {
      colIndex: ci,
      levelIndex: box.levelIndex,
      date: box.date,
      text: marker.text,
    };
  }
  return null;
}

function PointFigureChartInner({
  data,
  markers = [],
  boxPct = 1,
  reversalBoxes = 3,
  symbol = null,
  companyName = null,
}) {
  const wrapRef = useRef(null);
  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const pendingJumpRef = useRef(null);
  const layoutRef = useRef(null);
  const anchorRef = useRef(null);
  const dragRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 420,
  });

  const { columns, levels } = useMemo(
    () => buildPointFigureColumns(data, boxPct, reversalBoxes),
    [data, boxPct, reversalBoxes],
  );

  // Fresh data (new symbol or box%/reversal change) opens fit to screen.
  useLayoutEffect(() => {
    pendingJumpRef.current = 1;
    setZoom(1);
  }, [columns]);

  const markerCells = useMemo(
    () => markers.map((m) => findMarkerCell(columns, m)).filter(Boolean),
    [columns, markers],
  );

  // zoom === 1 fits the whole history in the panel (like the other charts'
  // fitContent()); zooming in grows cells past that, up to MAX_CELL_*.
  const layout = useMemo(() => {
    const nCols = Math.max(1, columns.length);
    const nRows = Math.max(1, levels.length);
    const availW = Math.max(
      1,
      containerSize.width - LABEL_GUTTER - RIGHT_PAD - SCROLLBAR_ALLOWANCE,
    );
    const availH = Math.max(
      1,
      containerSize.height - TOP_PAD - BOTTOM_PAD - SCROLLBAR_ALLOWANCE,
    );
    // No lower bound: zoom 1 has to fit whatever the grid is, however dense.
    // Legibility comes from zooming in, not from a minimum cell size.
    const fitCellW = availW / nCols;
    const fitCellH = availH / nRows;
    const cellW = Math.min(MAX_CELL_W, fitCellW * zoom);
    const cellH = Math.min(MAX_CELL_H, fitCellH * zoom);
    const width = LABEL_GUTTER + nCols * cellW + RIGHT_PAD;
    const height = nRows * cellH + TOP_PAD + BOTTOM_PAD;
    return { cellW, cellH, width, height };
  }, [containerSize, columns.length, levels.length, zoom]);

  // The wheel listener is bound once, so it reads the live layout from here.
  layoutRef.current = layout;

  const colX = useCallback(
    (colIndex) => LABEL_GUTTER + colIndex * layout.cellW + layout.cellW / 2,
    [layout.cellW],
  );
  const rowY = useCallback(
    (levelIndex) =>
      layout.height - BOTTOM_PAD - (levelIndex + 0.5) * layout.cellH,
    [layout.cellH, layout.height],
  );

  // Measured on the outer wrapper, not the scroll viewport: the viewport's
  // client size changes when its own scrollbars appear, which would feed
  // back into the fit calculation and oscillate.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => {
      const width = el.clientWidth || 800;
      const height = el.clientHeight || 420;
      setContainerSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const scrollEl = scrollRef.current;
    if (!canvas) return;
    const { width, height, cellW, cellH } = layout;
    const dpr = window.devicePixelRatio || 1;

    let fracX = 0;
    let fracY = 0;
    if (scrollEl) {
      const priorMaxX = scrollEl.scrollWidth - scrollEl.clientWidth;
      const priorMaxY = scrollEl.scrollHeight - scrollEl.clientHeight;
      fracX = priorMaxX > 0 ? scrollEl.scrollLeft / priorMaxX : 0;
      fracY = priorMaxY > 0 ? scrollEl.scrollTop / priorMaxY : 0;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (columns.length) {
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const rowsPerLabel = Math.max(1, Math.ceil(22 / cellH));
      for (let idx = 0; idx < levels.length; idx += rowsPerLabel) {
        const y = rowY(idx);
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(LABEL_GUTTER, Math.round(y) + 0.5);
        ctx.lineTo(width, Math.round(y) + 0.5);
        ctx.stroke();
        ctx.fillStyle = TEXT_COLOR;
        ctx.fillText(levels[idx].toFixed(2), LABEL_GUTTER - 6, y);
      }

      const half = Math.min(cellW, cellH) * 0.36;
      const glyphWidth = Math.min(1.5, Math.max(0.4, half));
      columns.forEach((col, ci) => {
        const x = colX(ci);
        ctx.strokeStyle = col.direction === "X" ? UP_COLOR : DOWN_COLOR;
        ctx.lineWidth = glyphWidth;
        for (const box of col.boxes) {
          const y = rowY(box.levelIndex);
          ctx.beginPath();
          if (col.direction === "X") {
            ctx.moveTo(x - half, y - half);
            ctx.lineTo(x + half, y + half);
            ctx.moveTo(x + half, y - half);
            ctx.lineTo(x - half, y + half);
          } else {
            ctx.ellipse(x, y, half, half, 0, 0, Math.PI * 2);
          }
          ctx.stroke();
        }
      });

      ctx.lineWidth = Math.min(2, Math.max(0.6, half));
      for (const cell of markerCells) {
        const x = colX(cell.colIndex);
        const y = rowY(cell.levelIndex);
        ctx.strokeStyle =
          cell.text === "Open" ? ENTRY_RING_COLOR : EXIT_RING_COLOR;
        ctx.beginPath();
        ctx.arc(x, y, Math.min(cellW, cellH) * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (!scrollEl) return;
    const maxX = scrollEl.scrollWidth - scrollEl.clientWidth;
    const maxY = scrollEl.scrollHeight - scrollEl.clientHeight;

    // Fresh data: wait for the opening zoom to actually land, then park on
    // the most recent columns. Doing it a render earlier would position
    // against the previous zoom's canvas size.
    if (pendingJumpRef.current !== null && zoom === pendingJumpRef.current) {
      pendingJumpRef.current = null;
      const lastCol = columns[columns.length - 1];
      const lastBox = lastCol?.boxes[lastCol.boxes.length - 1];
      scrollEl.scrollLeft = maxX;
      scrollEl.scrollTop = lastBox
        ? Math.max(
            0,
            Math.min(
              maxY,
              rowY(lastBox.levelIndex) - scrollEl.clientHeight / 2,
            ),
          )
        : 0;
      return;
    }

    // A wheel zoom pins the box under the cursor; it has to be applied here,
    // after the canvas resize, or it would clamp against the old scrollWidth.
    const anchor = anchorRef.current;
    anchorRef.current = null;
    if (anchor) {
      const targetLeft = LABEL_GUTTER + anchor.colCoord * cellW - anchor.viewX;
      const targetTop =
        height - BOTTOM_PAD - anchor.rowCoord * cellH - anchor.viewY;
      scrollEl.scrollLeft = Math.max(0, Math.min(maxX, targetLeft));
      scrollEl.scrollTop = Math.max(0, Math.min(maxY, targetTop));
      return;
    }

    scrollEl.scrollLeft = maxX > 0 ? fracX * maxX : 0;
    scrollEl.scrollTop = maxY > 0 ? fracY * maxY : 0;
  }, [columns, levels, markerCells, layout, colX, rowY, zoom]);

  useLayoutEffect(() => {
    draw();
  }, [draw]);

  // Wheel zooms toward the cursor. Native listener because React's onWheel is
  // passive and can't preventDefault the container's own scrolling.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    function onWheel(e) {
      const current = layoutRef.current;
      if (!current) return;
      e.preventDefault();

      // Recorded in column/row space so draw() can re-derive the pixel target
      // from whatever cell size the new zoom produces.
      const rect = el.getBoundingClientRect();
      const viewX = e.clientX - rect.left;
      const viewY = e.clientY - rect.top;
      anchorRef.current = {
        colCoord: (el.scrollLeft + viewX - LABEL_GUTTER) / current.cellW,
        rowCoord:
          (current.height - BOTTOM_PAD - (el.scrollTop + viewY)) /
          current.cellH,
        viewX,
        viewY,
      };

      setZoom((z) => {
        const next = e.deltaY < 0 ? z * WHEEL_ZOOM_STEP : z / WHEEL_ZOOM_STEP;
        return Math.min(MAX_ZOOM, Math.max(1, next));
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = useCallback((e) => {
    const el = scrollRef.current;
    if (!el || e.button !== 0) return;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
    el.setPointerCapture?.(e.pointerId);
    setDragging(true);
    setHover(null);
  }, []);

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag || !el) return;
    el.scrollLeft = drag.left - (e.clientX - drag.x);
    el.scrollTop = drag.top - (e.clientY - drag.y);
  }, []);

  const onPointerUp = useCallback((e) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    scrollRef.current?.releasePointerCapture?.(e.pointerId);
    setDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas || !columns.length || dragRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const ci = Math.round(
        (mx - LABEL_GUTTER - layout.cellW / 2) / layout.cellW,
      );
      const idx = Math.round(
        (layout.height - BOTTOM_PAD - my) / layout.cellH - 0.5,
      );
      const col = columns[ci];
      const box = col?.boxes.find((b) => b.levelIndex === idx);
      if (!box) {
        setHover(null);
        return;
      }
      setHover({
        left: colX(ci),
        top: rowY(idx),
        date: box.date,
        level: box.level,
        direction: col.direction,
      });
    },
    [columns, layout, colX, rowY],
  );

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP));
  const zoomOut = () => setZoom((z) => Math.max(1, z / ZOOM_STEP));
  const zoomFit = () => setZoom(1);

  return (
    <div
      ref={wrapRef}
      className="chart-wrap chart-with-symbol point-figure-chart"
    >
      {companyName || symbol ? (
        <div className="chart-symbol-label" aria-hidden="true">
          {companyName || symbol}
        </div>
      ) : null}
      <div className="point-figure-zoom-controls">
        <button type="button" onClick={zoomOut} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={zoomFit} aria-label="Zoom to fit">
          Fit
        </button>
        <button type="button" onClick={zoomIn} aria-label="Zoom in">
          +
        </button>
      </div>
      <div
        ref={scrollRef}
        className={`point-figure-scroll${dragging ? " is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {columns.length ? (
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHover(null)}
          />
        ) : (
          <p className="systems-chart-empty">
            Not enough price movement yet to form a Point &amp; figure column at
            this box size.
          </p>
        )}
        {hover ? (
          <div
            className="point-figure-tooltip"
            style={{ left: hover.left, top: hover.top }}
          >
            <strong>{hover.direction === "X" ? "Entry" : "Exit"}</strong>
            <span>{hover.level.toFixed(2)}</span>
            <span>{hover.date}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PointFigureChart(props) {
  if (!props.data?.length) {
    return (
      <p className="systems-chart-empty">Load a symbol to see the chart.</p>
    );
  }
  return <PointFigureChartInner {...props} />;
}
