# Task: Per-symbol exit buffer from average pullback under the fast MA

## What this is about

1. On uptrends, a chart will have pullbacks.
2. Some charts have bigger pullbacks on their uptrends than others.
3. Bigger pullbacks often trigger a trade exit because the pullback goes below
   the fast MA — that is the exit rule.
4. When the pullback rebounds and continues the uptrend, we get an entry signal
   again.
5. The goal is to reduce that out-and-back-in cycle.
6. Idea: each stock may have a typical pullback size. Use that percentage as an
   exit buffer under the fast MA. Example: "Stock ABC has an average pullback
   of 2%, so give it a 2% buffer below its fast MA."

## How to get that percentage

7. Measure it like this:

   a. Look for when price drops below the fast MA (a trade close) and then
      rebounds to cross above the fast MA again (a trade open). That is called
      an **event**.

   b. Record how far below the fast MA the price went.

   c. Do that for each time the event happens. Add those percentages up and get
      an average of how far price goes below the fast MA before it goes back
      above it.

   d. Do **not** include an event where the fast MA goes below the slow MA.
      When that happens, the chart is no longer in an uptrend.

Do not change the event definition in (a)–(d) unless there is a clear bug in
how it is coded. If something is unclear, ask before inventing a new rule.

## What the average is used for

The average (also report the median) is the candidate **per-symbol exit
buffer**: exit only when price closes that percent under the fast MA, not at
the exact fast MA.

Example: average is 2% → exit when close is below `fast MA × (1 − 0.02)`.

## What this is not

- This is not the pullback-tendency work in `docs/pullback-tendency-task.md`
  and `docs/reports/pullback-tendency-*.md`. That study measured how deep
  pullbacks were inside an uptrend. This task measures how far price goes
  **below the fast MA** on an event, then comes back above it.
- This is not a single buffer for every stock. A global exit buffer already
  lost (`docs/reports/buffer-bakeoff-sp500.md`). This is one buffer per stock,
  taken from that stock’s own events.
- Do not bring back ADX gates or other ideas already ruled out.

## Choices to pick and write down when coding

Keep these simple. State the choice in the code comment and the report.

- Use daily **close** or daily **low** to measure how far below the fast MA
  price went. The live exit rule uses **close**. Prefer close unless there is
  a clear reason to use low.
- Use each symbol’s optimized fast/slow from the scan (same as the app).
- Need a minimum number of events before trusting the average. If too few
  events, use buffer 0 for that symbol.  Make sure that this is noted in report.
- A max buffer cap so one extreme event does not set a huge buffer.  Make sure this is noted.

## Before changing the live scan

Build the metric and a bakeoff first. Compare buffer 0 to the per-symbol
average buffer. Use the same kind of decision rule as the other bakeoffs
(median return, and how many symbols improved vs got worse). Do not change
the nightly scan until that bakeoff says it wins.

## Where code and reports go

- Research script: `scripts/analytics/`
- Report output: `docs/reports/`
- Shared metric code: `frontend/src/` (plain JS, no React), same pattern as
  other analytics scripts.

## Code (ready to run)

1. Metric module: `frontend/src/undershootBuffer.js`
2. Bakeoff script: `scripts/analytics/undershoot-buffer-bakeoff.mjs`
3. Report output: `docs/reports/undershoot-buffer-<universe|symbols>.md`

```bash
# one symbol
node scripts/analytics/undershoot-buffer-bakeoff.mjs --symbol AAPL

# Dow smoke
node scripts/analytics/undershoot-buffer-bakeoff.mjs --universe=dow30

# full S&P (decision sample)
node scripts/analytics/undershoot-buffer-bakeoff.mjs
```

The report is meant to answer one question: does a per-symbol buffer from
average (or median) undershoot beat buffer 0 on median return, with more
symbols improved than worsened?

After you run it, write a short keep / drop / needs-more-work note in plain
language. Do not change the nightly scan until that note says keep.
