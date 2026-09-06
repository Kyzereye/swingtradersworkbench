# Task: Volume for better signal quality

## Why this

Price alone drives the open/close rules today. Daily bars already have **volume** in
MySQL (`daily_stock_data`), but the chart and scan do not use it.

`docs/improvement-options.md` §3 already measured volume at the **entry bar**:
volume ÷ 20-day average. High volume tercile did better than low
(+2.96% vs +1.53% avg, win rate 43% vs 38%, more long trades). So volume is not
a blank slate — it showed up once as a ranking feature. This task is about
turning that into clear options we can bake off.

## Goal

Find simple volume rules that improve signal quality: higher win rate, better
return, and/or fewer weak out-and-back-in trades — without repeating failed
ideas (global exit buffer, ADX gate).

## What “volume” means here

Use the daily bar’s volume. Prefer **relative** volume, not raw share count:

- **RVOL** = today’s volume ÷ average volume over the last N days (N = 20 was
  used in §3; keep that unless a sensitivity check says otherwise).

Raw volume differs too much across tickers. RVOL is comparable.

## Ways volume can help (options to test)

Do not implement all of these at once. Pick one mechanism per bakeoff.

### 1. Entry filter — require strong volume on the open bar

**Idea:** Only take a new open when RVOL is above a threshold (e.g. 1.0, 1.2, 1.5).

**Why it might help:** §3 said high volume on the entry bar lined up with better
trades. Quiet breakouts were weaker.

**Risk:** Every bucket in §3 was still profitable. A hard filter may delete good
trades. Prefer ranking first unless a low-RVOL bucket is clearly bad.

### 2. Entry ranking — prefer high RVOL when slots are scarce

**Idea:** Do not block low-volume opens. When many symbols signal the same day,
rank candidates by RVOL (or by a short list of features including RVOL) and only
take the top K.

**Why it might help:** Matches `improvement-options.md` §5 (portfolio harness).
Volume was already listed as a ranking key candidate.

**Risk:** Needs the portfolio bakeoff harness, not only per-symbol compounded
return.

### 3. Skip weak re-entries after an exit

**Idea:** After a close, the next open also needs RVOL above a threshold. First
entries in a fresh trend can stay as they are.

**Why it might help:** Cuts some out-and-back-in cycles that reopen on quiet
bounces under/over the fast MA.

**Risk:** May miss strong continuations that start quiet. Define “re-entry”
clearly (e.g. open within N bars of the last exit).

### 4. Exit confirmation — volume on the exit bar

**Idea:** When close falls below the fast MA, only exit if RVOL is also elevated
(selling pressure). If volume is quiet, stay in.

**Why it might help:** Quiet dips under the fast MA are often noise; heavy volume
breaks are more often real.

**Risk:** Same shape as the exit buffer — you hold longer and may give back more
when the trend fails on a quiet day that later accelerates. Bake off carefully
against buffer 0. Do not combine with undershoot buffer in the first test.

### 5. Breakout vs pullback volume split

**Idea:** Measure RVOL separately for:

- bars that open a trade (close reclaiming above fast), and  
- bars that close a trade (close under fast).

Use that only for research at first: do winning trades show higher entry RVOL
and/or higher exit RVOL than losers?

**Why it might help:** Tells us which of (1)–(4) is worth coding before a full
rule change.

### 6. Volume dry-up before entry (optional, lower priority)

**Idea:** Prefer entries where the prior few bars were below-average volume, then
the signal bar expands. Classic “coil then thrust.”

**Why it might help:** Some swing setups work better after quiet pullbacks.

**Risk:** Easy to overfit. Only try after (1) or (2) have a clean result.

## What not to do in this task

- Do not reopen a global or per-symbol **exit buffer under the fast MA** as the
  main fix (already lost).
- Do not bring back **ADX gates**.
- Do not change the nightly scan until a bakeoff beats the current rules on the
  usual decision rule (median return, and more symbols improved than worsened —
  or portfolio CAGR if using the ranking harness).
- Do not use dollar volume or float tricks in the first pass — daily share
  volume and RVOL only.

## Suggested first experiment

**Start with research, not a rule change:**

1. On each closed trade under current rules (SMA, optimized MA, buffer 0),
   record RVOL(20) on the **entry signal bar** and on the **exit signal bar**.
2. Split trades into terciles by entry RVOL and by exit RVOL.
3. Report win rate, average return, and hold days per tercile.
4. Write a short note: does this match §3? Is exit volume useful at all?

Then, if entry RVOL still looks good:

- Bake off **option 1** (hard filter) on Dow smoke, then S&P, **or**
- Wire **option 2** into the portfolio ranking bakeoff if that harness exists.

## Code / report layout

- Metric helpers: plain JS under `frontend/src/` (no React).
- Script: `scripts/analytics/`
- Report: `docs/reports/`
- Task / analysis notes: `docs/`

Same pattern as the other analytics jobs.

## Deliverables

1. This task file (done).
2. A small volume helper (RVOL series from bars).
3. An analytics script + report that answers the first experiment above in plain
   language.
4. A keep / drop / next-step note for options 1–4 based on evidence — not guesses.

## One-line summary

Use relative volume to favor stronger opens (and maybe cleaner exits), starting
from the §3 finding that above-average volume on the entry bar already separated
better trades from weaker ones.
