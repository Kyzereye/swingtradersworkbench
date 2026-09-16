/**
 * Optimize Fibonacci retracement/extension per symbol (max 1-share $ P/L,
 * full history) → system_fibonacci_scan (stored totals = last ~2y).
 *
 *   npm run analyze-fibonacci
 *   npm run analyze-fibonacci -- --symbol AAPL
 *   npm run analyze-fibonacci -- --limit 10
 */

import { scanFibonacci } from "../frontend/src/scanFibonacci.js";
import { closePool } from "../backend/src/db.js";
import {
  listActiveSymbols,
  loadBarsForSymbol,
  upsertFibonacciScanRow,
} from "../backend/src/scanData.js";
import { PIPELINE_QUIET } from "./is-pipeline-quiet.mjs";

const DELAY_MS = Number(process.env.SCAN_DELAY_MS) || 0;

function parseArgs(argv) {
  const args = argv.slice(2);
  let symbol = null;
  let limit = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--symbol" && args[i + 1]) {
      symbol = args[++i].toUpperCase();
    } else if (args[i] === "--limit" && args[i + 1]) {
      limit = Number(args[++i]);
    }
  }
  return { symbol, limit };
}

function sleep(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((r) => setTimeout(r, ms));
}

async function analyzeOne(sym) {
  const bars = await loadBarsForSymbol(sym);
  if (!bars.length) {
    return { sym, status: "skip", reason: "no bars" };
  }
  const result = scanFibonacci(bars);
  if (!result) {
    return { sym, status: "skip", reason: "analyze failed" };
  }
  await upsertFibonacciScanRow(sym, result);
  return { sym, status: "ok", ...result };
}

async function main() {
  const { symbol, limit } = parseArgs(process.argv);

  let symbols = symbol ? [symbol] : await listActiveSymbols();
  if (!symbols.length) {
    console.error("No active symbols to analyze in stock_symbols.");
    process.exitCode = 1;
    return;
  }
  if (limit != null && Number.isFinite(limit) && limit > 0) {
    symbols = symbols.slice(0, limit);
  }

  if (!PIPELINE_QUIET) {
    console.log(`Fibonacci optimize ${symbols.length} symbol(s)…\n`);
  }

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const t0 = Date.now();

  for (const sym of symbols) {
    try {
      const r = await analyzeOne(sym);
      if (r.status === "ok") {
        ok++;
        if (!PIPELINE_QUIET) {
          const pct =
            r.runningTotalPct == null
              ? "n/a"
              : `${r.runningTotalPct >= 0 ? "+" : ""}${r.runningTotalPct.toFixed(1)}%`;
          const rt = `${r.runningTotal >= 0 ? "+" : ""}${r.runningTotal.toFixed(2)}`;
          console.log(
            `${sym.padEnd(6)} N${r.optSwingN} ${r.optEntryLevel}/${r.optExtensionTarget}  RT ${rt}  ${pct}  trades ${r.tradeCount}  ${r.lastSignal}`
          );
        }
      } else {
        skipped++;
        if (!PIPELINE_QUIET) {
          console.log(`${sym.padEnd(6)} skipped (${r.reason})`);
        }
      }
    } catch (err) {
      failed++;
      console.error(`${sym.padEnd(6)} ERROR: ${err.message || err}`);
    }
    await sleep(DELAY_MS);
  }

  if (!PIPELINE_QUIET) {
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `\nDone in ${sec}s — ok: ${ok}, skipped: ${skipped}, failed: ${failed}`
    );
  }
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 2;
  })
  .finally(() => closePool());
