import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import { computeRsiSeries } from "./rsi.js";

const PRICE_HEIGHT = 320;
const RSI_PANE_HEIGHT = 140;
const RSI_LINE_COLOR = "#3b82f6";
const OS_LEVEL_COLOR = "#f59e0b";
const OB_LEVEL_COLOR = "#ef5350";

/** Candles + RSI pane (line + oversold/overbought levels). */
function RsiChartInner({
  data,
  markers = [],
  period = 14,
  oversold = 30,
  overbought = 70,
  symbol = null,
  companyName = null,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const rsiRef = useRef(null);
  const markersRef = useRef(null);
  const osLineRef = useRef(null);
  const obLineRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: PRICE_HEIGHT + RSI_PANE_HEIGHT,
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

    const rsiLine = chart.addSeries(
      LineSeries,
      {
        color: RSI_LINE_COLOR,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
        autoscaleInfoProvider: () => ({
          priceRange: { minValue: 0, maxValue: 100 },
        }),
      },
      1
    );

    const panes = chart.panes();
    if (panes[1]) panes[1].setHeight(RSI_PANE_HEIGHT);

    osLineRef.current = rsiLine.createPriceLine({
      price: oversold,
      color: OS_LEVEL_COLOR,
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "OS",
    });
    obLineRef.current = rsiLine.createPriceLine({
      price: overbought,
      color: OB_LEVEL_COLOR,
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "OB",
    });

    const seriesMarkers = createSeriesMarkers(candles, []);

    chartRef.current = chart;
    candleRef.current = candles;
    rsiRef.current = rsiLine;
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
      rsiRef.current = null;
      markersRef.current = null;
      osLineRef.current = null;
      obLineRef.current = null;
    };
    // recreate chart only once; level lines updated in data effect
  }, []);

  useEffect(() => {
    const candles = candleRef.current;
    const rsiLine = rsiRef.current;
    const seriesMarkers = markersRef.current;
    const chart = chartRef.current;
    if (!candles || !rsiLine || !chart || !data?.length) return;

    candles.setData(
      data.map((bar) => ({
        time: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }))
    );
    rsiLine.setData(computeRsiSeries(data, period));
    seriesMarkers?.setMarkers(markers);

    if (osLineRef.current) {
      osLineRef.current.applyOptions({ price: oversold });
    }
    if (obLineRef.current) {
      obLineRef.current.applyOptions({ price: overbought });
    }

    chart.timeScale().fitContent();
  }, [data, markers, period, oversold, overbought]);

  return (
    <div className="chart-wrap rsi-chart chart-with-symbol">
      {companyName || symbol ? (
        <div className="chart-symbol-label" aria-hidden="true">
          {companyName || symbol}
        </div>
      ) : null}
      <div ref={containerRef} className="chart-wrap-inner" />
    </div>
  );
}

/** Candles + RSI pane. */
export default function RsiChart(props) {
  if (!props.data?.length) {
    return <p className="systems-chart-empty">Load a symbol to see the chart.</p>;
  }
  return <RsiChartInner {...props} />;
}
