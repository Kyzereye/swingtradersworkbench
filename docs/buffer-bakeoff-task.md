# Task: Exit-buffer bakeoff (DOW 30)

## 1. What to do

Write **`scripts/buffer-bakeoff-dow30.mjs`** (Node ESM) only.

- Do **not** run the script (the user will).
- Do **not** compute results or write the report in chat.
- Put the run command in a script header comment.
- Vary only `exitBufferPct`. Do not change core open/close rules. No CHOP/ADX/structural exit/entry buffer. No unrelated refactors.
- Import `simulateTrades` from `frontend/src/tradeSignals.js` (do not reimplement rules).
- Buffer `0` must match Chart with Exit buffer % = none.

## 2. How to get the data

- Use `loadBarsForSymbol` and `loadOptimizedMaForSymbol` from `backend/src/scanData.js`.
- Call `closePool` from `backend/src/db.js` when finished.
- Read from MySQL only (`backend/.env`). Do not call FMP. Do not use the HTTP API.

## 3. What data it needs

**Symbols (Dow 30):**  
AAPL, AMGN, AMZN, AXP, BA, CAT, CRM, CSCO, CVX, DIS, DOW, GS, HD, HON, IBM, JNJ, JPM, KO, MCD, MMM, MRK, MSFT, NKE, NVDA, PG, SHW, TRV, UNH, V, VZ, WMT

**Per symbol:**

- Daily OHLC bars from `daily_stock_data` (via `loadBarsForSymbol`; history window = `HISTORY_YEARS`, default 3).
- Fast/slow MA periods from latest `symbol_daily_scan` (via `loadOptimizedMaForSymbol`); if none, use **21 / 50** SMA.
- Skip symbols with no/insufficient bars; note skips in the report.

**Buffers to test:** `exitBufferPct` in `[0, 0.5, 1, 1.5, 2, 3, 4, 5]`.

## 4. What to do with the data

For each symbol × each buffer:

1. `simulateTrades(bars, fast, slow, "sma", { exitBufferPct })`.
2. From closed trades: trade count; compounded return % = ∏(exit/entry)−1 × 100; win rate; average calendar days in trade.
3. Optionally count still-open trades.

## 5. What to report and where

When the user runs the script, it must write **`docs/buffer-bakeoff-dow30.md`** containing:

1. Run command + prerequisites; history window used.
2. Summary per buffer: median/mean return %; median/mean trade count; median win rate; # symbols improved / worsened vs buffer 0 on return %; # with fewer trades vs 0.
3. Per-symbol appendix: symbol, buffer, trades, return %, win rate.
4. Brief conclusion: better overall? best buffer tradeoff?
