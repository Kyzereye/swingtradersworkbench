/**
 * Lightweight Charts primitive: horizontal S/R segments.
 * levels: { startTime, endTime, price, kind }[]
 */

const SUPPORT_STROKE = "rgba(106, 191, 105, 0.9)";
const RESISTANCE_STROKE = "rgba(239, 83, 80, 0.9)";
const SUPPORT_FILL = "rgba(106, 191, 105, 0.08)";
const RESISTANCE_FILL = "rgba(239, 83, 80, 0.08)";

class SupportResistanceRenderer {
  constructor(source) {
    this._source = source;
  }

  draw(target) {
    const chart = this._source._chart;
    const series = this._source._series;
    const levels = this._source._levels;
    const bandAtrMult = this._source._bandAtrMult;
    if (!chart || !series || !levels?.length) return;

    const ts = chart.timeScale();
    const halfBar = (ts.options()?.barSpacing ?? 6) / 2;

    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;

      for (const lv of levels) {
        const x1 = ts.timeToCoordinate(lv.startTime);
        const x2 = ts.timeToCoordinate(lv.endTime);
        const y = series.priceToCoordinate(lv.price);
        if (x1 == null || x2 == null || y == null) continue;

        const left = Math.min(x1, x2) - halfBar;
        const right = Math.max(x1, x2) + halfBar;
        const isSupport = lv.kind === "support";
        const stroke = isSupport ? SUPPORT_STROKE : RESISTANCE_STROKE;
        const fill = isSupport ? SUPPORT_FILL : RESISTANCE_FILL;

        // Optional faint band from touch tolerance (visual only; ~0.25% of price
        // if no bandWidth provided).
        const band =
          Number.isFinite(lv.bandWidth) && lv.bandWidth > 0
            ? lv.bandWidth
            : lv.price * 0.0025 * (bandAtrMult || 1);
        const yTop = series.priceToCoordinate(lv.price + band);
        const yBot = series.priceToCoordinate(lv.price - band);
        if (yTop != null && yBot != null) {
          const top = Math.min(yTop, yBot);
          const bottom = Math.max(yTop, yBot);
          const px = Math.round(left * hr);
          const py = Math.round(top * vr);
          const pw = Math.max(1, Math.round(right * hr) - px);
          const ph = Math.max(1, Math.round(bottom * vr) - py);
          ctx.fillStyle = fill;
          ctx.fillRect(px, py, pw, ph);
        }

        const lx = Math.round(left * hr);
        const rx = Math.round(right * hr);
        const yy = Math.round(y * vr) + 0.5;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1, Math.round(hr));
        ctx.beginPath();
        ctx.moveTo(lx, yy);
        ctx.lineTo(rx, yy);
        ctx.stroke();
      }
    });
  }
}

class SupportResistancePaneView {
  constructor(source) {
    this._source = source;
    this._renderer = new SupportResistanceRenderer(source);
  }

  zOrder() {
    return "bottom";
  }

  update() {}

  renderer() {
    return this._renderer;
  }
}

export class SupportResistancePrimitive {
  constructor() {
    this._levels = [];
    this._bandAtrMult = 1;
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._paneView = new SupportResistancePaneView(this);
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

  setLevels(levels, bandAtrMult = 1) {
    this._levels = levels ?? [];
    this._bandAtrMult = bandAtrMult;
    this._requestUpdate?.();
  }

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
