# MA optimization review

Correctness review of the per-symbol SMA grid search against its intended spec, plus one fix
applied in this same change. Files reviewed: `frontend/src/optimizeMa.js`, `frontend/src/ma.js`
(`buildSmaIndexCache`), `frontend/src/tradeSignals.js` (`simulateTrades` /
`simulateTradesWithMaCache`), `frontend/src/scanSymbol.js`, `scripts/optimize-ma.mjs`,
`scripts/analyze-symbols.mjs`.

## 1. Method

Static read of all six files, plus live verification:

- A synthetic 800-bar OHLC series (deterministic PRNG) was run through every one of the 431 valid
  grid pairs, comparing `simulateTrades` against `simulateTradesWithMaCache` trade-for-trade.
- The live backend (`npm run dev`) was used to pull real AAPL bars (752 bars, 2023-09-05 →
  2026-09-02) via `npm run optimize:ma -- AAPL`, and to probe the 1y-window boundary directly.
- Edge cases (empty bars, short history, `slow > barCount`) were run directly against `optimizeMa`.

## 2. Spec conformance

| # | Expected | Result | Note |
| - | -------- | ------ | ---- |
| 1 | Grid: SMA only, fast 8–30 step 2, slow 30–100 step 2, skip `slow <= fast` | **Pass** | `optimizeMa.js:52-54`, `MA_TYPE = "sma"` |
| 2 | Each pair simulated with the same core rules as the Chart | **Pass** | Both paths call into `tradeSignals.js`; see §3 equivalence check |
| 3 | Score = `min(full-history %, ~1y %)` | **Pass** | `optimizeMa.js:72`, `bars1yStart` computed from `DAYS_1Y = 252` |
| 4 | Compounded % = product of `exitPrice/entryPrice − 1` over closed trades, ×100; open trades excluded | **Pass** | `closedTradeReturnPct` filters `!t.open` before compounding |
| 5 | Full window needs ≥3 closed trades, 1y needs ≥2; fail either → pair discarded | **Pass** | `MIN_TRADES_3Y = 3`, `MIN_TRADES_1Y = 2`, `if (!r3y \|\| !r1y) continue;` |
| 6 | Rank by score desc, `top[0]` wins; no valid pairs → scan falls back to 21/50 | **Pass** | `results.sort(...)`, `scanSymbol.js:66-69` (`best ?? DEFAULT_OPT_MA`) |
| 7 | Baseline 21/50 reported for comparison when it appears in valid results | **Fixed in this change** — see Bug 1 below | Previously always reported as absent |
| 8 | Nightly scan uses the winner (or 21/50) with SMA | **Pass** | `scanSymbol.js:71`, `simulateTrades(bars, fast, slow, "sma")` |
| 9 | CLI and `optimizeMa()` share one scoring path | **Pass** | `scripts/optimize-ma.mjs` imports `optimizeMa` directly, no reimplementation |

## 3. Bugs

### Bug 1 — baseline 21/50 could never be found (fixed)

`frontend/src/optimizeMa.js:81` (pre-fix) read:

```js
const baseline = results.find((r) => r.fast === 21 && r.slow === 50);
```

`results` only ever contains fast values from the grid loop, `8, 10, …, 30` — all even. `21` can
never match, so `baseline` was `null` for every symbol, every run. Confirmed live before the fix:

```
Default 21 / 50:
  (did not meet minimum trade counts in all windows)
```

while 21/50 actually scored **+59.3%** on the full 752-bar history (15 closed trades) and
**+12.1%** on the trailing 1y window (8 closed trades) for AAPL — it clears both gates with room to
spare. The message was simply wrong: the pair was never evaluated, not evaluated-and-rejected.

Impact was **report-only** — `results.find` reads from `results`, and `results` is unrelated to
`top[0]`/the scan winner, so `opt_fast`/`opt_slow` and every persisted `symbol_daily_scan` row were
unaffected. Only the CLI's "Default 21/50" comparison line was wrong (`grep` confirms
`scripts/optimize-ma.mjs` is the only reader of `.baseline`).

**Fix applied**: `optimizeMa.js` now scores 21/50 explicitly through a new `evaluateBaseline`
helper, using the same `evaluateWindow` gates and the same `maCache` the grid already built
(`buildSmaIndexCache(bars, FAST_MIN, SLOW_MAX)` spans periods 8–100, so 21 and 50 are already
cached — no grid change, 21 is still never added to the fast loop). Rank is derived by comparing
`baseline.minReturn` against the sorted grid `results` (count of strictly-greater entries + 1)
rather than by grid membership, since the baseline is intentionally off-grid.

Verified post-fix, same AAPL data, same grid:

```
 rank  fast  slow     3y      1y    min   tr3y  tr1y
----------------------------------------------------
    1    14    80   +67.6%   +30.7%   +30.7%    21     7
    2    30    40   +37.3%   +27.7%   +27.7%    17     5
    3    14    82   +63.2%   +27.3%   +27.3%    21     7

Default 21 / 50:
  rank #300 of 431 | 3y +59.3% | 1y +12.1% | min +12.1%
```

The top-3 rows are byte-identical to the pre-fix run — the winner and grid ranking are untouched;
only the baseline line changed from "not found" to a real score and rank.

### Bug 2 — latent: non-cache fallback silently ignores `startIndex`

`evaluateWindow` (`optimizeMa.js:30-33`):

```js
function evaluateWindow(bars, fast, slow, minTrades, maCache, startIndex = 0) {
  const { trades } = maCache
    ? simulateTradesWithMaCache(bars, fast, slow, maCache, { startIndex })
    : simulateTrades(bars, fast, slow, MA_TYPE);
  ...
```

