# Remaining systems — build order

Eight systems are done in the app:

1. Moving average crossover
2. Triple Moving Average Alignment
3. MACD system
4. RSI mean reversion / failure swing
5. Donchian Breakout (Turtle)
6. Keltner Channel Trend
7. Bollinger Band Squeeze & Reversion
8. Darvas Box

Below: everything else from the Systems catalog, ranked **easiest → hardest** for this codebase (daily bars, long-only rules, chart + optimize/scan/dialogs pattern).

Difficulty reflects: rule clarity, reuse of existing MA/ATR/indicator helpers, chart complexity, and whether we already have the data (daily OHLC vs intraday / volume-at-price).

| Rank | System | Section | Why this difficulty |
|------|--------|---------|---------------------|
| 1 | **Donchian Breakout (Turtle)** | Trend-following | **Done in app.** Pure N-day high/low breaks. Few parameters, no fancy indicators, chart is channels + markers. |
| 2 | **Keltner Channel Trend** | Trend-following | **Done in app.** EMA + ATR envelope; long on close above upper band; exit below mid EMA. |
| 3 | **Bollinger Band Squeeze & Reversion** | Mean-reversion & volatility | **Done in app.** Squeeze = BB inside Keltner; breakout above upper BB; exit below mid SMA. |
| 4 | **Darvas Box** | Trend-following | **Done in app.** Recipe A + trail + optional MA (optimized) + optional volume filter (sidebar only; not in scan yet). |
| 5 | **Japanese Candlestick Reversal** | Price action & structure | Pattern detection (engulfing, stars, etc.) is doable; quality depends on pairing with solid S/R or trend filters. |
| 6 | **Fibonacci retracement / extension** | Price action & structure | Need reliable swing high/low detection, then levels and entry/target rules. More design choices than Donchian/Keltner. |
| 7 | **Point & figure** | Price action & structure | Clear classic rules, but a different chart type (box size, reversal amount, column breaks)—new UI and bar conversion. |
| 8 | **Multi-timeframe trend alignment** | Range, breakout & other | Rules can stay simple (e.g. weekly trend + daily trigger), but we need higher-TF bars or resampling and dual-TF logic. |
| 9 | **Seasonality / calendar** | Range, breakout & other | Light on chart indicators; heavier on calendar/earnings windows and a different “signal” shape than crossover systems. |
| 10 | **Ichimoku Kinko Hyo** | Trend-following | Fully ruleable, but five lines + cloud, displaced spans, and denser chart/UX. Optimization surface is large. |
| 11 | **Support / resistance & swing structure** | Price action & structure | Intuitive for humans; hard to make objective and stable (pivot definition, retests, invalidation). |
| 12 | **TheStrat multi-timeframe** | Price action & structure | Candle type 1/2/3 is easy; continuity across timeframes and clean entry rules take more product/rules work. |
| 13 | **VWAP Reversion** | Mean-reversion & volatility | Classic form is **intraday**. Daily-only data forces a weak substitute or new session bars. |
| 14 | **Opening Range Breakout (ORB)** | Range, breakout & other | Needs first 15–30 minute high/low—**intraday** data we don’t use for the other systems. |
| 15 | **Volume Profile POC** | Range, breakout & other | Needs volume-at-price (or a rough OHLC proxy). New analytics + chart, not a simple overlay. |
| 16 | **Market Structure / SMC** | Price action & structure | Liquidity sweeps, ChoCH, FVGs, order blocks—many concepts, lots of edge cases to encode. |
| 17 | **Wyckoff Accumulation / Distribution** | Price action & structure | Phase mapping and springs are interpretive; automating “good enough” phases is a research project. |
| 18 | **Gartley / Harmonic Pattern** | Price action & structure | Multi-leg Fibonacci geometry (Gartley, Bat, Butterfly, Crab) at a PRZ—detection and validation are heavy. |
| 19 | **Elliott Wave** | Price action & structure | Impulse/corrective counts are ambiguous; reliable auto-wave counting is the hardest of the list. |

## Suggested next three

1. Japanese Candlestick Reversal  
2. Fibonacci retracement / extension  
3. Point & figure  

Same pipeline as existing systems — see `system-page-definition-of-done.md`.

---

## Data fit for this app (daily only)

