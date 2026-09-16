import { useCallback, useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import { legsWithTrades } from "./fibonacci.js";
import FibonacciLegDialog from "./FibonacciLegDialog.jsx";

const CHART_HEIGHT = 420;
const ICON_COLORS = {
  none: "#8b9bab",
  open: "#3b82f6",
  win: "#6abf69",
  loss: "#ef5350",
};

function FibonacciChartInner({
  data,
  markers = [],
  trades = [],
  swingN = 10,
  entryLevel = 0.618,
  legOpts,
  symbol = null,
  companyName = null,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const markersRef = useRef(null);
  const allLegsRef = useRef([]);
  const [legIcons, setLegIcons] = useState([]);
  const [selectedLeg, setSelectedLeg] = useState(null);

  // One icon per leg, anchored at its swing low. Positions are recomputed
  // on pan/zoom/resize since the chart owns the time/price → pixel mapping.
  const recomputeIconPositions = useCallback(() => {
    const chart = chartRef.current;
    const candles = candleRef.current;
    const el = containerRef.current;
    if (!chart || !candles || !el) return;

    const width = el.clientWidth;
    const height = el.clientHeight || CHART_HEIGHT;
    const ts = chart.timeScale();

    const positioned = [];
    for (const leg of allLegsRef.current) {
      const x = ts.timeToCoordinate(leg.lowTime);
      const y = candles.priceToCoordinate(leg.lowPrice);
      if (x == null || y == null) continue;
      if (x < 0 || x > width || y < 0 || y > height) continue;
      positioned.push({ leg, left: x, top: y });
    }
    setLegIcons(positioned);
  }, []);

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

    chartRef.current = chart;
    candleRef.current = candles;
    markersRef.current = createSeriesMarkers(candles, []);

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
      recomputeIconPositions();
    });
    ro.observe(el);
    chart.timeScale().subscribeVisibleLogicalRangeChange(recomputeIconPositions);

    return () => {
      ro.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(
        recomputeIconPositions
      );
      markersRef.current?.detach?.();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      markersRef.current = null;
    };
  }, [recomputeIconPositions]);

  useEffect(() => {
    const candles = candleRef.current;
    const chart = chartRef.current;
    if (!candles || !chart || !data?.length) return;

    candles.setData(
      data.map((b) => ({
        time: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }))
    );

    markersRef.current?.detach?.();
    markersRef.current = createSeriesMarkers(candles, markers ?? []);

    chart.timeScale().fitContent();

    allLegsRef.current = legsWithTrades(
      data,
      swingN,
      trades,
      entryLevel,
      legOpts
    );
    recomputeIconPositions();
    // Coordinates aren't settled until after fitContent's layout pass.
    const id = requestAnimationFrame(recomputeIconPositions);
    return () => cancelAnimationFrame(id);
  }, [
    data,
    markers,
    trades,
    swingN,
    entryLevel,
    legOpts,
    recomputeIconPositions,
  ]);

  return (
    <div className="chart-wrap chart-with-symbol">
      {companyName || symbol ? (
        <div className="chart-symbol-label" aria-hidden="true">
          {companyName || symbol}
        </div>
      ) : null}
      <div ref={containerRef} className="chart-wrap-inner" />
      <div className="fib-leg-icons" aria-hidden={legIcons.length === 0}>
        {legIcons.map(({ leg, left, top }) => (
          <button
            key={`${leg.lowTime}-${leg.highTime}`}
            type="button"
            className="fib-leg-icon"
            style={{
              left,
              top,
              backgroundColor: ICON_COLORS[leg.outcome],
            }}
            title={`Leg: ${leg.lowTime} → ${leg.highTime}`}
            aria-label={`Fibonacci leg details, ${leg.lowTime} to ${leg.highTime}`}
            onClick={() => setSelectedLeg(leg)}
          >
            ƒ
          </button>
        ))}
      </div>
      <FibonacciLegDialog
        open={!!selectedLeg}
        leg={selectedLeg}
        bars={data}
        swingN={swingN}
        onClose={() => setSelectedLeg(null)}
      />
    </div>
  );
}

export default function FibonacciChart(props) {
  if (!props.data?.length) {
    return <p className="systems-chart-empty">Load a symbol to see the chart.</p>;
  }
  return <FibonacciChartInner {...props} />;
}
