# Improvements analysis — after the exit-buffer bakeoffs

Inputs: `docs/improvements.md`, `docs/buffer-bakeoff-dow30.md`, `docs/buffer-bakeoff-sp500.md`
(summary + conclusion sections only). Core open/close rules are unchanged and stay unchanged.

## 1. The problem, and what was already tried

In flat markets and during uptrend pullbacks, price dips under the fast MA and then recovers. The
system exits and re-enters, adding trades without much edge. A multi-bar entry delay was tried first
and did not help — it delays the same decision rather than requiring a deeper break of the line.

The **exit buffer** was the response: stay in the trade until close falls under
`fast × (1 − buffer%/100)` instead of under the fast MA exactly. Entry rules untouched, exposed as a
0–5% Chart sidebar control, with the nightly scan left at `0` pending a chosen default. Early chart
spot-checks looked encouraging — flat compounded return with fewer trades. Both bakeoffs then
measured it across a real universe, varying only `exitBufferPct`.

## 2. What the bakeoffs showed

| | Dow 30 (31 symbols) | S&P 500 (496 analyzed) |
| --- | --- | --- |
| Median return @ buffer 0 | +38.2% | +25.1% |
| Best non-zero buffer | 0.5% → **+39.2%** (+1.0 pt) | 0.5% → **+21.5%** (−3.6 pt) |
| Improved / worsened at 0.5% | 14 / 17 | 178 / 318 |
| Median trades 0 → 0.5% | 28 → 23 | 27 → 22 |
| Median hold 0 → 0.5% | 13.2 → 17.5 days | 13.8 → 17.7 days |

Beyond 0.5% both universes decay steadily — Dow falls to +12.0% and the S&P to +16.4% at a 5%
buffer. **No non-zero buffer improved more symbols than it worsened on either universe**, including
the one buffer that won on the Dow median.

Three readings that matter for what comes next:

- **The Dow's +1.0 pt is not a result.** It is a single-buffer median edge on 31 symbols,
  contradicted by its own 14-up/17-down split and reversed on the 496-symbol sample. Treat the S&P
  number as the real one.
- **The buffer does exactly what it was designed to do, and it still costs money.** Trade count
  drops ~20% and holds lengthen ~30% at 0.5%; win rate climbs monotonically with buffer size (to
  50% at 5% on both universes) while median return falls. Fewer, longer, more-often-winning trades
  that return less means the dips it holds through are not predominantly rebounds — it is paying
  for the saved whipsaws by exiting real breakdowns later, and the give-back is the larger number.
- **The buffer only ever addressed half the churn loop.** It cannot stop the system from re-entering
  in dead tape; it can only delay the exit. Entry-side churn is still completely untested.

## 3. Remaining ideas, ranked

**1. Regime entry filter (CHOP / ADX)** — *highest value, and the untested half.* The bakeoffs
establish that exit-side tuning cannot fix churn on this rule set. A regime gate removes the
low-quality trade instead of lengthening it, which is the lever the data points at. Testable with
the same harness shape as the buffer bakeoffs.

**2. Structural exit** — *hold, and note the dependency.* Its stated purpose is to be the escape
hatch for a buffer that exits too late on real trend breaks. With the buffer staying at 0, a
`close < fast` exit already fires before any `close < slow` or `fast < slow` condition in nearly
every breakdown, so a structural exit has little left to do. It becomes interesting again only if a
non-zero buffer is ever adopted, or as a *replacement* exit rather than an addition — which would
mean changing the core close rule.

**3. Stay policy** — *no new information.* It is a framing of "tactical exit + structural exit," not
an independent lever, and it cannot be evaluated until #2 resolves. It also sits closest to the core
close rule, so it carries the most risk for the least measured upside.

**4. Optional entry buffer** — *low.* The notes already call it unnecessary for the pullback problem,
and the exit-buffer result is direct evidence that widening a price-vs-MA band is not where the edge
is on this system.

**5. Complementary sleeve** — *out of scope.* A separate system, only worth it if returns *during*
sideways markets become a goal. Sitting in cash when the regime says "no trend" is the cheaper first
version, and #1 delivers exactly that.

**Deprioritized — wiring the exit buffer into the nightly scan.** This was step 1 of the old "next
steps" list; the evidence retires it. The right default is `0`, which is what `scanSymbol` already
uses, so the correct action is **no code change**. Keep the sidebar control as a per-symbol
exploration tool. If the buffer is ever revisited, the only version worth testing is an ATR-scaled
band rather than a fixed percentage — a flat 1% means very different things across a universe whose
optimized periods already range from 8/36 to 30/100.

## 4. Recommended next experiment: regime entry gate (ADX)

**Why this one.** It is the only remaining idea that attacks a mechanism the bakeoffs have not
already ruled out, it needs no change to the open or close rules (it is one additional AND condition
on entry), and it fails cheaply — a threshold of "off" must reproduce today's numbers exactly, so
the experiment is self-checking. ADX before CHOP: one threshold with well-understood semantics
(`ADX > N` = trending), and it is cheaper to reason about when the result is ambiguous.

**Design — `scripts/regime-gate-bakeoff.mjs`**

- **Universe:** S&P 500 constituents, same source and skip handling as the existing S&P bakeoff. Run
  the Dow 30 first as a fast smoke test, but do not decide on it — the 31-symbol sample already
  produced one false positive.
- **Vary only:** the ADX(14) entry threshold, swept over `[off, 15, 20, 25, 30]`. `off` must
  reproduce the buffer-0 baseline exactly (same trade count and return) — the equivalence check that
  buffer 0 passed against the Chart.
- **Hold fixed:** per-symbol optimized MA periods from `symbol_daily_scan`, SMA, single open
  confirm, `exitBufferPct = 0`, next-bar-open fills. Do not co-tune the threshold with MA periods —
  the notes flag that as the overfitting trap, and it is.
- **Gate semantics:** blocks *new entries only*. Never forces an exit on a rising-chop reading while
  a trade is open.
- **Metrics:** the five from the buffer bakeoffs (trades, compounded return %, win rate, average
  hold) plus two the gate specifically needs — **entries blocked** and **time in market %**. A gate
  that lifts median return purely by sitting out has to be visible as such rather than reading as
  free alpha.
- **Report:** `docs/regime-gate-bakeoff-sp500.md`, same layout — run command and prerequisites,
  per-threshold summary, per-symbol appendix, skips, conclusion.

**Decision rule, set before running:** adopt a threshold only if it beats `off` on **median return**
*and* **improves more symbols than it worsens**. The exit buffer passed the first test on the Dow
and failed the second on both universes; requiring both up front is what keeps the next +1.0 pt
median blip from being read as a win.
