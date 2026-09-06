# Improvement options — raising overall profit

Inputs: `docs/buffer-bakeoff-sp500.md` and `docs/regime-gate-bakeoff-sp500.md` (summary + conclusion
sections), `docs/improvements.md`, `docs/improvements-analysis.md`, and the core rules as they are
actually implemented in `frontend/src/tradeSignals.js`.

**Core rules, for reference.** Open: flat, close > slow MA, close > fast MA, fast > slow (optional
`entryConfirm: 'double'` needs two consecutive closes above fast). Close: close < fast MA
(× `1 − exitBufferPct/100`). Signals fire on the bar close; fills use the **next** bar's open.
Unless an option below is explicitly labelled **CORE CHANGE**, it leaves all of that untouched.

---

## 1. What is already ruled out

Every mechanism below is a measured failure. None should come back in a new costume — and where an
inverse exists, it has been tested too (see "Both directions" at the end of this section).

**Exit buffer under the fast MA** — `docs/buffer-bakeoff-sp500.md`. No non-zero buffer beat buffer 0
on median return. Best was 0.5% at **+21.5% vs +25.1%** baseline, improving 178 symbols and
worsening 318. Decay is steady out to 5% (+16.4%).

**ADX(14) entry gate** — `docs/regime-gate-bakeoff-sp500.md`. Monotonically worse at every threshold:

| Threshold | Median return | Median trades | Improved / worsened | Median time in market |
| --- | --- | --- | --- | --- |
| off | +25.1% | 27.0 | — | 35.4% |
| ADX > 15 | +18.9% | 23.0 | 161 / 333 | 31.7% |
| ADX > 20 | +12.9% | 16.0 | 112 / 384 | 25.4% |
| ADX > 25 | +8.7% | 11.0 | 99 / 397 | 18.4% |
| ADX > 30 | +2.4% | 7.0 | 69 / 427 | 12.4% |

Excluded by extension: CHOP, percentage bands around the same fast MA, and any other per-stock
trend-strength gate on entry — **in either direction**. That family has been tested and it loses.

**Two more, pre-screened during this analysis** so they do not get proposed later. Both were
measured on the sample described in §2, not fully bakedoff, but the readings are not close:

- **Market-level MA permission (SPY).** No edge. Trades entered with SPY above its 200-day SMA
  averaged **+2.26%**; below it, **+2.12%**. The above-200 regime held 74.6% of trades and produced
  75.4% of pooled profit — profit share simply tracks trade share. An index-MA switch is not a
  filter, it is a coin flip. (SPY vs its 50-day was the same story: +2.11% above, +2.82% below.)
- **Widening the trail to let winners run.** Switching the exit line from fast MA to slow MA once a
  trade is up X% was worse at every trigger — median **+10.3% / +13.7% / +16.1% / +17.8%** at
  +5/+10/+15/+25% triggers against a **+24.0%** baseline, with improved/worsened negative
  throughout. This is the exit-buffer result again through a different door: giving back open profit
  costs more than the tail extension gains.
- **Time stops** (exit if not up g% after N bars) came out roughly neutral — best was N=10, g<0% at
  **+25.0%** median vs +24.0%, but improved 55 / worsened 83. Noise, not edge.

### Both directions have now been tested, and both lose

The obvious follow-up to a failed knob is to turn it the other way. That was done for the two
mechanisms where an inverse exists. Neither inversion works, and the symmetry is the most useful
thing in this document.

**Inverted ADX gate — enter only when ADX is *low*.** The shipped gate required ADX > N and got
monotonically worse as N rose, which implies the entries it was throwing away were the good ones.
Requiring ADX < N tests that directly. It also loses, and it loses *harder* the more it restricts:

| Variant | Median return | Median trades | Improved / worsened |
| --- | --- | --- | --- |
| baseline (no gate) | **+24.0%** | 23 | — |
| ADX < 30 | +21.2% | 21 | 170 / 156 |
| ADX < 25 | +17.6% | 18 | 164 / 204 |
| ADX < 20 | +13.4% | 13 | 139 / 237 |
| ADX < 15 | +2.9% | 6 | 87 / 268 |

