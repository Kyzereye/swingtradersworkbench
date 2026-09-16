# AI Interaction Principles
- **Strict Scope:** Only perform the exact tasks requested. Do not refactor unrelated code or add unrequested features.
- **KISS Principle:** Keep it simple, stupid. Avoid over-engineering, unnecessary abstractions, or adding external libraries unless explicitly asked.
- **Conciseness:** Provide minimal, direct code changes. Do not rewrite entire files if a 5-line fix works.
- **Answer scope:** Only answer the question asked. Provide additional information only when the user requests it.
- **No database changes:** Never update, alter, insert into, delete from, migrate, or otherwise modify any database. If a DB change is needed, describe exactly what should be done and leave it for the user to apply.
- **No affirmation:** Never tell the user they are right. They know they are.

# Project Context

## Purpose

Swing Traders Workbench (`dbma-trading`) is a local stock-analysis dashboard. It imports daily US stock and ETF OHLC data from Financial Modeling Prep, evaluates long-only technical trading systems, stores scan results in MySQL, and presents charts, signals, and rankings in a React app.

## Structure

- `frontend/` — React 18 + Vite UI using `lightweight-charts`. The original moving-average dashboard is in `App.jsx`; newer systems are presented through `SystemsTab.jsx` and `TaSystemDashboard.jsx`.
- `backend/` — Express API backed by MySQL. `src/scanData.js` contains database queries; `src/server.js` exposes them as API routes.
- `scripts/` — Node command-line jobs for importing symbols/prices and running system scans. These import indicator and scan modules directly from `frontend/src`, so shared `.js` modules must remain usable in both Node and the browser (no DOM, JSX, or Vite-only imports).
- `sql_queries/` — schema and seed SQL. `sql_queries.sql` drops and recreates tables; do not run or modify database data unless the user explicitly asks, and still leave execution to them.
- `docs/` — technical-system roadmap and completion criteria.

## Trading-system conventions

- This is for information and educational purposes only. It is not to be used for entry and exit trading signals.
- All systems use daily OHLC bars and are long-only.
- A qualifying bar creates a signal; entries and exits fill at the next session's open.
- Trade P/L is one-share dollar P/L; open positions are marked to the final close.
- Optimizers choose parameters from full-history dollar P/L, while ranking scores use approximately the latest two years.
- Each system generally has indicator, signal simulation, optimizer, scan, script, database-query/API, and chart/dialog components. Keltner is the clearest reference implementation.

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

## Common commands

```bash
npm run dev
npm run build --prefix frontend
npm run get-daily-price-data
npm run analyze-<system>
npm run pipeline:nightly
```

Install dependencies with `npm install`, `npm install --prefix backend`, and `npm install --prefix frontend`. Configuration and API credentials belong in `backend/.env` and must not be committed.

## Verification

No automated test suite or linter is configured. For UI/system changes, follow `docs/system-page-definition-of-done.md` and at minimum build the frontend with `npm run build --prefix frontend` when the change affects it.
