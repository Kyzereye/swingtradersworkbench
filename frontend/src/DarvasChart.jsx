import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import { computeDarvasBoxes } from "./darvas.js";
import { DarvasBoxesPrimitive } from "./DarvasBoxesPrimitive.js";
import { computeMaSeries } from "./ma.js";

const PRICE_HEIGHT = 320;
const VOL_PANE_HEIGHT = 100;
const MA_COLOR = "#a78bfa";
const VOL_UP = "#6abf6988";
const VOL_DOWN = "#ef535088";

function toCandleData(data) {
  return data.map((b) => ({
    time: b.date,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
  }));
}

function toVolumeData(data) {
  return data.map((b) => {
    const vol = Number(b.volume);
    const value = Number.isFinite(vol) && vol >= 0 ? vol : 0;
    return {
      time: b.date,
      value,
      color: b.close >= b.open ? VOL_UP : VOL_DOWN,
    };
  });
}

/**
 * MA line aligned to every candle time. Missing values / filter-off use
 * whitespace points so the time scale stays locked to candles.
 */
function toMaData(data, maFilter, maPeriod, maType) {
  if (!maFilter) {
    return data.map((b) => ({ time: b.date }));
  }
  const kind = maType === "ema" ? "ema" : "sma";
  const byTime = new Map(
    computeMaSeries(data, maPeriod, kind).map((p) => [p.time, p.value])
  );
  return data.map((b) => {
    const value = byTime.get(b.date);
    return Number.isFinite(value)
      ? { time: b.date, value }
      : { time: b.date };
  });
}

function markersForData(data, markers) {
  const times = new Set((data ?? []).map((b) => b.date));
  return [...(markers ?? [])]
    .filter((m) => m?.time != null && times.has(m.time))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function safeSetMarkers(seriesMarkers, markers) {
  if (!seriesMarkers) return;
  try {
    seriesMarkers.setMarkers(markers);
  } catch {
    try {
      seriesMarkers.setMarkers([]);
    } catch {
      /* chart may be mid-teardown */
    }
  }
}

function DarvasChartInner({
  data,
  markers = [],
  highLookback = 55,
  boxBuild = 3,
  maFilter = false,
  maPeriod = 200,
  maType = "sma",
  symbol = null,
  companyName = null,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const maLineRef = useRef(null);
  const volumeRef = useRef(null);
  const boxesPrimitiveRef = useRef(null);
  const markersRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: Math.max(el.clientWidth, 1),
      height: PRICE_HEIGHT + VOL_PANE_HEIGHT,
      layout: {
        background: { color: "transparent" },
        textColor: "#8b9bab",
        panes: {
          separatorColor: "#6b7c8c",
          separatorHoverColor: "#8b9bab",
        },
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

    const maLine = chart.addSeries(LineSeries, {
      color: MA_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      visible: false,
      autoscaleInfoProvider: () => null,
    });

    const volume = chart.addSeries(
      HistogramSeries,
      {
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: "volume" },
      },
      1
    );

    const panes = chart.panes();
    if (panes[1]) panes[1].setHeight(VOL_PANE_HEIGHT);

    const boxesPrimitive = new DarvasBoxesPrimitive();
    candles.attachPrimitive(boxesPrimitive);

    chartRef.current = chart;
    candleRef.current = candles;
    maLineRef.current = maLine;
    volumeRef.current = volume;
    boxesPrimitiveRef.current = boxesPrimitive;
    markersRef.current = createSeriesMarkers(candles, []);

    const applyWidth = () => {
      const w = el.clientWidth;
      if (w > 0) chart.applyOptions({ width: w });
    };
    const onRangeChange = () => {
      boxesPrimitiveRef.current?.redraw();
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
      markersRef.current?.detach?.();
      try {
        candles.detachPrimitive(boxesPrimitive);
      } catch {
        /* ignore */
      }
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      maLineRef.current = null;
      volumeRef.current = null;
      boxesPrimitiveRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const candles = candleRef.current;
    const maLine = maLineRef.current;
    const volume = volumeRef.current;
    const boxesPrimitive = boxesPrimitiveRef.current;
    const seriesMarkers = markersRef.current;
    const chart = chartRef.current;
    const el = containerRef.current;
    if (
      !candles ||
      !maLine ||
      !volume ||
      !boxesPrimitive ||
      !seriesMarkers ||
      !chart ||
      !data?.length
    ) {
      return;
    }

    if (el?.clientWidth > 0) {
      chart.applyOptions({ width: el.clientWidth });
    }

    // 1) Series that own the time scale
    candles.setData(toCandleData(data));
    maLine.setData(toMaData(data, maFilter, maPeriod, maType));
    maLine.applyOptions({ visible: Boolean(maFilter) });
    volume.setData(toVolumeData(data));

    // 2) Fit after series share the same times
    chart.timeScale().fitContent();

    // 3) Overlays against the final scale
    boxesPrimitive.setBoxes(computeDarvasBoxes(data, highLookback, boxBuild));
    safeSetMarkers(seriesMarkers, markersForData(data, markers));

    // 4) LWC may apply fit asynchronously — redraw boxes after layout
    const id1 = requestAnimationFrame(() => {
      boxesPrimitive.redraw();
      requestAnimationFrame(() => boxesPrimitive.redraw());
    });
    return () => cancelAnimationFrame(id1);
  }, [data, markers, highLookback, boxBuild, maFilter, maPeriod, maType]);

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

/** Remount chart when Load / MA / box params change so overlays cannot desync. */
export default function DarvasChart(props) {
  const keyRef = useRef(0);
  const prevRef = useRef(null);

  if (!props.data?.length) {
    return <p className="systems-chart-empty">Load a symbol to see the chart.</p>;
  }

  const prev = prevRef.current;
  if (
    !prev ||
    prev.data !== props.data ||
    prev.maFilter !== props.maFilter ||
    prev.maPeriod !== props.maPeriod ||
    prev.maType !== props.maType ||
    prev.highLookback !== props.highLookback ||
    prev.boxBuild !== props.boxBuild
  ) {
    keyRef.current += 1;
    prevRef.current = {
      data: props.data,
      maFilter: props.maFilter,
      maPeriod: props.maPeriod,
      maType: props.maType,
      highLookback: props.highLookback,
      boxBuild: props.boxBuild,
    };
  }

  return <DarvasChartInner key={keyRef.current} {...props} />;
}