Both directions degrade monotonically toward the ungated baseline. ADX < 30 is the only variant in
this whole analysis to improve more symbols than it worsens (170 / 156) — and it still loses 2.8
points of median, because it is the variant that filters almost nothing. **The best ADX filter is no
ADX filter**, in either direction.

**Tighter-than-fast exit — the negative exit buffer.** The exit buffer moved the exit line *below*
the fast MA and lost. Moving it *above* — exit when close < fast × (1 + x%) — also loses, and also
monotonically:

| Exit line | Median return | Median trades | Improved / worsened |
| --- | --- | --- | --- |
| fast MA exactly (baseline) | **+24.0%** | 23 | — |
| fast + 0.5% | +19.0% | 29 | 122 / 233 |
| fast + 1% | +17.2% | 35 | 122 / 252 |
| fast + 2% | +13.9% | 45 | 136 / 241 |
| fast + 3% | +11.8% | 56 | 117 / 263 |

Worth noting: this direction *raises* trade count (23 → 56) while the buffer lowered it (23 → 22 at
0.5%), and both lose. **Trade count is not the driver — the fast MA is simply the right line.**

Two implementation notes. `exitBufferPct` is clamped by `Math.max(0, …)` in both `simulateTrades`
and `simulateTradesWithMaCache`, so a negative buffer silently becomes 0 — this direction was not
expressible in the engine and was tested with a local variant. And `simulateTrades` exposes `adxMin`
only, so the inverted gate needed a local variant too. Neither clamp should be removed on the
strength of these results.

**What the symmetry means.** A knob that loses in one direction is on a slope — you turned it the
wrong way. A knob that loses in *both* directions is at a peak. Exit-line placement and ADX-based
entry restriction are both at peaks already. That is why §4 stops proposing signal-layer knobs: the
per-symbol rule is not underexplored, it is optimal within the family of things you can do to it,
and remaining profit has to come from somewhere else.

---

## 2. The diagnostic that reframes the problem

Measured on **385 symbols / 9,421 closed trades** pulled from `symbol_daily_scan`, using each
symbol's own optimized SMA periods and the real `simulateTrades` engine — the same configuration the
two bakeoffs used. This is a sample, not a full-universe bakeoff; treat these as direction, and
re-measure anything a decision rests on.

Pooled trade profile: **win rate 40.3%, average win +10.10%, average loss −3.11%**, expectancy
+2.21% per trade. That is a healthy trend-following shape — small losses, big wins.

Where the profit actually comes from, by how long the trade lasted:

| Hold | Trades | Share | Avg return | Share of pooled log return |
| --- | --- | --- | --- | --- |
| 1–2 bars | 3,367 | 35.7% | −1.44% | **−57.4%** |
| 3–5 bars | 1,764 | 18.7% | −2.59% | **−40.9%** |
| 6–10 bars | 1,718 | 18.2% | −0.37% | **−8.2%** |
| 11–20 bars | 1,592 | 16.9% | +5.86% | +66.3% |
| 21–50 bars | 898 | 9.5% | +19.34% | +116.2% |
| 51+ bars | 82 | 0.9% | +52.24% | +24.0% |

**Trades lasting ≤10 bars are 72.6% of all trades and contribute −106.6% of pooled return. Every
dollar of profit comes from the 27% that last longer.** The whipsaw intuition was correct.

So why has every anti-whipsaw layer failed? Because **hold length is only knowable after the fact.**
The short losers and the long winners are the same signal at entry. Any filter that blocks the
former blocks the latter in the same proportion — which is exactly the ADX result, where blocking
11,838 entries at ADX > 15 cost 6.2 points of median return while cutting time in market only from
35.4% to 31.7%. The trades it removed were, on average, *better* than the ones it kept.

One pre-entry feature does separate: **bars since that symbol last exited.**

| Gap since last exit | Trades | Avg return | Short (≤10 bar) rate |
| --- | --- | --- | --- |
| 0–2 bars | 3,565 | +1.14% | 80% |
| 3–5 bars | 1,673 | +0.97% | 77% |
| 6–10 bars | 1,280 | +1.62% | 72% |
| 11–30 bars | 1,105 | +2.53% | 65% |
| 31+ bars | 1,413 | +4.92% | 61% |
| first entry | 385 | +8.81% | — |

