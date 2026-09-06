import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import {
  EXIT_BUFFER_COLOR,
  MA_FAST_COLOR,
  MA_SLOW_COLOR,
} from "./chartColors.js";
import { computeMaSeries } from "./ma.js";

const CHART_HEIGHT = 420;

export default function CandlestickChart({
  data,
  markers = [],
  fastPeriod = 21,
  slowPeriod = 50,
  maType = "ema",
  exitBufferPct = 0,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const ema21Ref = useRef(null);
  const ema50Ref = useRef(null);
  const exitBufRef = useRef(null);
  const markersRef = useRef(null);

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
      timeScale: { borderColor: "#2d3a4a",
        rightOffset: 20,
       },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#6abf69",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#6abf69",
      wickDownColor: "#ef5350",
    });

    const ema21 = chart.addSeries(LineSeries, {
      color: MA_FAST_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema50 = chart.addSeries(LineSeries, {
      color: MA_SLOW_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const exitBuf = chart.addSeries(LineSeries, {
      color: EXIT_BUFFER_COLOR,
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const seriesMarkers = createSeriesMarkers(candles, []);

    chartRef.current = chart;
    candleRef.current = candles;
    ema21Ref.current = ema21;
    ema50Ref.current = ema50;
    exitBufRef.current = exitBuf;
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
      ema21Ref.current = null;
      ema50Ref.current = null;
      exitBufRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const candles = candleRef.current;
    const ema21 = ema21Ref.current;
    const ema50 = ema50Ref.current;
    const exitBuf = exitBufRef.current;
    const seriesMarkers = markersRef.current;
    const chart = chartRef.current;
    if (!candles || !ema21 || !ema50 || !exitBuf || !chart || !data?.length) return;

    candles.setData(
      data.map((bar) => ({
        time: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }))
    );
    const fastMa = computeMaSeries(data, fastPeriod, maType);
    ema21.setData(fastMa);
    ema50.setData(computeMaSeries(data, slowPeriod, maType));

    const buf = Math.max(0, Number(exitBufferPct) || 0);
    if (buf > 0) {
      const mult = 1 - buf / 100;
      exitBuf.setData(
        fastMa.map((p) => ({ time: p.time, value: p.value * mult }))
      );
    } else {
      exitBuf.setData([]);
    }

    seriesMarkers?.setMarkers(markers);
    chart.timeScale().fitContent();
  }, [data, markers, fastPeriod, slowPeriod, maType, exitBufferPct]);

  return <div ref={containerRef} className="chart-wrap" />;
}