`simulateTrades` has no `startIndex` parameter — it always simulates from bar 0. If `maCache` were
ever falsy, the 1y-window call would silently score the *full* history instead of the trailing 1y
slice, defeating point 3 of the spec without an error. Today this is **unreachable**: `optimizeMa`
always builds and passes `maCache` before calling `evaluateWindow`. Left as-is per this change's
scope (not fixed) — flagged so a future refactor that makes `maCache` optional doesn't reintroduce
this silently.

Suggested fix if ever touched: drop the fallback branch (require `maCache`), or have
`simulateTrades` accept `startIndex` too so the branch is a true equivalent rather than a divergent
code path.

### Bug 3 — dead code: `sliceLastBars`

`sliceLastBars` (`optimizeMa.js:15-18`) is defined but never called anywhere in the file or
elsewhere in the repo. Left as-is per this change's scope. Worth noting *why* it's dead rather than
just removing it: slicing the bars array down to the trailing N and re-running SMA from scratch
would restart MA warmup inside the 1y window (the first `period - 1` bars would have no MA value at
all), which is worse than the current `startIndex` approach — `buildSmaIndexCache` computes the MA
over the *full* history so the 1y sim's early bars still have a fully warmed-up average. The
leftover helper is a footgun: it looks like a plausible way to implement the 1y window and would
quietly reintroduce a worse one if picked up later.

## 4. Verification evidence

- **`simulateTrades` vs `simulateTradesWithMaCache` equivalence**: ran both against all 431 valid
  grid pairs on an 800-bar synthetic series — **0 mismatches** in resulting trade lists (entry/exit
  dates and prices identical). The two duplicated rule sets described in `CLAUDE.md` are in sync.
- **1y window boundary behavior**: on AAPL, 359 of 431 grid pairs held an open position across the
  252-bar boundary (`bars1yStart`). In every one of those cases the 1y-window simulation (starting
  flat, per spec) re-entered within exactly **1 bar** (min = median = max = 1) — because entry is a
  price-vs-MA state test (`close > slowMA && close > fastMA && fastMA > slowMA`), not a crossover
  edge, so the very next bar typically re-satisfies it. The "start flat at the 1y boundary" design
  is therefore consistent with an independent 1y score and the cost of discarding the carried
  position is negligible (~1 bar of exposure), not a meaningful distortion.
- **Edge cases**:
  - Empty bars → `{ top: [], baseline: null, totalPairs: 0, barCount: 0 }`, no throw.
  - 20 bars (shorter than any valid slow period) → `{ top: [], totalPairs: 0, ... }`, `baseline`
    also `null` (21/50 can't be evaluated on 20 bars either) — no throw.
  - 120 bars (shorter than `DAYS_1Y`) → `bars1yStart = 0`, so `r1y` and `r3y` are computed over the
    identical window and `minReturn === r3y === r1y` for every pair; the *effective* gate becomes
    the stricter 3-trade minimum. This degrades gracefully and matches the intent (there's no
    "extra" 1y information to score independently when history itself is under a year).
  - `slow > barCount` pairs never reach a valid state: `buildSmaIndexCache` leaves those periods'
    arrays all-`null` past the available bars, so `eFast`/`eSlow` are `null`, no signals fire, and
    the pair is discarded by the min-trade gate. No `NaN`, no crash.

## 5. Design caveats (not bugs — code matches the stated spec)

- **In-sample fit.** The grid is fit and scored on the same historical bars it's later evaluated
  against, and the 1y window is a strict subset of the full window — so `min(3y, 1y)` is a
  *recency-stability* filter across two overlapping in-sample scores, not out-of-sample validation.
  With 431 candidate pairs tested per symbol, `opt_r3y`/`opt_r1y`/`opt_min_return` as persisted in
  `symbol_daily_scan` are selection-biased and should not be read as forward-looking expectations.
- **Score-surface noise.** Neighboring pairs can differ meaningfully: AAPL's 14/80 (+30.7% 1y) vs.
  14/82 (+27.3% 1y) — a 2-period slow change moves the ranked score by 3.4 points. Picking a single
  lattice-point winner is sensitive to this noise; a plateau- or neighborhood-averaged selection
  would likely be more stable, but that's a design choice, not something the current code claims to
  do differently.
- **Field naming assumes `HISTORY_YEARS = 3`.** `r3y`/`opt_r3y` really mean "the whole loaded bar
  history," whatever `HISTORY_YEARS` (backend `.env`) is set to. Raising that env var wouldn't
  break anything functionally, but the field and column names would then describe something they
  aren't.
- **Single-axis ranking.** Compounded return alone doesn't account for exposure or drawdown — a
  pair with 21 trades and one with 5 trades are ranked on the same number regardless of how much
  time or risk produced it.

## 6. Verdict

**Yes, with caveats.** The grid bounds, shared trade-simulation logic, scoring formula, minimum-
trade gates, ranking, and CLI/scan code-sharing all match the spec, and `simulateTrades`/
`simulateTradesWithMaCache` were confirmed bit-for-bit equivalent across the full grid. The one
real, user-visible defect (Bug 1 — baseline never reported) is fixed in this change with no effect
on the scan winner or persisted rows. The two remaining items (Bug 2, Bug 3) are latent/dead code
with no current runtime effect, left untouched per scope. The main residual risk is the design
caveat already called out in the original spec review: full in-sample fitting with a genuinely
noisy score surface, which is inherent to the current approach rather than an implementation error.
