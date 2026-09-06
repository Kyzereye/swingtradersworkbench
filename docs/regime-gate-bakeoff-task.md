# Task: ADX regime-gate bakeoff — validate

The bakeoff script already exists: `scripts/regime-gate-bakeoff.mjs`.
This task is **run + judge**, not rewrite the engine.

## 1. What to do

**User runs** the scripts below (Claude does **not** run the full Dow/S&P bakeoffs).

**Claude** then:

1. Read only the **summary tables + conclusion** in the report files (not every per-symbol appendix).
2. Write **`docs/regime-gate-analysis.md`**.
3. Apply the decision rule. Do not invent numbers. Do not change strategy code unless asked separately.

## 2. How the user gets the reports

Prerequisites: MySQL + `backend/.env`; `daily_stock_data` and `symbol_daily_scan` populated.
S&P run needs network once for the constituent list.

```bash
# optional smoke
node scripts/regime-gate-bakeoff.mjs --symbol AAPL

# Dow smoke (do not decide on this alone)
node scripts/regime-gate-bakeoff.mjs --universe=dow30

# real test
node scripts/regime-gate-bakeoff.mjs
```

Writes:

- `docs/regime-gate-bakeoff-dow30.md`
- `docs/regime-gate-bakeoff-sp500.md`

## 3. What was tested

- Gate: new opens only if ADX(14) > N; never forces exits.
- Thresholds: `off`, 15, 20, 25, 30 (`off` = today’s system, exit buffer 0).
- Fixed: optimized MA (or 21/50), SMA, single confirm, `exitBufferPct = 0`.
- Metrics include trades, compounded return %, win rate, hold days, entries blocked, time in market %.

## 4. Decision rule

Adopt a threshold only if, on the **S&P 500** report, it beats `off` on:

1. **Median return**, and  
2. **Improved > worsened** (symbol count vs `off` on return %).

Dow is smoke only — not the decision sample.

## 5. What to put in `docs/regime-gate-analysis.md`

1. One-line setup (script, thresholds, universes run).
2. Dow summary: did any threshold look good? Remind: do not decide on Dow.
3. S&P summary table (median return, median trades, improved/worsened, entries blocked / time in market if present) per threshold.
4. Pass/fail against the decision rule for each threshold.
5. Recommendation: keep gate **off**, or adopt **ADX > N**, with one sentence why.
6. Optional: one Chart spot-check note (AAPL `off` should match report `off` row).
