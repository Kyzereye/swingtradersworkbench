# System page — definition of done

Use this checklist to decide whether a **Systems** entry is finished.
When something new is required for every system page, add it here, then
re-check existing systems.

A system is **done** only when every box in §1–§6 applies (unless noted as
optional). Chart-only prototypes are **not** done.

Related: `remaining-systems-build-order.md` (what to build next),
`membership-site.md` (tier gating later).

---

## 1. Product rules (locked before coding)

- [ ] Long-only (unless we explicitly decide otherwise for that system)
- [ ] Daily bars only (OHLC; volume optional as filter, not required for core)
- [ ] Signal on the bar that meets the rule; **fill at next open**
- [ ] Defaults documented (sidebar starting values)
- [ ] Entry / exit rules written in plain language (About dialog later)

### Notes

- 

---

## 2. Frontend — system page UI

Catalog id must be in `SystemsTab.jsx` → `AVAILABLE_SYSTEM_IDS`.

### Shell (`TaSystemDashboard`)

- [ ] `is<System>` flag and included in `usesChart`
- [ ] Sidebar layout, top to bottom: Symbol + Load → the **four dialog
      buttons** → the **settings panel**. Nothing else in between.
- [ ] Sidebar: the four dialog buttons — **Top performers**, **Yesterday's
      signals**, **Dow 30**, **Pros & cons** — in a
      `div.ma-controls.ma-controls-actions` **above** the settings panel
      and **not inside** it
- [ ] Sidebar: **every** system-specific input lives in one **expandable
      panel** (`details.expand-panel.sidebar-settings-expand`), **default
      closed**, with `summary.sidebar-settings-summary`. Panel title is
      **`<System name> settings`** (e.g. Darvas settings, MACD settings) —
      not a generic “Chart settings”. No loose inputs outside the panel.
- [ ] Title row **?** → About dialog
- [ ] Chart component with overlays + **entry/exit markers**
- [ ] **Opens & closes** table when trades exist
- [ ] Symbol load via autocomplete / Load
- [ ] Load applies **scanned params** from pair API (else defaults)

### Dialogs

- [ ] `TopPerformersDialog` (system-specific title / note)
- [ ] `YesterdaySignalsDialog` (system-specific title / note)
- [ ] `DowStocksDialog` (system-specific title / note; row click applies params)
- [ ] About dialog (`?`) — must include an **"Optimized numbers"** section
      explaining: which params the scan optimizes and over what grid, that
      the one best combination is chosen per symbol over its full history
      and applied to every signal on that chart (not per signal), that
      Load fills the sidebar with it when a scan row exists, and that it
      is a hindsight fit shown for information — not a recommendation
- [ ] Pros & cons dialog
- [ ] All visible text (labels, headers, badges, notes, dialog copy)
      follows the **Word rules** in `CLAUDE.md` — no trade / win / loss

### Core modules (typical file set)

- [ ] Indicator helper(s) (e.g. `donchian.js`, `keltner.js`, `atr.js`)
- [ ] `*Signals.js` — `simulate*` → `{ trades, markers }`
- [ ] Chart component
- [ ] About + Pros dialogs
- [ ] `optimize*.js` — grid search, full-history $ P/L score
- [ ] `scan*.js` — optimized params + ~2y stored totals / last signal

### Notes

- 

---

## 3. Optimize & scan pipeline

- [ ] Optimizer defaults match sidebar defaults
- [ ] Score for ranking: ~2y window (same pattern as other systems)
- [ ] Param choice: full history $ P/L (1-share, MTM open)
- [ ] `scripts/analyze-<system>.mjs`
- [ ] `npm run analyze-<system>` in root `package.json`
- [ ] Hooked into `pipeline:nightly`

### Notes

- 

---

## 4. Database

Agent does **not** apply DB changes — user runs DDL.

- [ ] `CREATE TABLE system_<name>_scan` in `sql_queries.sql`
- [ ] Table created in the live DB
- [ ] Columns cover: optimized params, `opt_used_default`, running totals,
      trade_count, last_signal, signal_date, signal_close, bar_count, as_of_date
- [ ] Unique key on `(symbol_id, as_of_date)` (same pattern as peers)

### Notes

- 

---

## 5. Backend API

In `scanData.js` + `server.js`:

- [ ] `upsert*ScanRow`
- [ ] `load*PairForSymbol` → `GET /api/systems/<id>/pair`
- [ ] `load*TopPerformers` → `GET /api/systems/<id>/top-performers`
- [ ] `load*YesterdaySignals` → `GET /api/systems/<id>/yesterday-signals`
- [ ] `load*DowStocks` → `GET /api/systems/<id>/dow`
- [ ] Frontend fetch URLs wired for this system

### Notes

- 

---

## 6. Verify end-to-end (human)

- [ ] Backend restarted after new routes
- [ ] `npm run analyze-<system>` completed successfully
- [ ] Chart shows markers for a known active symbol
- [ ] Opens & closes populated when in/through trades
- [ ] Load pulls optimized params (when scan row exists)
- [ ] Top performers / Yesterday / Dow open and list data
- [ ] About + Pros open and match the rules actually coded

### Notes

- 

---

## 7. Explicitly out of scope (unless we add them to §1–§6)

Do **not** block “system page done” on these unless promoted above:

- ATR position sizing / pyramiding / shorts
- Required volume filter
- Intraday / ORB-style data
- Membership tier gating (`membership-site.md`)
- Email / text alerts
- Favorites / stacks

### Notes

- 

---

## 8. Per-system verification matrix

Copy a row when a system ships. Mark **Y** / **N** / **—**.

| System id | Rules | UI+dialogs | Optimize/scan | SQL+DB | APIs | E2E verify | Done? |
|-----------|-------|------------|---------------|--------|------|------------|-------|
| `ma-crossover` | Y | Y | Y | Y | Y | Y | Y |
| `triple-ma` | Y | Y | Y | Y | Y | Y | Y |
| `macd` | Y | Y | Y | Y | Y | Y | Y |
| `rsi` | Y | Y | Y | Y | Y | Y | Y |
| `donchian` | Y | Y | Y | Y | Y | Y | Y |
| `keltner` | Y | Y | Y | Y | Y | Y | Y |
| `bollinger-squeeze` | Y | Y | Y | Y* | Y | — | code |
| `darvas` | Y | Y | Y | Y* | Y | — | code |
| `fibonacci` | Y | Y | Y | Y* | Y | Y** | code |
| *(next)* | | | | | | | |

\* SQL DDL in repo; live DB + analyze script + E2E verify are the user’s ops steps.
\*\* Chart/markers/dialogs/settings verified live in a browser (AAPL) with real
bars; Top/Yesterday/Dow/scanned-param-on-Load still need the DDL applied +
`npm run analyze-fibonacci` before they'll return data — verified they fail
gracefully (visible error in the dialog, not a crash) until then.

### Notes

- 

---

## 9. Changelog to this definition

| Date | Change |
|------|--------|
| 2026-09-10 | Settings expandable panel title must be “System name settings” (e.g. Darvas settings), not “Chart settings” |
| 2026-09-10 | Sidebar system settings must be an expandable panel, default closed |
| 2026-09-09 | Initial definition of done from MA / Triple / MACD / RSI / Donchian / Keltner pipeline |