A 4× spread on something knowable before the fill. **But every bucket is positive.** Blocking fast
re-entries would delete positive expectancy — the ADX mistake exactly. This is a *ranking* signal,
not a gate, and it only becomes worth money when slots are scarce.

Which brings up the variable nobody has modelled. On this sample the strategy holds a **median of
127 concurrent positions** (33% of the universe) and fires a **median of 11 new entry signals a
day**, up to 49. Every bakeoff so far reports per-symbol compounded return with unlimited capital.
A real book holds 10–20 names, so roughly **5–10% of signals can actually be taken** — and which
ones get the slot has never been measured. That is now the largest untested lever in the system.

---

## 3. What separated winners from losers

The right question is not "how do we avoid sideways markets" but "what did the winning entries have
that the losing ones didn't." Every trade was profiled on features knowable **at the signal bar**,
before the next-open fill — no hindsight. Sample: **12,648 closed trades across 700 symbols**
(win rate 40.3%, avg +2.30%, 28% ran longer than 10 bars).

Raw feature scans are dominated by one thing: **volatility scales returns without improving
accuracy.** Sorting by ATR%, the top quintile averages **+7.09%** and carries **51.5%** of pooled
return while the bottom averages +0.35% — but win rate is flat across all five quintiles
(41/41/40/40/40). High-ATR names produce bigger outcomes, not better ones. So every feature below is
reported **within ATR quintiles**, which neutralises that effect, and read on win rate and
"ran >10 bars" as well as return — those two can't be faked by volatility.

| Feature at signal bar | Low tercile | High tercile | Reading |
| --- | --- | --- | --- |
| **fast−slow spread** | **+3.84%, win 46%, long 37%** | +1.04%, win 36%, long 21% | tight = fresh cross wins |
| **bars since last exit** | +1.45%, win 37%, long 21% | **+3.48%, win 47%, long 37%** | churn re-entries lose |
| **close−fast in ATR units** | +1.47%, win 40%, long 19% | **+3.01%, win 43%, long 39%** | decisive break wins |
| **volume ÷ 20d average** | +1.53%, win 38%, long 24% | **+2.96%, win 43%, long 32%** | volume confirms |
| **slow MA slope (20b)** | **+3.04%, win 45%, long 32%** | +1.27%, win 37%, long 23% | falling slow MA wins |
| **rel. strength vs SPY (63b)** | **+3.53%, win 43%, long 30%** | +1.41%, win 38%, long 24% | recent laggards win |
| **% of 52-week high** | +3.02%, win 41%, long 27% | +1.37%, win 38%, long 27% | magnitude only — see below |

**Out-of-sample check:** splitting the trades in half by date (at 2025-07-23) and re-running all
seven, **every feature keeps its sign in both halves.** Nothing flipped. The two strongest actually
widened in the second half (bars-since-exit +1.52pt → +3.50pt; % of 52w high +3.32pt → +4.97pt).

### The profile

**Winners** were entered on a *fresh* crossover (fast barely above slow), in a name that had been
*weak* — falling slow MA, lagging SPY, well off its 52-week high — on a *decisive* break above the
fast MA in ATR terms, with *above-average volume*, and *not* immediately after this system's last
stop-out in the same name.

**Losers** were entered late in an already-extended trend (wide fast–slow spread), barely above the
fast line, on quiet volume, often within a bar or two of the previous exit.

**This system's edge is trend *initiation* on recently-weak names, not trend *continuation*.**

That one sentence explains the whole investigation. ADX > N failed because ADX is high exactly in
the established, wide-spread trends where this system's returns are **worst** — the gate was
selecting for the losing regime. And ADX < N failed too because ADX simply doesn't measure
freshness: sorted into quintiles it is flat (+2.04 / +2.41 / +2.76 / +1.92 / +2.38), which is the
same null the two bakeoffs found from opposite directions. **The fast−slow spread is the freshness
measure ADX was reached for and never was.**

