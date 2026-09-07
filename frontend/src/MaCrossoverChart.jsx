import CandlestickChart from "./CandlestickChart.jsx";

/** Main-body chart for the MA crossover system dashboard. */
export default function MaCrossoverChart({
  data,
  markers = [],
  fastPeriod,
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
      slowPeriod={slowPeriod}
      maType={maType}
    />
  );
}
