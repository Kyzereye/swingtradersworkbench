# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Swing-trading workbench ("JJK Trading Labs", package name `dbma-trading`): daily OHLC charts with
moving-average signals, per-symbol MA optimization, and a nightly scan stored in MySQL.
Three parts in one repo, npm workspaces are *not* used — each part has its own `package.json`:

- `backend/` — Express + mysql2 read-only JSON API (port 3001)
- `frontend/` — Vite + React 18 + `lightweight-charts` (port 5173, proxies `/api` → 3001)
- `scripts/` — Node `.mjs` CLI jobs for data ingest and the nightly scan (run from repo root)

## Commands

```bash
npm install && npm install --prefix backend && npm install --prefix frontend
npm run dev                      # backend (node --watch) + frontend concurrently
npm run build --prefix frontend  # production bundle to frontend/dist
npm start --prefix backend       # backend without watch

npm run get-symbols              # FMP screener → stock_symbols
npm run get-bulk-price-data      # first-time load, ~HISTORY_YEARS of EOD bars
npm run get-daily-price-data     # nightly incremental bars (--no-cleanup keeps old rows)
npm run analyze-symbols          # nightly scan → symbol_daily_scan
npm run pipeline:nightly         # get-daily-price-data then analyze-symbols
npm run sync-symbol-changes      # FMP renames/delistings
npm run optimize:ma -- AAPL      # CLI MA grid search (hits the running backend API)
```

Ingest/scan scripts accept `--symbol AAPL[,TSLA]` and `--limit N` for quick single-symbol runs —
use these instead of full-universe runs while developing.

There is no test suite, linter, or formatter. Verification means running a script against one
symbol and/or exercising the UI.

## Configuration

All env lives in `backend/.env` (gitignored) and is loaded by `backend/src/db.js` and
`backend/src/server.js` via explicit `dotenv` paths — scripts pick it up because they import
`backend/src/db.js`. Key vars: `MYSQL_*`, `FMP_API_KEY`, `HISTORY_YEARS` (default 3),
`FRONTEND_URL` (the CORS allowlist), `INGEST_DELAY_MS`/`SCAN_DELAY_MS`.

Note `sql_queries/sql_queries.sql` starts with `USE StockPxLabs;` while the README references
`dbma-trading` — the live DB name is whatever `MYSQL_DATABASE` says; adjust the `USE` line to match
before applying the schema. That file **drops** all app tables; it is for fresh installs only.

## Architecture

### Shared strategy code lives in the frontend

The signal engine is `frontend/src/` ES modules with no React or DOM dependency, and the Node
scripts import them directly across the directory boundary:

- `ma.js` — EMA/SMA series; `buildSmaIndexCache` precomputes SMA arrays per period for the grid search
- `adx.js` — `computeAdxSeries` (Wilder ADX by bar index) for the optional regime entry gate,
  and `computeAtrSeries` (Wilder ATR, same indexing) used by the pullback diagnostic
- `pullbackTendency.js` — `computePullbackTendency`: per-symbol pullback depth and fast-MA
  pierce rates. Diagnostic only, not part of the scan; see `docs/pullback-tendency-task.md`
- `tradeSignals.js` — `simulateTrades` (date-keyed) and `simulateTradesWithMaCache` (index-keyed, fast path)
- `optimizeMa.js` — grid search fast 8–30 × slow 30–100 step 2, SMA only; ranks by `min(3y, 1y)` compounded return with minimum-trade-count filters
- `scanSymbol.js` — one symbol's nightly result: optimized pair + trades + `lastSignal`

`scripts/analyze-symbols.mjs` and `scripts/optimize-ma.mjs` import these so the CLI, nightly scan,
and browser chart always produce identical signals. **Keep the two `simulateTrades*` variants in
sync** — they duplicate the same rule set deliberately, and a change to one alone silently makes
the chart disagree with the stored scan.

### Trading rules (documented for users in `frontend/src/TradingRules.jsx`)

Price-vs-MA, not MA crossover. Entry: flat, close > slow MA, close > fast MA, fast > slow;
`entryConfirm: 'double'` additionally requires two consecutive closes above fast. Exit: close below
`fast × (1 − exitBufferPct/100)`. Signals fire on a bar's close; fills use the **next** bar's open,
so a signal on the final bar produces a marker but no trade. Trades still open at the end of history
carry `open: true` and are excluded from return math.

Chart tab uses the user's sidebar periods/confirm/buffer; the nightly scan always uses SMA, single
confirm, zero buffer, with per-symbol optimized periods. `TradingRules.jsx` is user-facing
documentation of this behavior — update it when the rules change.

### Data flow

FMP `/stable` API → `scripts/get-*-price-data.mjs` (shared logic in `scripts/get-stock-data.mjs`)
→ `daily_stock_data` → `analyze-symbols` → `symbol_daily_scan` (unique on `symbol, as_of_date`,
upserted) → backend API → React tabs. The backend never computes signals; it only reads
precomputed scan rows and raw bars.

### Backend

`backend/src/server.js` is routes + validation only; all SQL is in `backend/src/scanData.js`
(also the script-side helpers `listScannableSymbols`, `loadBarsForSymbol`, `upsertScanRow`).
`db.js` exports a shared pool plus `closePool()`, which one-off scripts must call to exit.
"Latest scan date" is the `as_of_date` with the most rows, not `MAX(as_of_date)` — this is
deliberate so a partial run (or a weekend) doesn't blank the dashboard.

Endpoints: `/api/health`, `/api/symbols`, `/api/daily-stock-data`, `/api/scanner`,
`/api/scanner/day`, `/api/dashboard/top-performers`, `POST /api/pageview`. The README's endpoint
table omits the last two.

Pageviews are counted in `data/pageviews.json` via `backend/src/pageviews.js` (bot user-agents
skipped) — the only non-MySQL persistence. `data/` is gitignored.

### Frontend

`App.jsx` holds all top-level state: a `page` switch (`app` | `rules`) plus a `tab` switch
(`home` | `chart` | `signals` | `daily` | `symbolchanges`) rendered by `DashboardTabs.jsx`.
No router; no state library. Favorites and disclaimer acceptance persist in `localStorage`.
Styling is one hand-written `index.css` (~1100 lines) with plain class names — no CSS framework.