This workbench has **daily OHLC + volume**. No day trading and nothing shorter than the daily chart. Volume is available and helps some systems; it does not unlock true intraday setups.

### Pure chart TA vs not

Of the **19 remaining** above, **18 are pure TA** (price, and sometimes volume — chart / market-structure based). None of those need fundamentals (earnings quality, valuation, balance sheet, etc.).

**Not pure chart TA (1):**

- **Seasonality / calendar** — month / turn-of-month / earnings windows. Calendar and event timing, not a chart pattern. Drop or defer if the goal is chart-only systems.

### Drop or redesign (need true intraday)

- **Opening Range Breakout (ORB)** — needs the first 15–30 minutes. Daily bars cannot define that range.
- **VWAP Reversion (classic)** — session VWAP and “stretch then fade to VWAP” is an intraday game. On daily data you only get a weak stand-in (e.g. multi-day anchored VWAP), which is a different system.

### Possible with daily volume, but weaker / approximate

- **Volume Profile POC** — real VP uses intraday prints. A crude profile can be faked from daily bars (spread each day’s volume across the high–low range), but it is not true volume profile. Optional later; don’t expect classic POC behavior.

### Fine on daily OHLC (volume optional or nice-to-have)

These match the available data:

| Rank | System | Volume? |
|------|--------|---------|
| 1 | Donchian | optional |
| 2 | Keltner | optional (ATR from H/L/C) |
| 3 | Bollinger squeeze & reversion | optional |
| 4 | Darvas Box | optional |
| 5 | Candlestick reversal | optional |
| 6 | Fibonacci | optional |
| 7 | Point & figure | usually price-only |
| 8 | Multi-timeframe alignment | build weekly from daily |
| 10 | Ichimoku | optional |
| 11 | Support / resistance | optional |
| 12 | TheStrat | daily (+ weekly from daily) |
| 16–19 | SMC, Wyckoff, Harmonics, Elliott | volume helps Wyckoff especially; still chart TA |

**Seasonality** still is not chart TA even though it does not need intraday.

### Practical shortlist

- **~15–16 systems** are realistic on daily bars.
- **Skip for now:** ORB, classic VWAP.
- **Maybe later / compromise:** Volume Profile.
- **Volume** helps most for Wyckoff and confirmation filters; Donchian → Bollinger do not need it.

Suggested next three: **Candlestick reversal → Fibonacci → Point & figure**.

---

## How volume can help

This app has **daily volume**. Volume is not required for most price-based systems, but it can act as a **confirmation or veto filter**. Typical pattern: compare signal-day volume to a recent average (e.g. 20-day). Elevated volume often means more participation; thin volume often means quieter / less reliable moves.

Volume does **not** fix lag, chop, or bad regime fit. It also does **not** turn a price system into a fundamentals system.

Below: every system in the catalog (23 total — 5 done + 18 remaining).

### Done (already in the app)

| System | How volume can help |
|--------|---------------------|
| **Moving average crossover** | Prefer crosses (or the follow-through day) on **above-average volume**. Low-volume crosses are more often noise. Does not remove lag or sideways whipsaws. |
| **Triple Moving Average Alignment** | Same idea: require stronger volume when the stack first goes fully bullish (or on the entry fill day). Thin volume on “alignment day” → weaker confirmation. Still won’t fix late entries in mature trends. |
| **MACD system** | Filter signal-line crosses with rising or above-average volume; optional: rising volume as histogram expands in trade direction. Helps a bit on false crosses; does not stop chop in ranges. |
| **RSI mean reversion / failure swing** | Use carefully: **climax volume** at an RSI extreme can support a fade; a bounce from oversold on **thin** volume is more suspect; high volume **with** the trend while RSI is pinned argues **against** fading. Volume can argue both ways. |
| **Donchian Breakout (Turtle)** | Classic fit: breakouts of N-day highs on **expanding volume** are preferred; low-volume breakouts fail more often. Volume is one of the best optional filters here. |

### Remaining — Trend-following