Two things this overturns elsewhere in this document:

- **It contradicts Option 5.** Entries *more* extended above the fast MA in ATR units did better
  (39% ran long vs 19%), so waiting for a pullback is buying the losing tercile. Option 5 is
  downgraded below.
- **It complicates Option 2.** Since volatility scales returns without changing accuracy, inverse-
  ATR sizing deliberately shrinks the positions that produce most of the return. That is a drawdown
  tool, not a profit tool, and Option 2 is reframed accordingly.

**Caveats, stated plainly.** Thirteen features were scanned in-sample, so some separation is
expected by chance; the defence here is that the effects are large, monotone, survive volatility
stratification, and hold sign out-of-sample — not that any one p-value was computed. And critically,
**every bucket is still positive.** The worst tercile of the worst feature returns +1.04%. Gating on
any of these would repeat the ADX mistake. These are **ranking keys for when slots are scarce**, and
nothing else.

## 4. Ranked options

### 1. Portfolio slot allocation and candidate ranking

- **Mechanism.** Stop assuming unlimited capital. Hold K slots. When more entry signals fire than
  there are free slots, score the candidates and take the top ones. The signal rule is untouched —
  only the decision of *which* valid signals get funded.
- **Layer.** Portfolio (a new layer above the signal engine).
- **Core changed?** No.
- **Bakeoff.** New `scripts/portfolio-bakeoff.mjs`: an event-driven daily loop across the universe,
  reusing `simulateTrades` for signals and `loadBarsForSymbol` / `loadOptimizedMaForSymbol` for
  data. Hold K fixed (10 and 20) and vary **only** the ranking key. §3 has already measured the
  candidate keys, so this is no longer guesswork — test, in this order: **fast−slow spread
  (ascending)** and **bars since last exit (descending)**, the two strongest; then close−fast in ATR
  units, volume ÷ 20-day average, slow-MA slope, and relative strength; then a composite of the
  survivors; and always a **random-pick control**. Metrics change to portfolio-level: CAGR, max
  drawdown, Sharpe, turnover, average slot utilization. The random control is the result that
  matters — a key only counts if it beats picking at random from the same candidate set.
- **Main risk.** This is the first harness that models capital, so the answer depends on K and on
  rebalance/queueing assumptions that have never been fixed. Set them before running and do not
  tune them alongside the ranking key. Also: with 127 candidates and 20 slots, most of the return
  difference may come from slot count rather than ranking — which is why the random control has to
  be run first.

### 2. Volatility-targeted position sizing — *a drawdown tool, not a profit tool*

- **Mechanism.** Size each position ∝ 1/ATR% so a quiet name and a volatile name contribute the
  same risk, instead of the same dollars.
- **Layer.** Portfolio.
- **Core changed?** No.
- **Bakeoff.** Same harness as #1, ranking key held fixed, sizing rule varied (equal-dollar vs
  inverse-ATR vs inverse-ATR capped). Compare at **matched gross exposure**, and report CAGR and max
  drawdown separately — they are expected to move in the same direction here, which is the point.
- **Main risk.** §3 reframed this one. The top ATR quintile carries **51.5% of pooled return at an
  identical win rate**, so inverse-ATR sizing shrinks exactly the positions that produce most of the
  profit. Expect it to **lower** returns while lowering drawdown more — worth having as a risk dial,
  but it should not be sold as a return improvement, and if a run shows it raising CAGR, suspect the
  exposure matching before believing it.

### 3. Re-entry recency as a ranking penalty

- **Mechanism.** Penalize (never block) candidates that this system exited a few bars ago. Grounded in the measured spread in §3.
- **Layer.** Portfolio — one ranking key inside #1.
- **Core changed?** No.
- **Bakeoff.** Runs as one of the keys in #1's sweep. Test as a continuous penalty, not a cutoff,
  precisely because every gap bucket is positive.
- **Main risk.** Likely collinear with relative strength (a name that just broke down is also a weak
  name), so test it both alone and combined, or the credit gets double-counted.

### 4. Partial exit / scale-out — **CORE CHANGE (close rule)**

