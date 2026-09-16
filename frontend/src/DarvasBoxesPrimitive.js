/**
 * Lightweight Charts series primitive: draw Darvas rectangles.
 * boxes: { startTime, endTime, boxTop, boxLow }[]
 */

class DarvasBoxesRenderer {
  constructor(source) {
    this._source = source;
  }

  draw(target) {
    const chart = this._source._chart;
    const series = this._source._series;
    const boxes = this._source._boxes;
    if (!chart || !series || !boxes?.length) return;

    const ts = chart.timeScale();
    const halfBar = (ts.options()?.barSpacing ?? 6) / 2;

    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;

      for (const box of boxes) {
        const x1 = ts.timeToCoordinate(box.startTime);
        const x2 = ts.timeToCoordinate(box.endTime);
        const yTop = series.priceToCoordinate(box.boxTop);
        const yBot = series.priceToCoordinate(box.boxLow);
        if (x1 == null || x2 == null || yTop == null || yBot == null) continue;

        const left = Math.min(x1, x2) - halfBar;
        const right = Math.max(x1, x2) + halfBar;
        const top = Math.min(yTop, yBot);
        const bottom = Math.max(yTop, yBot);
        const w = right - left;
        const h = bottom - top;
        if (w <= 0 || h <= 0) continue;

        const px = Math.round(left * hr);
        const py = Math.round(top * vr);
        const pw = Math.max(1, Math.round(right * hr) - px);
        const ph = Math.max(1, Math.round(bottom * vr) - py);

        ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
        ctx.lineWidth = Math.max(1, Math.round(hr));
        ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      }
    });
  }
}

class DarvasBoxesPaneView {
  constructor(source) {
    this._source = source;
    this._renderer = new DarvasBoxesRenderer(source);
  }

  zOrder() {
    return "bottom";
  }

  update() {}

  renderer() {
    return this._renderer;
  }
}

export class DarvasBoxesPrimitive {
  constructor() {
    this._boxes = [];
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._paneView = new DarvasBoxesPaneView(this);
  }

  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  setBoxes(boxes) {
    this._boxes = boxes ?? [];
    this._requestUpdate?.();
  }

  /** Force a redraw after time-scale changes (e.g. fitContent). */
  redraw() {
    this._requestUpdate?.();
  }

  updateAllViews() {
    this._paneView.update();
  }

  paneViews() {
    return [this._paneView];
  }
}