| System | How volume can help |
|--------|---------------------|
| **Darvas Box** | Box-top breaks with strong volume support momentum continuation; weak volume on the break → more fakeouts. Volume on the floor/stop day is less central. |
| **Keltner Channel Trend** | Close above the upper band with elevated volume strengthens the volatility-breakout read. Quiet volume on a band pierce is easier to fade or ignore. |
| **Ichimoku Kinko Hyo** | Confirm cloud breaks / Tenkan–Kijun crosses with volume expansion. Thin volume through the cloud is a common false break. |

### Remaining — Mean-reversion & volatility

| System | How volume can help |
|--------|---------------------|
| **Bollinger Band Squeeze & Reversion** | During the squeeze, volume often contracts; the **breakout from the squeeze** is more credible on a volume surge. Mean-reversion back to the middle band is less about volume than the breakout leg. |
| **VWAP Reversion** | Classic form is intraday. If using a daily/anchored stand-in: stretches away from VWAP on panic/climax volume can set up fades; low-volume drifts are weaker setups. Still a poor substitute for session VWAP without intraday bars. |
| **MACD** | *(See done table above.)* |

### Remaining — Price action & structure

| System | How volume can help |
|--------|---------------------|
| **Support / resistance & swing structure** | Breaks of levels on high volume → more likely real; tests/retests on declining volume → more likely hold. Volume at the pivot often separates breakout from fakeout. |
| **Market Structure / SMC** | Liquidity sweeps and ChoCH/MSS are more convincing with a volume spike at the sweep, then clearer follow-through. FVGs/order blocks themselves are price geometry; volume is secondary confirmation. |
| **Wyckoff Accumulation / Distribution** | **Strong fit for volume.** Springs, signs of strength/weakness, and effort-vs-result (wide spread + high volume vs narrow + high volume) are core Wyckoff reads. Daily volume matters here more than for MA crosses. |
| **Japanese Candlestick Reversal** | Reversal patterns (engulfing, stars, etc.) at S/R are stronger with above-average volume on the signal candle(s). Low-volume “reversal” bars are easier to ignore. |
| **TheStrat multi-timeframe** | Continuity / 2-1-2 style triggers gain confidence when the directional (type 2) bar prints with solid volume, especially on the entry timeframe. |
| **Fibonacci retracement / extension** | Pullback entries into Fib levels are stronger if the prior impulse leg had healthy volume and the pullback is on lighter volume (digestion). Breaks of Fib targets with volume expansion support trend continuation. |
| **Gartley / Harmonic Pattern** | Completion at the PRZ with a reversal candle **plus** volume spike is a common confirmation. Pattern geometry alone does not need volume; execution quality often does. |
| **Elliott Wave** | Impulse legs ideally show expanding volume; corrective legs often show contracting volume. Useful as a soft check on wave labeling — not a substitute for an unambiguous count. |
| **Point & figure** | Classic P&F is price-box based and often ignores volume. Optional: only take column breaks when the underlying daily bar(s) that completed the break had strong volume. |

### Remaining — Range, breakout & other

| System | How volume can help |
|--------|---------------------|
| **Opening Range Breakout (ORB)** | Needs intraday data. In that world, ORB breaks are routinely filtered by relative volume vs the opening window. **Not usable as classic ORB on daily-only bars.** |
| **Volume Profile POC** | Volume **is** the system (distribution of volume by price). Daily-only forces a rough proxy; with true intraday prints, POC/HVN/LVN are defined by volume. Highest volume dependence on the list. |
| **Multi-timeframe trend alignment** | Higher-TF trend + lower-TF entry: prefer the trigger bar (daily) to show above-average volume in the trade direction. Higher-TF can stay price-only. |
| **Seasonality / calendar** | Not chart TA. Volume does not make calendar/earnings windows into a price system. At most: avoid acting on a seasonal bias on dead volume days, or require volume confirmation if you combine seasonality with a chart trigger. |

### Quick priority (where daily volume buys the most)

1. **Highest leverage:** Volume Profile (by definition), Wyckoff, Donchian / Darvas / level breakouts, candlestick reversals at S/R.  
2. **Useful confirmation:** MA crossover, Triple MA, MACD, Keltner, Bollinger squeeze breakouts, Ichimoku cloud breaks, Fib / harmonics / TheStrat triggers.  
3. **Situational / double-edged:** RSI mean reversion (climax vs trend volume).  
4. **Little or awkward fit on daily-only:** Classic VWAP, ORB, seasonality, pure P&F (volume optional).
