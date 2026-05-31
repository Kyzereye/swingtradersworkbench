import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import {
  MA_FAST_COLOR,
  MA_SLOW_COLOR,
  MR_BAND_COLOR,
  MR_MA_COLOR,
  MR_UPPER_BAND_COLOR,
} from "./chartColors.js";
import {
  meanRevertLowerBandSeries,
  meanRevertUpperBandSeries,
} from "./meanRevertSignals.js";
import { computeMaSeries } from "./ma.js";

const CHART_HEIGHT = 420;

function sortMarkersByTime(items) {
  return [...items].sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function dataSeriesKey(data) {
  if (!data?.length) return null;
  return `${data.length}:${data[0].date}:${data[data.length - 1].date}`;
}

export default function CandlestickChart({
  data,
  markers = [],
  maEnabled = true,
  fastPeriod = 21,
  slowPeriod = 50,
  maType = "ema",
  mrEnabled = false,
  mrLowerEnabled = true,
  mrUpperEnabled = true,
  mrLowerPeriod = 21,
  mrLowerDeviationPct = 3,
  mrUpperPeriod = 21,
  mrUpperDeviationPct = 3,
  mrMaType = "ema",
  mrMarkers = [],
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const fastMaRef = useRef(null);
  const slowMaRef = useRef(null);
  const mrLowerMaRef = useRef(null);
  const mrUpperMaRef = useRef(null);
  const mrBandRef = useRef(null);
  const mrUpperBandRef = useRef(null);
  const markersRef = useRef(null);
  const fittedDataKeyRef = useRef(null);

  function resetZoom() {
    chartRef.current?.timeScale().fitContent();
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
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
      timeScale: { borderColor: "#2d3a4a" },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#6abf69",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#6abf69",
      wickDownColor: "#ef5350",
    });

    const fastMa = chart.addSeries(LineSeries, {
      color: MA_FAST_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const slowMa = chart.addSeries(LineSeries, {
      color: MA_SLOW_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const mrLowerMa = chart.addSeries(LineSeries, {
      color: MR_MA_COLOR,
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const mrUpperMa = chart.addSeries(LineSeries, {
      color: MR_MA_COLOR,
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const mrBand = chart.addSeries(LineSeries, {
      color: MR_BAND_COLOR,
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const mrUpperBand = chart.addSeries(LineSeries, {
      color: MR_UPPER_BAND_COLOR,
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const seriesMarkers = createSeriesMarkers(candles, [], { zOrder: "aboveSeries" });

    chartRef.current = chart;
    candleRef.current = candles;
    fastMaRef.current = fastMa;
    slowMaRef.current = slowMa;
    mrLowerMaRef.current = mrLowerMa;
    mrUpperMaRef.current = mrUpperMa;
    mrBandRef.current = mrBand;
    mrUpperBandRef.current = mrUpperBand;
    markersRef.current = seriesMarkers;
    fittedDataKeyRef.current = null;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      fastMaRef.current = null;
      slowMaRef.current = null;
      mrLowerMaRef.current = null;
      mrUpperMaRef.current = null;
      mrBandRef.current = null;
      mrUpperBandRef.current = null;
      markersRef.current = null;
      fittedDataKeyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const candles = candleRef.current;
    const fastMa = fastMaRef.current;
    const slowMa = slowMaRef.current;
    const mrLowerMa = mrLowerMaRef.current;
    const mrUpperMa = mrUpperMaRef.current;
    const mrBand = mrBandRef.current;
    const mrUpperBand = mrUpperBandRef.current;
    const seriesMarkers = markersRef.current;
    const chart = chartRef.current;
    if (
      !candles ||
      !fastMa ||
      !slowMa ||
      !mrLowerMa ||
      !mrUpperMa ||
      !mrBand ||
      !mrUpperBand ||
      !chart ||
      !data?.length
    ) {
      return;
    }

    candles.setData(
      data.map((bar) => ({
        time: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }))
    );
    fastMa.setData(
      maEnabled ? computeMaSeries(data, fastPeriod, maType) : []
    );
    slowMa.setData(
      maEnabled ? computeMaSeries(data, slowPeriod, maType) : []
    );

    if (mrEnabled && mrLowerEnabled) {
      mrLowerMa.setData(computeMaSeries(data, mrLowerPeriod, mrMaType));
      mrBand.setData(
        meanRevertLowerBandSeries(data, mrLowerPeriod, mrLowerDeviationPct, mrMaType)
      );
    } else {
      mrLowerMa.setData([]);
      mrBand.setData([]);
    }

    if (mrEnabled && mrUpperEnabled) {
      mrUpperMa.setData(computeMaSeries(data, mrUpperPeriod, mrMaType));
      mrUpperBand.setData(
        meanRevertUpperBandSeries(data, mrUpperPeriod, mrUpperDeviationPct, mrMaType)
      );
    } else {
      mrUpperMa.setData([]);
      mrUpperBand.setData([]);
    }

    const chartMarkers = sortMarkersByTime([
      ...(maEnabled ? markers : []),
      ...(mrEnabled ? mrMarkers : []),
    ]);
    seriesMarkers.setMarkers(chartMarkers);

    const key = dataSeriesKey(data);
    if (key !== fittedDataKeyRef.current) {
      chart.timeScale().fitContent();
      fittedDataKeyRef.current = key;
    }
  }, [
    data,
    markers,
    mrMarkers,
    maEnabled,
    fastPeriod,
    slowPeriod,
    maType,
    mrEnabled,
    mrLowerEnabled,
    mrUpperEnabled,
    mrLowerPeriod,
    mrLowerDeviationPct,
    mrUpperPeriod,
    mrUpperDeviationPct,
    mrMaType,
  ]);

  return (
    <div className="chart-shell">
      <div className="chart-toolbar">
        <button
          type="button"
          className="chart-reset-zoom"
          onClick={resetZoom}
          aria-label="Reset chart zoom to full range"
        >
          Reset zoom
        </button>
      </div>
      <div ref={containerRef} className="chart-wrap" />
    </div>
  );
}
