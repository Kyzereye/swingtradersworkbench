/**
 * Fills the scan tables in the TEST database by running each analyze script
 * for the seed symbols. Refuses any database whose name doesn't end in "_test".
 *
 *   MYSQL_DATABASE=StockPxLabs_test npm run test:seed-scans
 */

import { spawnSync } from "node:child_process";

const SYMBOLS = ["AAPL", "MSFT", "SPY"];
const ANALYZE_SCRIPTS = [
  "analyze-symbols",
  "analyze-ma-crossover",
  "analyze-triple-ma",
  "analyze-macd",
  "analyze-rsi",
  "analyze-donchian",
  "analyze-keltner",
  "analyze-bollinger",
  "analyze-darvas",
  "analyze-fibonacci",
  "analyze-point-figure",
];

const database = process.env.MYSQL_DATABASE || "";
if (!database.endsWith("_test")) {
  console.error(`Refusing to run: MYSQL_DATABASE is "${database}". It must end in "_test".`);
  console.error("Run: MYSQL_DATABASE=StockPxLabs_test npm run test:seed-scans");
  process.exit(1);
}

for (const script of ANALYZE_SCRIPTS) {
  for (const symbol of SYMBOLS) {
    console.log(`${script} ${symbol} → ${database}`);
    const result = spawnSync("npm", ["run", "--silent", script, "--", "--symbol", symbol], {
      stdio: "inherit",
      env: process.env,
    });
    if (result.status !== 0) {
      console.error(`${script} failed for ${symbol}.`);
      process.exit(result.status ?? 1);
    }
  }
}

console.log(`Done. Scan tables in ${database} are filled for ${SYMBOLS.join(", ")}.`);