- **Mechanism.** Sell half the position at close < fast MA, hold the remainder until close < slow MA.
- **Layer.** Signal (changes the core close rule — labelled as such).
- **Core changed?** **Yes.** This is the one option here that alters an existing rule rather than
  adding a layer.
- **Bakeoff.** Per-symbol, same shape as the existing bakeoffs; needs a variant of `simulateTrades`
  that tracks two lots. Compare against the unchanged rule on median return and improved/worsened.
- **Main risk.** The buffer and trail results both say the tail half loses money. Scale-out pays
  only half that cost while keeping half the tail, so it is a genuinely different bet — but the
  prior is unfavourable, and it permanently complicates the trade model (two exits per trade) that
  the Chart tab, `scanSymbol`, and the scan schema all assume is one.

### 5. Entry fill on a pullback rather than the next open — **CORE CHANGE (fill rule)** — *evidence now against*

- **Mechanism.** The original idea: 35.7% of trades die within two bars and fills happen at the next
  open after a close above the fast MA — i.e. buying extension — so fill only if the next bar trades
  at or below the signal bar's close.
- **Layer.** Signal (changes the fill rule — labelled as such).
- **Core changed?** **Yes.**
- **Bakeoff.** Per-symbol, existing harness shape; uses the `low` column already loaded by
  `loadBarsForSymbol`.
- **Main risk / status.** **§3 argues against this one.** Entries further above the fast MA in ATR
  units did *better*, not worse — 39% of the top tercile ran beyond 10 bars against 19% of the
  bottom, and the effect holds in both time halves. Waiting for a pullback systematically buys the
  weaker tercile. Kept in the list only because "buy the dip" is an intuitive suggestion that will
  come up again; the measurement to point at when it does is in §3. If run anyway, note that it also
  introduces an intrabar fill assumption the harness has never made, and that skipped signals change
  the trade population, so improved/worsened needs a matched-population definition set before the
  run.

### 6. Walk-forward universe selection

- **Mechanism.** The rule works far better on some names than others. Trade only the symbols where
  it earned its keep out-of-sample: rank by prior-year rule return, trade the next year's top
  quintile, re-rank annually.
- **Layer.** Selection (which symbols are eligible at all).
- **Core changed?** No.
- **Bakeoff.** Per-symbol with strict time separation — rank on year N, measure on year N+1, never
  overlapping.
- **Main risk.** The classic overfitting trap, and this repo already has a loaded gun pointed at it:
  `symbol_daily_scan` stores **in-sample** optimized MA periods. If the selection ranks on returns
  computed with periods fitted over the same window, the result is guaranteed and meaningless. Only
  worth running if the walk-forward separation is airtight, and `docs/improvements.md` already flags
  co-tuning as the trap to avoid.

---

## 5. Recommended next experiment

**Option 1 — build the portfolio harness and bake off candidate ranking against a random control.**

Everything at the signal layer is now measured and sitting on a peak, not a slope. Exit-line
placement loses in **both** directions — looser (buffer, slow-MA trail) and tighter (fast + x%).
ADX entry restriction loses in **both** directions — require-high and require-low. Market
permission is flat. Time stops are neutral.

Meanwhile §3 changed this from a speculative build into a specified one. Seven pre-entry features
separate winners from losers, survive volatility stratification, and hold their sign in both halves
of the sample — and none of them can be used as a filter, because every bucket is still profitable.
A ranking key under scarce slots is the *only* form in which that evidence can be spent. The layer
that decides which 10–20 of ~127 concurrent candidates get funded has never been measured, and it is
now the one place where a measured edge and an unmeasured lever line up.

Start with the two strongest keys — **fast−slow spread ascending** and **bars since last exit
descending** — against the random control, before touching composites. Option 1 also subsumes #2 and
#3 as knobs once the harness exists, so it is one build that unlocks three tests.

One caveat worth stating plainly: this changes what "profit" means in the reports. Per-symbol median
compounded return stops being the headline and portfolio CAGR and drawdown take over. That is the
point — the per-symbol number was never the money — but it means the new results will not line up
against the existing bakeoff tables, and the harness should keep reporting the per-symbol baseline
alongside so the two can be reconciled at least once.
