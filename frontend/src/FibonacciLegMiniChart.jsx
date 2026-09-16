import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import {
  EXTENSION_RATIOS,
  RETRACEMENT_RATIOS,
  extensionPrice,
  retracementPrice,
} from "./fibonacci.js";

const CHART_HEIGHT = 300;

/**
 * Static chart of one leg: the bars around it, the low→high line, and
 * the retracement/extension levels as labeled price lines — the classic
 * fib-tool look, for a single leg only.
 */
export default function FibonacciLegMiniChart({ bars, leg, swingN = 10 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !bars?.length || !leg) return undefined;

    const trade = leg.trade;
    const exitIndex = trade?.exitDate
      ? bars.findIndex((b) => b.date === trade.exitDate)
      : -1;
    const from = Math.max(0, leg.lowIndex - swingN);
    const to = Math.min(
      bars.length - 1,
      Math.max(leg.highIndex, exitIndex) + swingN
    );
    const slice = bars.slice(from, to + 1);

    const chart = createChart(el, {
      width: el.clientWidth,
      height: CHART_HEIGHT,
      layout: { background: { color: "transparent" }, textColor: "#8b9bab" },
      grid: {
        vertLines: { color: "#2d3a4a" },
        horzLines: { color: "#2d3a4a" },
      },
      // Level tags read on the left, next to the leg's start.
      leftPriceScale: {
        visible: true,
        borderColor: "#2d3a4a",
        // Keep the 0% tag clear of the attribution logo in the corner.
        scaleMargins: { top: 0.1, bottom: 0.18 },
      },
      rightPriceScale: { visible: false },
      timeScale: { borderColor: "#2d3a4a" },
      handleScroll: false,
      handleScale: false,
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#6abf69",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#6abf69",
      wickDownColor: "#ef5350",
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: "left",
    });
    candles.setData(
      slice.map((b) => ({
        time: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }))
    );

    const legLine = chart.addSeries(LineSeries, {
      color: "#f5b942",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      priceScaleId: "left",
    });
    legLine.setData([
      { time: leg.lowTime, value: leg.lowPrice },
      { time: leg.highTime, value: leg.highPrice },
    ]);

    const level = (price, title, color) =>
      candles.createPriceLine({
        price,
        title,
        color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
      });
    level(leg.highPrice, "100%", "#f5b942");
    level(leg.lowPrice, "0%", "#f5b942");
    for (const r of RETRACEMENT_RATIOS) {
      level(retracementPrice(leg, r), `${(r * 100).toFixed(1)}%`, "#9aa8b8");
    }
    for (const r of EXTENSION_RATIOS) {
      level(extensionPrice(leg, r), `${(r * 100).toFixed(1)}%`, "#3b82f6");
    }

    const markers = [];
    if (trade) {
      markers.push({
        time: trade.entryDate,
        position: "belowBar",
        shape: "arrowUp",
        color: "#6abf69",
        text: "Open",
      });
      if (trade.exitDate) {
        markers.push({
          time: trade.exitDate,
          position: "aboveBar",
          shape: "arrowDown",
          color: "#ef5350",
          text: "Close",
        });
      }
    }
    const markersApi = createSeriesMarkers(candles, markers);

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
      chart.timeScale().fitContent();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      markersApi.detach?.();
      chart.remove();
    };
  }, [bars, leg, swingN]);

  return <div ref={containerRef} className="fib-leg-mini-chart" />;
}
