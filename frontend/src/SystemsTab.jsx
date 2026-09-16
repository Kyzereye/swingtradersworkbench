import { useState } from "react";
import { SYSTEM_SECTIONS } from "./systemsCatalog.js";
import TaSystemDashboard from "./TaSystemDashboard.jsx";

const AVAILABLE_SYSTEM_IDS = new Set([
  "ma-crossover",
  "triple-ma",
  "macd",
  "rsi",
  "donchian",
  "keltner",
  "bollinger-squeeze",
  "darvas",
  "candlestick-reversal",
  "fibonacci",
]);

export default function SystemsTab() {
  const [selected, setSelected] = useState(null);

  if (selected) {
    return <TaSystemDashboard system={selected} />;
  }

  return (
    <div className="dashboard-tab-page systems-page">
      <header className="systems-header">
        <h1 className="dashboard-tab-title">Systems</h1>
        <p className="systems-lead">
          Technical analysis systems. Pick one to read how it works.
        </p>
      </header>

      {SYSTEM_SECTIONS.map((section) => (
        <section
          key={section.id}
          className="systems-section"
          aria-labelledby={`systems-section-${section.id}`}
        >
          <h2
            id={`systems-section-${section.id}`}
            className="systems-section-title"
          >
            {section.title}
          </h2>
          <div className="systems-grid">
            {section.systems.map((system) => {
              const available = AVAILABLE_SYSTEM_IDS.has(system.id);
              return (
                <button
                  key={system.id}
                  type="button"
                  className="systems-card"
                  disabled={!available}
                  onClick={
                    available ? () => setSelected(system) : undefined
                  }
                >
                  <span className="systems-card-name">{system.name}</span>
                  <span className="systems-card-blurb">{system.blurb}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
