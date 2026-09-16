import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  createChart,
} from "lightweight-charts";
import {
  computeSupportResistance,
  SR_DEFAULTS,
} from "./supportResistance.js";
import { SupportResistancePrimitive } from "./SupportResistancePrimitive.js";
import { computeAtrSeries } from "./atr.js";

const CHART_HEIGHT = 420;

function toCandleData(data) {
  return data.map((b) => ({
    time: b.date,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
  }));
}

/** Attach approx band width at the level's start for the faint zone. */
function levelsWithBand(data, levels, atrPeriod, atrMult, bandPct) {
  const atrSeries = computeAtrSeries(data, atrPeriod);
  const atrByTime = new Map(atrSeries.map((p) => [p.time, p.value]));
  return levels.map((lv) => {
    const atr = atrByTime.get(lv.startTime);
    const atrBand =
      Number.isFinite(atr) && atr > 0 ? atr * atrMult : lv.price * 0.0025;
    const pctBand = lv.price * (bandPct ?? SR_DEFAULTS.bandPct);
    return { ...lv, bandWidth: Math.max(atrBand, pctBand) };
  });
}

function CandlestickReversalChartInner({
  data,
  swingN = SR_DEFAULTS.swingN,
  atrPeriod = SR_DEFAULTS.atrPeriod,
  atrMult = SR_DEFAULTS.atrMult,
  minTouches = SR_DEFAULTS.minTouches,
  minBars = SR_DEFAULTS.minBars,
  symbol = null,
  companyName = null,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const srPrimitiveRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: Math.max(el.clientWidth, 1),
      height: CHART_HEIGHT,
      layout: {
        background: { color: "transparent" },
        textColor: "#8b9bab",
      },
      grid: {
        vertLines: { color: "#2d3a4a" },
        horzLines: { color: "#2d3a4a" },
      },
      rightPriceScale: { borderColor: "#2d3a4a" },
      timeScale: { borderColor: "#2d3a4a", rightOffset: 20 },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#6abf69",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#6abf69",
      wickDownColor: "#ef5350",
    });

    const srPrimitive = new SupportResistancePrimitive();
    candles.attachPrimitive(srPrimitive);

    chartRef.current = chart;
    candleRef.current = candles;
    srPrimitiveRef.current = srPrimitive;

    const applyWidth = () => {
      const w = el.clientWidth;
      if (w > 0) chart.applyOptions({ width: w });
    };
    const onRangeChange = () => {
      srPrimitiveRef.current?.redraw();
    };

    const ro = new ResizeObserver(applyWidth);
    ro.observe(el);
    applyWidth();
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

    return () => {
      ro.disconnect();
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange);
      } catch {
        /* ignore */
      }
      try {
        candles.detachPrimitive(srPrimitive);
      } catch {
        /* ignore */
      }
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      srPrimitiveRef.current = null;
    };
  }, []);

  useEffect(() => {
    const candles = candleRef.current;
    const srPrimitive = srPrimitiveRef.current;
    const chart = chartRef.current;
    const el = containerRef.current;
    if (!candles || !srPrimitive || !chart || !data?.length) return;

    if (el?.clientWidth > 0) {
      chart.applyOptions({ width: el.clientWidth });
    }

    candles.setData(toCandleData(data));
    chart.timeScale().fitContent();

    const levels = computeSupportResistance(data, {
      swingN,
      atrPeriod,
      atrMult,
      minTouches,
      minBars,
    });
    srPrimitive.setLevels(
      levelsWithBand(data, levels, atrPeriod, atrMult, SR_DEFAULTS.bandPct),
      atrMult
    );

    const id = requestAnimationFrame(() => {
      srPrimitive.redraw();
      requestAnimationFrame(() => srPrimitive.redraw());
    });
    return () => cancelAnimationFrame(id);
  }, [data, swingN, atrPeriod, atrMult, minTouches, minBars]);

  return (
    <div className="chart-wrap chart-with-symbol">
      {companyName || symbol ? (
        <div className="chart-symbol-label" aria-hidden="true">
          {companyName || symbol}
        </div>
      ) : null}
      <div ref={containerRef} className="chart-wrap-inner" />
    </div>
  );
}

/** Remount when Load / S/R params change so overlays cannot desync. */
export default function CandlestickReversalChart(props) {
  const keyRef = useRef(0);
  const prevRef = useRef(null);

  if (!props.data?.length) {
    return <p className="systems-chart-empty">Load a symbol to see the chart.</p>;
  }

  const prev = prevRef.current;
  if (
    !prev ||
    prev.data !== props.data ||
    prev.swingN !== props.swingN ||
    prev.atrPeriod !== props.atrPeriod ||
    prev.atrMult !== props.atrMult ||
    prev.minTouches !== props.minTouches ||
    prev.minBars !== props.minBars
  ) {
    keyRef.current += 1;
    prevRef.current = {
      data: props.data,
      swingN: props.swingN,
      atrPeriod: props.atrPeriod,
      atrMult: props.atrMult,
      minTouches: props.minTouches,
      minBars: props.minBars,
    };
  }

  return <CandlestickReversalChartInner key={keyRef.current} {...props} />;
}
