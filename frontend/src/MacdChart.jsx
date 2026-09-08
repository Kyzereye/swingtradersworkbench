import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import { computeMacdSeries } from "./macd.js";

const PRICE_HEIGHT = 320;
const MACD_PANE_HEIGHT = 140;
const MACD_LINE_COLOR = "#3b82f6";
const SIGNAL_LINE_COLOR = "#f59e0b";
const HIST_UP = "#6abf6988";
const HIST_DOWN = "#ef535088";

/** Candles + MACD pane. Only mount when `data` has bars. */
function MacdChartInner({
  data,
  markers = [],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const macdRef = useRef(null);
  const signalRef = useRef(null);
  const histRef = useRef(null);
  const markersRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: PRICE_HEIGHT + MACD_PANE_HEIGHT,
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

    const hist = chart.addSeries(
      HistogramSeries,
      {
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
      },
      1
    );
    const macdLine = chart.addSeries(
      LineSeries,
      {
        color: MACD_LINE_COLOR,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
      },
      1
    );
    const signalLine = chart.addSeries(
      LineSeries,
      {
        color: SIGNAL_LINE_COLOR,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
      },
      1
    );

    const panes = chart.panes();
    if (panes[1]) panes[1].setHeight(MACD_PANE_HEIGHT);

    const seriesMarkers = createSeriesMarkers(candles, []);

    chartRef.current = chart;
    candleRef.current = candles;
    macdRef.current = macdLine;
    signalRef.current = signalLine;
    histRef.current = hist;
    markersRef.current = seriesMarkers;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      macdRef.current = null;
      signalRef.current = null;
      histRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const candles = candleRef.current;
    const macdLine = macdRef.current;
    const signalLine = signalRef.current;
    const hist = histRef.current;
    const seriesMarkers = markersRef.current;
    const chart = chartRef.current;
    if (!candles || !macdLine || !signalLine || !hist || !chart || !data?.length)
      return;

    candles.setData(
      data.map((bar) => ({
        time: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }))
    );

    const { macd, signal, histogram } = computeMacdSeries(
      data,
      fastPeriod,
      slowPeriod,
      signalPeriod
    );
    macdLine.setData(macd);
    signalLine.setData(signal);
    hist.setData(
      histogram.map((p) => ({
        time: p.time,
        value: p.value,
        color: p.value >= 0 ? HIST_UP : HIST_DOWN,
      }))
    );
    seriesMarkers?.setMarkers(markers);
    chart.timeScale().fitContent();
  }, [data, markers, fastPeriod, slowPeriod, signalPeriod]);

  return <div ref={containerRef} className="chart-wrap macd-chart" />;
}

/** Candles + MACD pane (line, signal, histogram). */
export default function MacdChart(props) {
  if (!props.data?.length) {
    return <p className="systems-chart-empty">Load a symbol to see the chart.</p>;
  }
  return <MacdChartInner {...props} />;
}
