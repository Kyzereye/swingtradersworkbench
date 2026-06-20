import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CACHE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "data",
  "chart-cache"
);

function cachePath(symbol) {
  return path.join(CACHE_DIR, `${String(symbol).toUpperCase()}.json`);
}

/** Persist trades/markers from analyze-symbols for chart display (no DB schema change). */
export function writeChartCache(symbol, scan) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(
    cachePath(symbol),
    `${JSON.stringify({
      trades: scan.trades ?? [],
      markers: scan.markers ?? [],
    })}\n`
  );
}

export function readChartCache(symbol) {
  const file = cachePath(symbol);
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    return {
      trades: Array.isArray(raw.trades) ? raw.trades : [],
      markers: Array.isArray(raw.markers) ? raw.markers : [],
    };
  } catch {
    return null;
  }
}
