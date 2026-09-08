import CandlestickChart from "../CandlestickChart.jsx";

/** Shared systems-tab chart shell (candles + optional MAs + markers). */
export default function SystemsChart({
  data,
  markers = [],
  fastPeriod,
  mediumPeriod = null,
  slowPeriod,
  maType,
}) {
  if (!data?.length) {
    return <p className="systems-chart-empty">Load a symbol to see the chart.</p>;
  }

  return (
    <CandlestickChart
      data={data}
      markers={markers}
      fastPeriod={fastPeriod}
      mediumPeriod={mediumPeriod}
      slowPeriod={slowPeriod}
      maType={maType}
    />
  );
}
