import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import {
  MA_FAST_COLOR,
  MA_MEDIUM_COLOR,
  MA_SLOW_COLOR,
} from "./chartColors.js";
import { computeMaSeries } from "./ma.js";

const CHART_HEIGHT = 420;

export default function CandlestickChart({
  data,
  markers = [],
  fastPeriod = 21,
  mediumPeriod = null,
  slowPeriod = 50,
  maType = "ema",
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const fastRef = useRef(null);
  const mediumRef = useRef(null);
  const slowRef = useRef(null);
  const markersRef = useRef(null);
  const showMedium = mediumPeriod != null;

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
      timeScale: { borderColor: "#2d3a4a", rightOffset: 20 },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#6abf69",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#6abf69",
      wickDownColor: "#ef5350",
    });

    const fastLine = chart.addSeries(LineSeries, {
      color: MA_FAST_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    let mediumLine = null;
    if (showMedium) {
      mediumLine = chart.addSeries(LineSeries, {
        color: MA_MEDIUM_COLOR,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
    }

    const slowLine = chart.addSeries(LineSeries, {
      color: MA_SLOW_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const seriesMarkers = createSeriesMarkers(candles, []);

    chartRef.current = chart;
    candleRef.current = candles;
    fastRef.current = fastLine;
    mediumRef.current = mediumLine;
    slowRef.current = slowLine;
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
      fastRef.current = null;
      mediumRef.current = null;
      slowRef.current = null;
      markersRef.current = null;
    };
  }, [showMedium]);

  useEffect(() => {
    const candles = candleRef.current;
    const fastLine = fastRef.current;
    const mediumLine = mediumRef.current;
    const slowLine = slowRef.current;
    const seriesMarkers = markersRef.current;
    const chart = chartRef.current;
    if (!candles || !fastLine || !slowLine || !chart || !data?.length) return;

    candles.setData(
      data.map((bar) => ({
        time: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }))
    );
    fastLine.setData(computeMaSeries(data, fastPeriod, maType));
    if (mediumLine && mediumPeriod != null) {
      mediumLine.setData(computeMaSeries(data, mediumPeriod, maType));
    }
    slowLine.setData(computeMaSeries(data, slowPeriod, maType));
    seriesMarkers?.setMarkers(markers);
    chart.timeScale().fitContent();
  }, [data, markers, fastPeriod, mediumPeriod, slowPeriod, maType]);

  return <div ref={containerRef} className="chart-wrap" />;
}
