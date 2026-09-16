# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Interaction rules (from `.cursorrules` / `AGENTS.md`)

- **Strict scope:** only do the exact task requested. No unrelated refactors, no unrequested features.
- **KISS:** no new abstractions or external libraries unless explicitly asked. Minimal, direct edits — don't rewrite a file when a 5-line fix works.
- **No database changes:** never run DDL/DML against any database. Put DDL in `sql_queries/sql_queries.sql` and tell the user exactly what to apply; the user runs it.
- **No affirmation:** don't tell the user they are right.
- **Answer the question asked:** when the user asks a question, answer it. Don't pivot into unrequested fixes, implementations, or scope expansion — offer them separately and wait to be asked.

## Product scope

- This site is for education and backtesting information only. It is not for trading signals.
- This is for information and educational purposes only. It is not to be used for entry and exit trading signals.
- There will be no risk-management tools within the systems components.

## Word rules

The site describes what a rule did on past data, not what a person should do. In any text a visitor reads — UI labels, table headers, badges, dialog copy, notes, tooltips — do not use *trade, win, loss* or their forms. Use:

| Avoid | Use |
|---|---|
| trade (noun, the round trip) | signal, or entry/exit pair |
| trade / traded / trading (verb) | signaled, produced an entry |
| "Trade" (heading) | Entry & exit |
| open (a position still on) | active |
| win / loss (outcome) | gain / decline |
| winning / losing | positive / negative |
| win % | % positive |
| trades (column / count) | signals |
| "N traded" | "N with signals" |
| NO TRADE | NO SIGNAL |
| trading session / trading day | session |
| swing trading (as an activity) | swing analysis / daily-bar analysis |
| trader(s) | analyst(s), reader(s), or rephrase around the rule |
| P/L, stop, target, entry, exit, Opens & closes | keep — arithmetic and level names |

Exceptions: the brand name "JJK Trading Labs"; the legal disclaimer; code identifiers, CSS class names, DB columns, API field names, and code comments. Only visible text changes.

## Commands

No test suite and no linter are configured. Verification is manual (see `docs/system-page-definition-of-done.md` §6).

```bash
npm install && npm install --prefix backend && npm install --prefix frontend

npm run dev                      # backend (:3001, node --watch) + frontend (Vite :5173, proxies /api)
npm run build --prefix frontend  # vite build → frontend/dist

# Data pipeline (all read backend/.env; need MySQL + FMP_API_KEY)
npm run get-symbols              # FMP → stock_symbols
npm run get-bulk-price-data      # first-time ~HISTORY_YEARS of OHLC → daily_stock_data
npm run get-daily-price-data     # nightly new bars
npm run analyze-symbols          # legacy MA scan → symbol_daily_scan (Signals / Daily log tabs)
npm run analyze-<system>         # per-system optimize+scan → system_<name>_scan
npm run pipeline:nightly         # prices → analyze-symbols → every analyze-<system>

# Every analyze/ingest script accepts:
npm run analyze-keltner -- --symbol AAPL
npm run analyze-keltner -- --limit 10
```

`SCAN_DELAY_MS` / `INGEST_DELAY_MS` env vars throttle loops. Backend must be restarted manually after adding routes when not using `npm run dev`.

## Architecture

Three npm workspaces-by-hand (root, `backend/`, `frontend/`), all ESM.

- **`backend/src`** — Express API over MySQL (`mysql2` pool in `db.js`, `.env` loaded from `backend/.env`). `scanData.js` (~2.5k lines) holds every SQL query: bar loading, per-system `upsert*ScanRow`, and the four read queries per system. `server.js` is thin route wrappers around those.
- **`frontend/src`** — React 18 + Vite + `lightweight-charts`. Flat directory; files are grouped by naming prefix per trading system, not by folder. The legacy price-vs-MA system lives in `App.jsx` / `tradeSignals.js` / `scanSymbol.js`; the **Systems** tab (`SystemsTab.jsx` → `TaSystemDashboard.jsx`) hosts the newer catalog systems.
- **`scripts/*.mjs`** — Node CLIs run by cron. **They import pure-JS modules directly from `frontend/src`** (e.g. `scripts/analyze-keltner.mjs` imports `../frontend/src/scanKeltner.js`). Therefore `*.js` files under `frontend/src` that scripts touch must stay browser- and Node-safe (no DOM, no JSX, no Vite-only imports).
- **`sql_queries/sql_queries.sql`** — full schema; **drops and recreates** tables. One `system_<name>_scan` table per system, unique on `(symbol_id, as_of_date)`.

### Per-system file set (the pattern to copy)

Every catalog system with id `<id>` (see `systemsCatalog.js`) is built from the same parts. Use Keltner as the cleanest reference:

| Layer | File(s) | Role |
|---|---|---|
| Indicator | `frontend/src/keltner.js`, `atr.js`, `ma.js` | pure series math |
| Simulation | `keltnerSignals.js` → `simulateKeltner(bars, ...params)` | returns `{ trades, markers }`; markers `text` is `"Open"`/`"Close"` |
| Optimizer | `optimizeKeltner.js` → `optimizeKeltner(bars)` | grid search, returns `{ best, usedDefault }`; exports `scoreWindowStart` |
| Scan | `scanKeltner.js` → `scanKeltner(bars)` | combines the above into one row for the DB |
| CLI | `scripts/analyze-keltner.mjs` | loops symbols, calls scan, `upsertKeltnerScanRow` |
| Backend | `scanData.js`: `upsertKeltnerScanRow`, `loadKeltnerPairForSymbol`, `loadKeltnerTopPerformers`, `loadKeltnerYesterdaySignals`, `loadKeltnerDowStocks` | |
| Routes | `GET /api/systems/<id>/{pair,top-performers,yesterday-signals,dow}` | |
| UI | `KeltnerChart.jsx`, `KeltnerAboutDialog.jsx`, `KeltnerProblemsDialog.jsx`; `is<System>` flag + `usesChart` in `TaSystemDashboard.jsx`; id added to `AVAILABLE_SYSTEM_IDS` in `SystemsTab.jsx` | |

`TaSystemDashboard.jsx` (~2k lines) is one shared shell with per-system `if` branches rather than a plugin registry — expect to add branches there for sidebar inputs, chart selection, dialogs, and fetch URLs.

### Trading conventions (shared by all systems)

- Long-only, daily OHLC bars. Signal on the bar that meets the rule, **fill at next open** (`pendingEntry` / `pendingExit` pattern in `*Signals.js`).
- P/L is **1-share $ P/L with open trades marked to the last close** (`util/tradePnl.js`: `runningTotalWithMtm`, `runningTotalPctWithMtm`).
- Optimizer picks params by full-history $ P/L; stored ranking totals use the last ~2 years (`SCORE_BARS = 504`, `scoreWindowStart`).
- Optimizer defaults must equal the sidebar defaults in `TaSystemDashboard.jsx`.
- Scan row fields: optimized params, `optUsedDefault`, `runningTotal`, `runningTotalPct`, `tradeCount`, `lastSignal` (`entry`|`exit`|`open`|`none`), `signalDate`, `signalClose`, `barCount`, `asOfDate`.

## Docs

- `docs/system-page-definition-of-done.md` — the checklist a system must satisfy; §8 tracks per-system status. Update it when a system ships.
- `docs/remaining-systems-build-order.md` — which systems are next and why; daily-only data rules out intraday systems (ORB, classic VWAP).
- `docs/tech-systems.md` — source list the Systems catalog is generated from.
- `README.md` — env setup, fresh-install SQL, cron examples, API table.
