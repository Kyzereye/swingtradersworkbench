import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import {
  computeKeltnerMidSeries,
  computeKeltnerUpperSeries,
  computeKeltnerLowerSeries,
} from "./keltner.js";

const CHART_HEIGHT = 420;
const MID_COLOR = "#a78bfa";
const UPPER_COLOR = "#3b82f6";
const LOWER_COLOR = "#f59e0b";

function KeltnerChartInner({
  data,
  markers = [],
  emaPeriod = 20,
  atrPeriod = 10,
  atrMult = 2,
  symbol = null,
  companyName = null,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const midRef = useRef(null);
  const upperRef = useRef(null);
  const lowerRef = useRef(null);
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
      timeScale: { borderColor: "#2d3a4a", rightOffset: 20 },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#6abf69",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#6abf69",
      wickDownColor: "#ef5350",
    });

    const midLine = chart.addSeries(LineSeries, {
      color: MID_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const upperLine = chart.addSeries(LineSeries, {
      color: UPPER_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const lowerLine = chart.addSeries(LineSeries, {
      color: LOWER_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    candleRef.current = candles;
    midRef.current = midLine;
    upperRef.current = upperLine;
    lowerRef.current = lowerLine;
    markersRef.current = createSeriesMarkers(candles, []);

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      markersRef.current?.detach?.();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      midRef.current = null;
      upperRef.current = null;
      lowerRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const candles = candleRef.current;
    const midLine = midRef.current;
    const upperLine = upperRef.current;
    const lowerLine = lowerRef.current;
    const chart = chartRef.current;
    if (!candles || !midLine || !upperLine || !lowerLine || !chart || !data?.length) {
      return;
    }

    candles.setData(
      data.map((b) => ({
        time: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }))
    );
    midLine.setData(
      computeKeltnerMidSeries(data, emaPeriod, atrPeriod, atrMult)
    );
    upperLine.setData(
      computeKeltnerUpperSeries(data, emaPeriod, atrPeriod, atrMult)
    );
    lowerLine.setData(
      computeKeltnerLowerSeries(data, emaPeriod, atrPeriod, atrMult)
    );

    const sorted = [...(markers ?? [])].sort((a, b) =>
      String(a.time).localeCompare(String(b.time))
    );
    markersRef.current?.detach?.();
    markersRef.current = createSeriesMarkers(candles, sorted);

    chart.timeScale().fitContent();
  }, [data, markers, emaPeriod, atrPeriod, atrMult]);

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

export default function KeltnerChart(props) {
  if (!props.data?.length) {
    return <p className="systems-chart-empty">Load a symbol to see the chart.</p>;
  }
  return <KeltnerChartInner {...props} />;
}
