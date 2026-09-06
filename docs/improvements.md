# System improvements notes

Notes from planning how to reduce chop / whipsaw without changing the core open and close rules.

## Core rules (do not change lightly)

- **Open:** not in a trade; close above the slow MA; close above the fast MA; fast MA above slow MA. (Optional chart-only: two consecutive closes above fast.)
- **Close:** while in a trade, close when price drops below the fast MA.
- **Slow MA:** trend direction only.
- **Fills:** signal at the bar close; fill at the next bar’s open.

The fast MA is the trade line. Whipsaws come from price bouncing across it on pullbacks that rebound — not mainly from fast and slow being close together. MA spread is low priority.

## Problem

In flat markets and during uptrend pullbacks, price often dips under the fast MA then recovers. The system exits and re-enters, adding trades without much edge. Multi-bar entry delay did not help much: it delays the same decision instead of requiring a deeper break under the line.

## Done: exit buffer

- Exit only when close is under `fast × (1 − buffer%/100)`.
- Entry rules unchanged.
- Chart sidebar: **Exit buffer %** (0–5%). `0` = original behavior.
- Nightly scan still uses `0` until a default is chosen and wired into `scanSymbol`.

Early chart checks: on some symbols, compounded % stayed about the same while trade count dropped (less churn around the fast MA). Real breakdowns exit later and can give back more — that tradeoff is expected.

## Not built yet

### 1. Regime filter (CHOP / ADX)

- Block **new entries** when the market is sideways (e.g. high CHOP or low ADX).
- Do **not** force-exit only because chop rises while still in a trend.
- ATR is better as a scale for buffer size later, not as the main regime signal.

### 2. Structural exit

Separate from the buffer:

- Buffer = ignore shallow dips under the fast MA.
- Structural exit = trend is actually over (e.g. fast under slow, or close under slow), and may bypass the buffer.

### 3. Stay policy

Default while in a trade is stay. Leave on:

- tactical exit (close through the exit buffer under fast), or
- structural exit (trend break).

### 4. Optional entry buffer

Only if weak opens become a problem later. Not required for the pullback/whipsaw issue.

### 5. Complementary sleeve (later)

A second system for choppy markets only if returns *during* sideways markets are a goal. Do not dilute the core MA rules to chase that. Sitting in cash when regime says “no trend” is a valid first form of diversification.

## Tuning guidance

- Compare buffer levels on the Chart tab before changing the nightly scan.
- Do not grid-search exit buffer and MA periods together at first — easy to overfit.
- Re-score with existing metrics plus fewer trades / longer time in trade.
- When a buffer looks good, wire that value into `scanSymbol` and re-run `analyze-symbols` so Signals / Daily log match the chart.

## Suggested next steps

1. Pick a default exit buffer from chart testing; apply it to the nightly scan.
2. Add a structural exit (trend break) that can fire even when the buffer would hold.
3. Add a regime entry gate (CHOP and/or ADX) so new opens are skipped in dead markets.
