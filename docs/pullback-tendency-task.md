# Task: Pullback tendency (per-symbol diagnostic)

## 1. What to do

The script already exists: **`scripts/pullback-tendency.mjs`**, plus the metric module
`frontend/src/pullbackTendency.js` and one added export (`computeAtrSeries`) in
`frontend/src/adx.js`.

This task is **run + judge**, not build.

- **User runs** the commands in §2. Claude does not run the Dow/S&P jobs.
- **Claude** then reads only the **summary tables + conclusion** (not the per-symbol appendix) and
  writes `docs/pullback-tendency-analysis.md` against the decision rule in §4.
- Do not invent numbers. Do not change strategy code off the back of this without a separate task.

This is a **diagnostic**. No exit buffer — it lost in both directions
(`docs/improvement-options.md` §1) and is not revisited. `simulateTrades` is called with its
defaults, so the return columns are the same numbers the nightly scan produces.

## 2. How the user gets the reports

Prerequisites: MySQL + `backend/.env`; `daily_stock_data` and `symbol_daily_scan` populated.
The S&P run needs network once for the constituent list.

```bash
# spot-check one name (writes docs/pullback-tendency-symbols.md, not a universe report)
node scripts/pullback-tendency.mjs --symbol AAPL

# Dow smoke — confirms it runs; NOT a decision sample
node scripts/pullback-tendency.mjs --universe=dow30

# the real test
node scripts/pullback-tendency.mjs
```

Writes:

- `docs/pullback-tendency-dow30.md`
- `docs/pullback-tendency-sp500.md`

A symbol that fails a definition check is **noted, excluded from the tables and the run continues** —
it lands in the report's `## Flagged symbols` section. A non-empty flagged list means a bug in the
walk worth chasing, but it never costs you the rest of the job.

## 3. What is measured

Per symbol, over `HISTORY_YEARS` of daily bars, using that symbol's optimized SMA pair (else 21/50):

- **Pullback episode** — inside a trend-intact segment (close > slow, fast > slow), price below the
  running peak of `high`, ending on a new high (**recovered**) or a segment break (**break**).
- **Depth** — peak → trough, in percent and in ATR units, over **all** episodes clearing the 1%
  noise floor. Break episodes are **included**: they are often the deep ones and cluster in the
  choppy names, so excluding them would tend to make bad symbols look shallow. They are not always
  deep — with fast and slow close together a segment can break on a shallow wobble — so the
  recovered/break split is reported, never asserted.
- **Pierce rate** — headline figure uses **recovered episodes only**, because a break by
  close ≤ slow while fast > slow implies close < fast, making break episodes pierced by
  construction. All-episode and per-bar rates are reported alongside.
- **Persistence** — the same metrics on the first and second half of the window, rank-correlated
  across symbols. Halves are partitioned from one full-history walk by episode peak index, not
  re-walked from a slice, so no artificial segment boundary is created at the midpoint.
- **Two returns** — the optimized pair (selection-biased, matches the dashboard) and a fixed 21/50
  control with no per-symbol selection.

## 4. Decision rule (set before running)

1. **Persistence gate.** A metric with first-half → second-half Spearman rho below **0.3** is noise.
   Report it and drop it, whatever the quintile tables show — a tendency that does not repeat cannot
   rank or filter anything.
2. **Independence gate.** The tendency-vs-return relationship must survive **within ATR quintiles**,
   in a consistent direction, in at least **3 of 5** quintiles. Raw depth correlates strongly with
   ATR%, so an unstratified result is presumed to be volatility restated until the stratified table
   says otherwise. Read the S&P report for this — the Dow is far too small to stratify.
3. **Direction check.** The relationship must hold in **both** return columns. If the sign flips
   between optimized and fixed 21/50, it is a grid-search artefact.
4. **Form of the answer.** If every tendency bucket has a positive median return — the expected
   outcome given §1 and §3 of `improvement-options.md` — the recommendation is a **ranking key** for
   the portfolio harness, explicitly **not** a gate. Recommending a filter requires a bucket that is
   actually unprofitable.

Dow is smoke only, exactly as with the regime gate.

## 5. What to put in `docs/pullback-tendency-analysis.md`

1. One-line setup (script, universes run, definitions in a sentence).
2. Persistence table and a pass/fail per metric against rule 1.
3. S&P summary: quintile tables and, more importantly, the within-ATR-quintile tables.
4. Pass/fail against rules 2–4 for each surviving metric.
5. **Does this contradict `improvement-options.md` §3?** That analysis concluded the edge is trend
   *initiation on recently-weak names*, not trend continuation. Say plainly whether pullback
   tendency adds anything beyond ATR% and the seven features already measured there, restates them,
   or contradicts them.
6. Recommendation, one of: **diagnostic only**, **ranking-key candidate** for
   `scripts/portfolio-bakeoff.mjs`, or **drop**. One sentence of why.
7. Optional: a Chart spot-check note (AAPL's fixed 21/50 return should reconcile with the Chart tab
   set to 21/50, exit buffer none).
