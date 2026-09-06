# ADX regime-gate bakeoff — S&P 500

Generated 2026-09-05T04:06:16.566Z in 4.0s by `scripts/regime-gate-bakeoff.mjs`.

## Run

```bash
node scripts/regime-gate-bakeoff.mjs
```

Prerequisites: MySQL reachable with `backend/.env` configured, `daily_stock_data`
populated (`npm run get-bulk-price-data`), and `symbol_daily_scan` populated
(`npm run analyze-symbols`) so each symbol uses its optimized MA periods.
Also needs network once at start to fetch the S&P 500 constituent list.

| Setting | Value |
| --- | --- |
| Universe | S&P 500 constituents (https://yfiua.github.io/index-constituents/constituents-sp500.json) |
| History window | `HISTORY_YEARS` = 3 |
| Bar dates observed | 2023-09-05 → 2026-09-02 |
| Symbols requested | 503 |
| Symbols analyzed | 496 |
| Symbols skipped | 7 |
| MA type | SMA |
| Open confirm | single (one close above fast) |
| Exit buffer % | 0 (none) |
| MA periods | per-symbol from `symbol_daily_scan`, else 21/50 |
| ADX period | 14 (Wilder) |
| Thresholds tested | off, 15, 20, 25, 30 |

Only the ADX entry threshold varies. The gate is one additional AND condition on **new opens**:
an open also requires ADX(14) above the threshold on the signal bar. It never forces a close — a
falling ADX while in a position changes nothing. Every other open/close rule is unchanged, and
signals come from `simulateTrades` in `frontend/src/tradeSignals.js` — the same engine the Chart
tab and nightly scan use. Each symbol's `off` row is asserted against a run with no gate options
at all (trade count and compounded return) before this report is written, so `off` is the same
baseline the exit-buffer bakeoffs reported at buffer 0.

MA periods are **not** co-tuned with the threshold — `docs/improvements.md` flags that as the overfitting trap.

## Summary per threshold

| Threshold | Median return | Mean return | Median trades | Mean trades | Median win rate | Median hold (days) | Median blocked | Total blocked | Median time in market | Improved vs off | Worsened vs off | Fewer trades vs off | No closed trades |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| off | +25.1% | +51.4% | 27.0 | 28.2 | 40.9% | 13.8 | 0 | 0 | 35.4% | — | — | — | 0 |
| ADX > 15 | +18.9% | +43.0% | 23.0 | 24.1 | 41.2% | 14.7 | 21 | 11838 | 31.7% | 161 | 333 | 459 | 0 |
| ADX > 20 | +12.9% | +30.2% | 16.0 | 18.1 | 41.7% | 15.8 | 70 | 35159 | 25.4% | 112 | 384 | 493 | 0 |
| ADX > 25 | +8.7% | +17.8% | 11.0 | 12.6 | 42.9% | 17.0 | 118 | 59827 | 18.4% | 99 | 397 | 496 | 0 |
| ADX > 30 | +2.4% | +10.1% | 7.0 | 8.4 | 40.0% | 17.3 | 164 | 81164 | 12.4% | 69 | 427 | 496 | 0 |

Symbols with no closed trades at a threshold have no defined return or win rate; those cells are
excluded from the medians and means (counted in the last column) so that a gate which merely
suppresses trading cannot look good on a smaller, luckier sample.

**Entries blocked** counts signal bars where every core open condition passed and only the ADX
gate failed. **Time in market** is bars held ÷ total bars, counting a still-open position as
exposure even though it is excluded from the return math.

## Conclusion

**Decision rule, fixed before the run:** adopt a threshold only if it beats `off` on median return **and** improves more symbols than it worsens. Both conditions, or nothing changes.

**No threshold clears both bars, so nothing is wired into the nightly scan.** Baseline median is +25.1% with the gate off.

Best median among the gated runs: ADX > 15 at +18.9% (161 up / 333 down).

No threshold improved more symbols than it worsened.

Read median return next to time in market: a gate that lifts the median purely by sitting out is buying that median with lost exposure, not with edge. Median is the headline number because a single outlier symbol can dominate the mean; compare the two columns before acting on either.

## Per-symbol appendix

### A — 12/60 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +31.3% | 36.7% | 11.8 | 0 | 31.6% | 0 |
| ADX > 15 | 27 | +24.3% | 37.0% | 12.2 | 15 | 29.7% | 0 |
| ADX > 20 | 21 | -6.6% | 23.8% | 10.5 | 90 | 19.7% | 0 |
| ADX > 25 | 10 | -0.9% | 30.0% | 11.3 | 161 | 10.2% | 0 |
| ADX > 30 | 7 | -5.3% | 42.9% | 7.9 | 201 | 4.9% | 0 |

### AAPL — 14/80 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +67.6% | 61.9% | 18.3 | 0 | 36.7% | 1 |
| ADX > 15 | 20 | +47.5% | 60.0% | 17.1 | 28 | 33.0% | 1 |
| ADX > 20 | 17 | +46.8% | 64.7% | 17.2 | 63 | 28.3% | 1 |
| ADX > 25 | 14 | +16.1% | 57.1% | 17.8 | 107 | 22.7% | 0 |
| ADX > 30 | 11 | +16.7% | 54.5% | 13.6 | 174 | 13.8% | 0 |

### ABBV — 26/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +57.0% | 40.0% | 18.0 | 0 | 42.6% | 1 |
| ADX > 15 | 18 | +61.6% | 44.4% | 22.2 | 33 | 38.2% | 1 |
| ADX > 20 | 15 | +39.0% | 40.0% | 24.4 | 58 | 34.8% | 1 |
| ADX > 25 | 11 | +31.1% | 45.5% | 27.8 | 100 | 29.3% | 1 |
| ADX > 30 | 9 | +23.8% | 44.4% | 29.9 | 134 | 25.0% | 0 |

### ABNB — 16/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +13.0% | 30.0% | 12.2 | 0 | 33.4% | 0 |
| ADX > 15 | 29 | -6.9% | 20.7% | 11.0 | 30 | 29.4% | 0 |
| ADX > 20 | 17 | -6.8% | 23.5% | 10.8 | 116 | 16.8% | 0 |
| ADX > 25 | 12 | -11.5% | 33.3% | 11.3 | 149 | 12.4% | 0 |
| ADX > 30 | 9 | -8.3% | 22.2% | 11.2 | 175 | 8.9% | 0 |

### ABT — 10/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 36 | +16.9% | 38.9% | 9.7 | 0 | 33.1% | 0 |
| ADX > 15 | 24 | +18.9% | 45.8% | 11.8 | 48 | 26.7% | 0 |
| ADX > 20 | 20 | +9.2% | 40.0% | 12.3 | 74 | 23.3% | 0 |
| ADX > 25 | 16 | +4.6% | 43.8% | 11.8 | 114 | 17.6% | 0 |
| ADX > 30 | 12 | -0.5% | 41.7% | 12.1 | 143 | 13.7% | 0 |

### ACGL — 28/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | -2.9% | 33.3% | 18.1 | 0 | 30.1% | 0 |
| ADX > 15 | 17 | -1.1% | 35.3% | 19.0 | 3 | 29.7% | 0 |
| ADX > 20 | 13 | +1.9% | 30.8% | 22.2 | 28 | 26.3% | 0 |
| ADX > 25 | 8 | -6.3% | 25.0% | 24.0 | 82 | 17.6% | 0 |
| ADX > 30 | 3 | -2.1% | 66.7% | 31.0 | 151 | 8.4% | 0 |

### ACN — 10/50 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 34 | +12.2% | 35.3% | 9.5 | 0 | 29.7% | 1 |
| ADX > 15 | 27 | +19.6% | 44.4% | 11.0 | 15 | 27.5% | 1 |
| ADX > 20 | 21 | +10.7% | 38.1% | 12.2 | 42 | 23.9% | 1 |
| ADX > 25 | 17 | -1.7% | 23.5% | 11.7 | 92 | 17.6% | 0 |
| ADX > 30 | 11 | -1.7% | 18.2% | 11.3 | 140 | 11.2% | 0 |

### ADBE — 16/86 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | -5.2% | 42.9% | 8.4 | 0 | 12.0% | 1 |
| ADX > 15 | 14 | -5.2% | 42.9% | 8.4 | 0 | 12.0% | 1 |
| ADX > 20 | 13 | -13.4% | 30.8% | 5.8 | 29 | 8.1% | 1 |
| ADX > 25 | 8 | -10.2% | 25.0% | 6.4 | 54 | 4.8% | 1 |
| ADX > 30 | 3 | -3.0% | 0.0% | 8.7 | 75 | 2.3% | 0 |

### ADI — 8/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 44 | +34.5% | 36.4% | 8.9 | 0 | 34.7% | 0 |
| ADX > 15 | 38 | +18.8% | 34.2% | 9.2 | 29 | 30.9% | 0 |
| ADX > 20 | 31 | +32.1% | 41.9% | 9.7 | 63 | 26.3% | 0 |
| ADX > 25 | 23 | +13.5% | 43.5% | 9.6 | 119 | 18.9% | 0 |
| ADX > 30 | 20 | +2.5% | 35.0% | 8.7 | 149 | 14.8% | 0 |

### ADM — 8/86 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 36 | +17.4% | 36.1% | 7.8 | 0 | 26.7% | 1 |
| ADX > 15 | 29 | +0.9% | 27.6% | 8.1 | 36 | 21.9% | 1 |
| ADX > 20 | 20 | +7.9% | 30.0% | 8.0 | 92 | 14.8% | 0 |
| ADX > 25 | 15 | +15.3% | 46.7% | 8.2 | 116 | 11.6% | 0 |
| ADX > 30 | 8 | -0.4% | 25.0% | 5.5 | 170 | 4.4% | 0 |

### ADP — 16/60 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +23.2% | 47.8% | 14.1 | 0 | 30.6% | 1 |
| ADX > 15 | 19 | +21.1% | 42.1% | 15.2 | 23 | 27.5% | 1 |
| ADX > 20 | 15 | +12.1% | 26.7% | 16.8 | 47 | 24.3% | 1 |
| ADX > 25 | 13 | +3.3% | 23.1% | 16.2 | 75 | 20.6% | 1 |
| ADX > 30 | 10 | -3.8% | 30.0% | 15.2 | 115 | 15.3% | 1 |

### ADSK — 30/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | +4.9% | 29.4% | 20.2 | 0 | 33.1% | 1 |
| ADX > 15 | 14 | +3.6% | 28.6% | 23.9 | 6 | 32.3% | 1 |
| ADX > 20 | 12 | -1.0% | 33.3% | 24.9 | 30 | 29.1% | 1 |
| ADX > 25 | 7 | +19.1% | 57.1% | 35.0 | 53 | 24.2% | 1 |
| ADX > 30 | 6 | +4.7% | 33.3% | 35.3 | 89 | 19.5% | 0 |

### AEE — 28/72 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | -0.6% | 29.2% | 17.3 | 0 | 38.8% | 0 |
| ADX > 15 | 21 | -0.2% | 23.8% | 16.9 | 43 | 33.1% | 0 |
| ADX > 20 | 18 | -8.4% | 27.8% | 15.8 | 87 | 27.3% | 0 |
| ADX > 25 | 6 | +3.0% | 33.3% | 27.8 | 173 | 15.8% | 0 |
| ADX > 30 | 5 | +5.2% | 20.0% | 29.0 | 188 | 13.8% | 0 |

### AEP — 26/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +31.1% | 42.9% | 21.7 | 0 | 42.0% | 0 |
| ADX > 15 | 19 | +29.8% | 47.4% | 23.4 | 8 | 41.0% | 0 |
| ADX > 20 | 16 | +32.6% | 56.3% | 25.7 | 31 | 37.9% | 0 |
| ADX > 25 | 11 | +17.3% | 45.5% | 28.5 | 92 | 29.3% | 0 |
| ADX > 30 | 9 | -7.5% | 33.3% | 27.9 | 124 | 23.3% | 0 |

### AES — 12/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +16.8% | 26.7% | 7.7 | 0 | 20.9% | 1 |
| ADX > 15 | 28 | +19.7% | 28.6% | 8.0 | 5 | 20.5% | 0 |
| ADX > 20 | 18 | +5.5% | 33.3% | 8.3 | 54 | 14.0% | 0 |
| ADX > 25 | 13 | -3.9% | 23.1% | 6.4 | 99 | 8.0% | 0 |
| ADX > 30 | 12 | -6.1% | 25.0% | 4.8 | 117 | 5.6% | 0 |

### AFL — 10/96 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +9.4% | 46.2% | 10.6 | 0 | 38.2% | 0 |
| ADX > 15 | 30 | +21.7% | 46.7% | 11.3 | 49 | 31.6% | 0 |
| ADX > 20 | 18 | +10.7% | 44.4% | 10.9 | 148 | 18.5% | 0 |
| ADX > 25 | 12 | +11.4% | 33.3% | 10.6 | 193 | 12.1% | 0 |
| ADX > 30 | 7 | +10.7% | 28.6% | 10.3 | 231 | 7.0% | 0 |

### AIG — 26/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | -8.9% | 31.6% | 13.4 | 0 | 23.1% | 0 |
| ADX > 15 | 13 | -9.6% | 23.1% | 14.4 | 46 | 17.0% | 0 |
| ADX > 20 | 8 | -13.9% | 12.5% | 18.8 | 71 | 13.7% | 0 |
| ADX > 25 | 8 | -16.8% | 12.5% | 15.4 | 89 | 11.3% | 0 |
| ADX > 30 | 4 | -17.3% | 25.0% | 16.8 | 130 | 5.9% | 0 |

### AIZ — 22/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +25.6% | 41.7% | 19.1 | 0 | 41.9% | 0 |
| ADX > 15 | 22 | +23.7% | 40.9% | 20.5 | 3 | 41.1% | 0 |
| ADX > 20 | 20 | +16.8% | 40.0% | 20.7 | 28 | 37.6% | 0 |
| ADX > 25 | 14 | +12.2% | 42.9% | 22.6 | 93 | 29.0% | 0 |
| ADX > 30 | 9 | +2.6% | 33.3% | 23.4 | 167 | 19.1% | 0 |

### AJG — 8/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +23.3% | 53.1% | 10.1 | 0 | 29.4% | 0 |
| ADX > 15 | 28 | +21.9% | 57.1% | 10.5 | 20 | 26.7% | 0 |
| ADX > 20 | 23 | +15.4% | 56.5% | 11.1 | 45 | 23.4% | 0 |
| ADX > 25 | 16 | -3.3% | 37.5% | 9.5 | 118 | 13.7% | 0 |
| ADX > 30 | 7 | -8.3% | 14.3% | 6.6 | 190 | 4.1% | 0 |

### AKAM — 8/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | -13.4% | 28.6% | 7.7 | 0 | 29.1% | 0 |
| ADX > 15 | 35 | -12.7% | 22.9% | 8.3 | 22 | 26.2% | 0 |
| ADX > 20 | 28 | -15.6% | 25.0% | 8.3 | 60 | 21.1% | 0 |
| ADX > 25 | 20 | -12.7% | 25.0% | 8.1 | 107 | 14.2% | 0 |
| ADX > 30 | 15 | -15.7% | 20.0% | 7.6 | 135 | 10.5% | 0 |

### ALB — 16/72 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +56.4% | 54.5% | 13.5 | 0 | 27.9% | 0 |
| ADX > 15 | 19 | +44.0% | 47.4% | 13.6 | 26 | 24.5% | 0 |
| ADX > 20 | 16 | +5.9% | 37.5% | 12.1 | 76 | 17.8% | 0 |
| ADX > 25 | 7 | +12.3% | 42.9% | 15.6 | 136 | 9.8% | 0 |
| ADX > 30 | 3 | -2.5% | 33.3% | 17.7 | 176 | 4.5% | 0 |

### ALGN — 24/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | -30.2% | 36.0% | 14.4 | 0 | 32.6% | 0 |
| ADX > 15 | 15 | -20.4% | 40.0% | 17.9 | 61 | 24.5% | 0 |
| ADX > 20 | 10 | +29.1% | 60.0% | 24.2 | 77 | 21.8% | 0 |
| ADX > 25 | 8 | -8.4% | 62.5% | 22.9 | 119 | 16.2% | 0 |
| ADX > 30 | 4 | -0.5% | 50.0% | 31.8 | 158 | 11.0% | 0 |

### ALL — 28/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +13.0% | 37.0% | 19.3 | 0 | 48.1% | 0 |
| ADX > 15 | 22 | +14.5% | 40.9% | 21.4 | 32 | 43.0% | 0 |
| ADX > 20 | 14 | +8.9% | 42.9% | 26.5 | 87 | 34.0% | 0 |
| ADX > 25 | 9 | +8.7% | 55.6% | 33.2 | 136 | 27.5% | 0 |
| ADX > 30 | 6 | +11.8% | 66.7% | 37.0 | 190 | 20.3% | 0 |

### ALLE — 24/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +74.6% | 60.0% | 22.5 | 0 | 41.8% | 0 |
| ADX > 15 | 17 | +60.8% | 58.8% | 25.7 | 10 | 40.4% | 0 |
| ADX > 20 | 15 | +66.1% | 60.0% | 27.6 | 22 | 38.3% | 0 |
| ADX > 25 | 12 | +29.9% | 50.0% | 28.3 | 66 | 31.4% | 0 |
| ADX > 30 | 11 | -0.5% | 54.5% | 23.2 | 119 | 23.7% | 0 |

### AMAT — 14/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +133.2% | 50.0% | 14.8 | 0 | 42.3% | 0 |
| ADX > 15 | 30 | +90.3% | 46.7% | 15.0 | 17 | 39.9% | 0 |
| ADX > 20 | 25 | +45.9% | 48.0% | 13.6 | 90 | 30.2% | 0 |
| ADX > 25 | 14 | +36.8% | 50.0% | 16.1 | 168 | 19.8% | 0 |
| ADX > 30 | 13 | +14.3% | 61.5% | 12.2 | 208 | 14.5% | 0 |

### AMCR — 30/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 16 | +1.0% | 31.3% | 20.7 | 0 | 30.1% | 0 |
| ADX > 15 | 14 | -6.6% | 21.4% | 20.1 | 35 | 25.4% | 0 |
| ADX > 20 | 10 | -2.2% | 30.0% | 22.5 | 75 | 20.2% | 0 |
| ADX > 25 | 5 | -9.6% | 20.0% | 28.4 | 129 | 13.0% | 0 |
| ADX > 30 | 2 | -12.6% | 0.0% | 26.5 | 192 | 4.7% | 0 |

### AMD — 12/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 33 | +208.2% | 51.5% | 12.6 | 0 | 36.8% | 0 |
| ADX > 15 | 31 | +103.3% | 48.4% | 12.4 | 18 | 34.4% | 0 |
| ADX > 20 | 29 | +18.0% | 37.9% | 11.4 | 50 | 29.7% | 0 |
| ADX > 25 | 17 | +93.4% | 47.1% | 15.9 | 92 | 24.1% | 0 |
| ADX > 30 | 15 | +60.1% | 33.3% | 14.4 | 127 | 19.4% | 0 |

### AME — 18/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 34 | +18.4% | 32.4% | 13.2 | 0 | 40.4% | 0 |
| ADX > 15 | 25 | +8.2% | 36.0% | 14.9 | 49 | 33.9% | 0 |
| ADX > 20 | 15 | +17.6% | 40.0% | 19.8 | 105 | 26.5% | 0 |
| ADX > 25 | 9 | +14.8% | 44.4% | 22.0 | 170 | 17.8% | 0 |
| ADX > 30 | 5 | +15.5% | 80.0% | 29.0 | 205 | 13.2% | 0 |

### AMGN — 12/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +53.5% | 51.7% | 13.2 | 0 | 34.7% | 1 |
| ADX > 15 | 26 | +41.6% | 50.0% | 12.7 | 34 | 30.2% | 1 |
| ADX > 20 | 20 | +30.5% | 55.0% | 13.9 | 70 | 25.4% | 1 |
| ADX > 25 | 15 | +17.6% | 53.3% | 12.1 | 136 | 16.6% | 1 |
| ADX > 30 | 13 | +0.1% | 30.8% | 10.8 | 166 | 12.6% | 1 |

### AMP — 20/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +28.2% | 32.0% | 17.6 | 0 | 40.3% | 0 |
| ADX > 15 | 22 | +24.2% | 31.8% | 19.0 | 15 | 38.3% | 0 |
| ADX > 20 | 18 | +10.9% | 38.9% | 20.3 | 51 | 33.5% | 0 |
| ADX > 25 | 12 | +21.2% | 50.0% | 23.7 | 109 | 25.8% | 0 |
| ADX > 30 | 8 | +31.3% | 87.5% | 29.3 | 141 | 21.5% | 0 |

### AMT — 20/50 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +23.3% | 42.1% | 15.7 | 0 | 28.5% | 1 |
| ADX > 15 | 18 | +9.6% | 33.3% | 15.8 | 11 | 27.0% | 1 |
| ADX > 20 | 13 | +3.0% | 38.5% | 15.8 | 67 | 19.7% | 0 |
| ADX > 25 | 8 | +14.3% | 50.0% | 19.8 | 103 | 14.9% | 0 |
| ADX > 30 | 6 | +10.3% | 50.0% | 21.2 | 125 | 12.0% | 0 |

### AMZN — 8/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 55 | +52.2% | 47.3% | 7.8 | 0 | 39.8% | 0 |
| ADX > 15 | 47 | +27.7% | 46.8% | 8.0 | 41 | 34.3% | 0 |
| ADX > 20 | 35 | -7.9% | 31.4% | 6.9 | 130 | 22.5% | 0 |
| ADX > 25 | 19 | -8.6% | 31.6% | 7.5 | 205 | 12.5% | 0 |
| ADX > 30 | 10 | -9.2% | 40.0% | 5.4 | 257 | 4.9% | 0 |

### ANET — 22/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +14.5% | 28.6% | 17.0 | 0 | 54.1% | 0 |
| ADX > 15 | 26 | -1.4% | 34.6% | 19.8 | 49 | 47.6% | 0 |
| ADX > 20 | 15 | -26.9% | 33.3% | 25.1 | 145 | 34.3% | 0 |
| ADX > 25 | 8 | -9.1% | 25.0% | 25.0 | 261 | 18.6% | 0 |
| ADX > 30 | 5 | -18.2% | 40.0% | 30.4 | 295 | 14.1% | 0 |

### AON — 12/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +38.5% | 44.4% | 13.7 | 0 | 34.3% | 0 |
| ADX > 15 | 24 | +18.5% | 41.7% | 13.4 | 30 | 30.3% | 0 |
| ADX > 20 | 14 | +21.2% | 50.0% | 16.5 | 96 | 21.4% | 0 |
| ADX > 25 | 12 | +6.5% | 50.0% | 12.0 | 156 | 13.4% | 0 |
| ADX > 30 | 8 | +0.1% | 37.5% | 11.6 | 190 | 8.9% | 0 |

### AOS — 12/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | -1.4% | 48.4% | 10.3 | 0 | 29.3% | 0 |
| ADX > 15 | 28 | +3.1% | 50.0% | 11.1 | 6 | 28.5% | 0 |
| ADX > 20 | 22 | -2.2% | 40.9% | 11.2 | 53 | 22.2% | 0 |
| ADX > 25 | 16 | +10.8% | 50.0% | 11.1 | 98 | 16.2% | 0 |
| ADX > 30 | 9 | -1.9% | 33.3% | 11.0 | 151 | 9.2% | 0 |

### APA — 14/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +48.0% | 43.5% | 11.8 | 0 | 25.4% | 1 |
| ADX > 15 | 20 | +30.1% | 45.0% | 12.6 | 14 | 23.5% | 1 |
| ADX > 20 | 15 | +1.5% | 40.0% | 12.3 | 63 | 17.0% | 1 |
| ADX > 25 | 10 | -16.3% | 30.0% | 12.5 | 106 | 11.4% | 0 |
| ADX > 30 | 7 | -9.9% | 28.6% | 12.0 | 134 | 7.8% | 0 |

### APD — 10/62 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 34 | +25.1% | 58.8% | 9.5 | 0 | 29.3% | 0 |
| ADX > 15 | 23 | +19.5% | 60.9% | 9.9 | 62 | 21.0% | 0 |
| ADX > 20 | 15 | -1.0% | 33.3% | 9.5 | 116 | 13.4% | 0 |
| ADX > 25 | 8 | -2.9% | 37.5% | 11.5 | 155 | 8.4% | 0 |
| ADX > 30 | 4 | +0.5% | 50.0% | 11.5 | 185 | 4.4% | 0 |

### APH — 12/50 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +102.2% | 60.0% | 16.3 | 0 | 51.3% | 0 |
| ADX > 15 | 31 | +87.5% | 64.5% | 16.6 | 33 | 46.7% | 0 |
| ADX > 20 | 25 | +135.9% | 72.0% | 17.8 | 79 | 40.3% | 0 |
| ADX > 25 | 18 | +51.9% | 61.1% | 19.8 | 140 | 32.2% | 0 |
| ADX > 30 | 12 | +30.2% | 75.0% | 22.9 | 194 | 25.0% | 0 |

### APO — 20/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +26.6% | 34.6% | 17.6 | 0 | 41.5% | 0 |
| ADX > 15 | 24 | +26.7% | 37.5% | 17.6 | 20 | 38.6% | 0 |
| ADX > 20 | 18 | +0.3% | 33.3% | 18.3 | 82 | 30.1% | 0 |
| ADX > 25 | 9 | +21.5% | 44.4% | 20.2 | 179 | 16.6% | 0 |
| ADX > 30 | 7 | +6.1% | 57.1% | 21.1 | 203 | 13.4% | 0 |

### APP — 8/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 44 | +416.7% | 52.3% | 10.1 | 0 | 40.2% | 0 |
| ADX > 15 | 41 | +431.4% | 53.7% | 10.3 | 13 | 38.4% | 0 |
| ADX > 20 | 31 | +214.3% | 54.8% | 11.2 | 64 | 31.6% | 0 |
| ADX > 25 | 22 | +53.1% | 45.5% | 11.2 | 135 | 22.2% | 0 |
| ADX > 30 | 13 | +39.8% | 46.2% | 13.2 | 187 | 15.3% | 0 |

### APTV — 8/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 34 | +0.0% | 38.2% | 7.7 | 0 | 23.4% | 0 |
| ADX > 15 | 30 | +7.6% | 43.3% | 8.1 | 13 | 21.7% | 0 |
| ADX > 20 | 23 | -0.1% | 34.8% | 7.6 | 55 | 16.1% | 0 |
| ADX > 25 | 11 | +9.3% | 45.5% | 7.6 | 117 | 7.8% | 0 |
| ADX > 30 | 7 | -8.7% | 14.3% | 9.3 | 134 | 5.6% | 0 |

### ARE — 12/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +6.2% | 30.0% | 12.0 | 0 | 22.7% | 1 |
| ADX > 15 | 15 | +10.7% | 40.0% | 13.9 | 23 | 19.7% | 1 |
| ADX > 20 | 11 | +15.2% | 45.5% | 13.9 | 70 | 13.7% | 0 |
| ADX > 25 | 8 | +10.3% | 37.5% | 14.1 | 97 | 10.1% | 0 |
| ADX > 30 | 6 | +10.5% | 16.7% | 12.5 | 121 | 6.9% | 0 |

### ARES — 28/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +19.4% | 47.4% | 27.1 | 0 | 48.9% | 1 |
| ADX > 15 | 18 | -4.1% | 38.9% | 24.2 | 39 | 41.6% | 1 |
| ADX > 20 | 13 | -26.5% | 30.8% | 24.6 | 119 | 31.0% | 1 |
| ADX > 25 | 7 | -17.2% | 42.9% | 24.3 | 223 | 17.2% | 1 |
| ADX > 30 | 4 | -9.2% | 25.0% | 15.0 | 299 | 7.0% | 1 |

### ATO — 8/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 49 | +15.7% | 40.8% | 8.5 | 0 | 38.2% | 0 |
| ADX > 15 | 39 | +20.6% | 43.6% | 9.2 | 41 | 32.7% | 0 |
| ADX > 20 | 36 | +10.0% | 41.7% | 8.9 | 66 | 29.3% | 0 |
| ADX > 25 | 20 | +9.0% | 60.0% | 9.8 | 151 | 18.0% | 0 |
| ADX > 30 | 14 | +6.8% | 57.1% | 8.4 | 201 | 11.3% | 0 |

### AVB — 22/62 SMA, 745 bars, 2023-09-05 → 2026-08-24

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +0.5% | 40.9% | 13.1 | 0 | 27.1% | 0 |
| ADX > 15 | 16 | -3.2% | 43.8% | 16.1 | 22 | 24.2% | 0 |
| ADX > 20 | 13 | -3.8% | 38.5% | 15.7 | 57 | 19.5% | 0 |
| ADX > 25 | 11 | -4.9% | 36.4% | 12.8 | 102 | 13.4% | 0 |
| ADX > 30 | 9 | -2.4% | 33.3% | 11.2 | 129 | 9.8% | 0 |

### AVGO — 10/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 41 | +45.9% | 46.3% | 11.0 | 0 | 39.8% | 0 |
| ADX > 15 | 38 | +45.4% | 47.4% | 11.3 | 14 | 37.8% | 0 |
| ADX > 20 | 28 | +6.6% | 50.0% | 11.2 | 90 | 27.7% | 0 |
| ADX > 25 | 25 | -36.6% | 40.0% | 10.3 | 131 | 22.2% | 0 |
| ADX > 30 | 19 | -23.2% | 47.4% | 10.3 | 169 | 17.2% | 0 |

### AVY — 26/66 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +8.9% | 41.7% | 14.5 | 0 | 31.5% | 0 |
| ADX > 15 | 20 | -3.1% | 40.0% | 16.2 | 17 | 29.3% | 0 |
| ADX > 20 | 12 | +6.0% | 66.7% | 20.6 | 67 | 22.6% | 0 |
| ADX > 25 | 10 | -2.6% | 50.0% | 19.1 | 108 | 17.2% | 0 |
| ADX > 30 | 5 | -4.0% | 40.0% | 20.0 | 169 | 9.0% | 0 |

### AWK — 28/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | -12.7% | 17.4% | 12.9 | 0 | 30.1% | 1 |
| ADX > 15 | 16 | -3.5% | 18.8% | 15.5 | 33 | 25.7% | 1 |
| ADX > 20 | 12 | -3.8% | 16.7% | 17.0 | 64 | 21.5% | 1 |
| ADX > 25 | 8 | -5.4% | 25.0% | 21.3 | 110 | 15.7% | 0 |
| ADX > 30 | 4 | -5.6% | 25.0% | 21.0 | 169 | 7.8% | 0 |

### AXON — 8/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 37 | +130.9% | 56.8% | 10.7 | 0 | 36.3% | 0 |
| ADX > 15 | 35 | +104.9% | 54.3% | 10.4 | 17 | 34.0% | 0 |
| ADX > 20 | 30 | +50.9% | 53.3% | 10.3 | 56 | 28.9% | 0 |
| ADX > 25 | 19 | +45.8% | 52.6% | 11.2 | 131 | 18.9% | 0 |
| ADX > 30 | 10 | +37.4% | 40.0% | 13.5 | 183 | 12.0% | 0 |

### AXP — 16/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +38.2% | 44.8% | 17.8 | 0 | 47.3% | 0 |
| ADX > 15 | 28 | +18.6% | 39.3% | 17.6 | 16 | 45.2% | 0 |
| ADX > 20 | 20 | -0.1% | 30.0% | 16.9 | 116 | 30.9% | 0 |
| ADX > 25 | 12 | +4.7% | 16.7% | 15.4 | 218 | 17.0% | 0 |
| ADX > 30 | 5 | +18.5% | 40.0% | 23.0 | 267 | 10.5% | 0 |

### AZO — 10/74 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 40 | +14.5% | 42.5% | 7.7 | 0 | 29.3% | 0 |
| ADX > 15 | 38 | +11.0% | 44.7% | 7.8 | 12 | 27.7% | 0 |
| ADX > 20 | 31 | +12.4% | 38.7% | 7.7 | 48 | 22.9% | 0 |
| ADX > 25 | 26 | -10.9% | 26.9% | 7.1 | 88 | 17.6% | 0 |
| ADX > 30 | 13 | -11.4% | 23.1% | 7.6 | 152 | 9.0% | 0 |

### BA — 8/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +45.9% | 25.8% | 10.0 | 0 | 28.3% | 0 |
| ADX > 15 | 30 | +46.9% | 26.7% | 10.3 | 1 | 28.2% | 0 |
| ADX > 20 | 23 | +75.2% | 34.8% | 12.1 | 22 | 25.3% | 0 |
| ADX > 25 | 16 | +38.9% | 31.3% | 12.8 | 74 | 18.4% | 0 |
| ADX > 30 | 10 | +32.0% | 40.0% | 14.8 | 115 | 12.9% | 0 |

### BAC — 20/68 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +45.7% | 51.7% | 19.4 | 0 | 51.6% | 0 |
| ADX > 15 | 25 | +28.5% | 52.0% | 20.8 | 29 | 47.7% | 0 |
| ADX > 20 | 20 | +7.3% | 45.0% | 19.8 | 119 | 35.8% | 0 |
| ADX > 25 | 13 | +6.1% | 46.2% | 21.1 | 202 | 24.7% | 0 |
| ADX > 30 | 7 | +3.5% | 42.9% | 21.6 | 284 | 13.8% | 0 |

### BALL — 10/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 34 | +49.7% | 35.3% | 11.1 | 0 | 34.6% | 0 |
| ADX > 15 | 28 | +46.1% | 35.7% | 11.6 | 38 | 29.4% | 0 |
| ADX > 20 | 26 | +26.4% | 34.6% | 11.3 | 60 | 26.5% | 0 |
| ADX > 25 | 18 | +27.6% | 38.9% | 12.2 | 109 | 19.9% | 0 |
| ADX > 30 | 13 | +27.0% | 53.8% | 12.0 | 153 | 14.1% | 0 |

### BAX — 28/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +34.5% | 33.3% | 16.0 | 0 | 34.3% | 0 |
| ADX > 15 | 21 | +18.0% | 28.6% | 17.0 | 17 | 31.9% | 0 |
| ADX > 20 | 15 | +21.6% | 40.0% | 20.2 | 53 | 27.1% | 0 |
| ADX > 25 | 13 | +14.3% | 46.2% | 20.2 | 79 | 23.7% | 0 |
| ADX > 30 | 9 | -6.2% | 33.3% | 16.8 | 154 | 13.7% | 0 |

### BBY — 8/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +8.7% | 37.1% | 7.3 | 0 | 23.7% | 0 |
| ADX > 15 | 32 | +3.8% | 37.5% | 7.3 | 14 | 21.8% | 0 |
| ADX > 20 | 24 | -15.7% | 33.3% | 6.7 | 68 | 14.8% | 0 |
| ADX > 25 | 15 | -4.4% | 26.7% | 7.1 | 105 | 9.8% | 0 |
| ADX > 30 | 11 | -11.9% | 27.3% | 5.2 | 141 | 5.1% | 0 |

### BDX — 10/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +20.1% | 37.0% | 7.7 | 0 | 19.3% | 0 |
| ADX > 15 | 21 | +11.9% | 38.1% | 7.2 | 37 | 14.4% | 0 |
| ADX > 20 | 9 | +15.8% | 55.6% | 11.3 | 76 | 9.2% | 0 |
| ADX > 25 | 5 | +11.6% | 60.0% | 13.6 | 98 | 6.3% | 0 |
| ADX > 30 | 4 | +0.6% | 25.0% | 7.5 | 123 | 2.9% | 0 |

### BEN — 20/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +32.9% | 38.5% | 15.6 | 0 | 35.6% | 0 |
| ADX > 15 | 24 | +28.3% | 37.5% | 16.2 | 8 | 34.3% | 0 |
| ADX > 20 | 12 | +51.1% | 50.0% | 23.9 | 77 | 25.1% | 0 |
| ADX > 25 | 9 | +42.4% | 55.6% | 27.3 | 102 | 21.8% | 0 |
| ADX > 30 | 6 | +10.0% | 66.7% | 28.0 | 156 | 14.6% | 0 |

### BG — 14/78 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +11.0% | 31.0% | 10.9 | 0 | 29.3% | 0 |
| ADX > 15 | 27 | -2.9% | 25.9% | 11.0 | 13 | 27.1% | 0 |
| ADX > 20 | 14 | -0.6% | 28.6% | 12.4 | 98 | 15.6% | 0 |
| ADX > 25 | 7 | +15.9% | 57.1% | 15.4 | 143 | 9.6% | 0 |
| ADX > 30 | 4 | +10.0% | 75.0% | 17.5 | 166 | 6.5% | 0 |

### BIIB — 10/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 36 | -1.8% | 41.7% | 9.1 | 0 | 29.4% | 0 |
| ADX > 15 | 29 | -7.7% | 41.4% | 10.2 | 21 | 26.5% | 0 |
| ADX > 20 | 18 | -23.0% | 38.9% | 8.6 | 110 | 14.2% | 0 |
| ADX > 25 | 7 | -6.4% | 42.9% | 8.6 | 172 | 5.5% | 0 |
| ADX > 30 | 3 | -2.8% | 33.3% | 11.3 | 191 | 3.1% | 0 |

### BKNG — 30/64 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 13 | +49.6% | 61.5% | 29.9 | 0 | 35.2% | 0 |
| ADX > 15 | 13 | +37.2% | 61.5% | 29.7 | 3 | 34.8% | 0 |
| ADX > 20 | 10 | +29.9% | 60.0% | 34.3 | 29 | 30.9% | 0 |
| ADX > 25 | 8 | +17.0% | 50.0% | 32.0 | 87 | 23.1% | 0 |
| ADX > 30 | 5 | +9.1% | 60.0% | 33.8 | 147 | 15.2% | 0 |

### BKR — 12/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +55.6% | 43.3% | 12.8 | 0 | 35.2% | 1 |
| ADX > 15 | 27 | +38.8% | 37.0% | 13.3 | 19 | 32.7% | 0 |
| ADX > 20 | 20 | +9.2% | 30.0% | 13.8 | 76 | 25.3% | 0 |
| ADX > 25 | 13 | -1.0% | 23.1% | 13.5 | 144 | 16.2% | 0 |
| ADX > 30 | 8 | -0.7% | 37.5% | 13.6 | 191 | 10.0% | 0 |

### BLDR — 10/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +17.7% | 44.8% | 9.9 | 0 | 25.7% | 0 |
| ADX > 15 | 27 | -3.6% | 37.0% | 9.6 | 20 | 23.0% | 0 |
| ADX > 20 | 21 | +8.2% | 42.9% | 10.8 | 39 | 20.5% | 0 |
| ADX > 25 | 19 | +5.4% | 31.6% | 9.2 | 74 | 15.8% | 0 |
| ADX > 30 | 13 | +5.6% | 38.5% | 10.0 | 104 | 11.8% | 0 |

### BLK — 30/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +42.3% | 36.8% | 27.3 | 0 | 47.2% | 0 |
| ADX > 15 | 17 | +27.5% | 35.3% | 28.8 | 21 | 44.4% | 0 |
| ADX > 20 | 6 | +30.3% | 66.7% | 50.0 | 135 | 27.4% | 0 |
| ADX > 25 | 5 | +29.7% | 80.0% | 56.2 | 147 | 25.8% | 0 |
| ADX > 30 | 5 | +10.3% | 60.0% | 47.8 | 179 | 21.5% | 0 |

### BMY — 8/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 44 | +36.3% | 40.9% | 6.9 | 0 | 28.1% | 0 |
| ADX > 15 | 37 | +44.3% | 45.9% | 7.5 | 17 | 25.8% | 0 |
| ADX > 20 | 32 | +10.4% | 37.5% | 7.4 | 50 | 21.4% | 0 |
| ADX > 25 | 28 | -1.5% | 35.7% | 6.6 | 87 | 16.5% | 0 |
| ADX > 30 | 18 | -13.3% | 33.3% | 6.6 | 131 | 10.6% | 0 |

### BR — 22/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | -1.3% | 33.3% | 13.7 | 0 | 33.2% | 1 |
| ADX > 15 | 12 | +4.9% | 50.0% | 19.5 | 64 | 24.7% | 1 |
| ADX > 20 | 8 | +13.4% | 75.0% | 24.8 | 87 | 20.6% | 1 |
| ADX > 25 | 6 | -0.8% | 50.0% | 22.0 | 136 | 14.1% | 1 |
| ADX > 30 | 4 | +4.0% | 75.0% | 27.0 | 162 | 10.6% | 1 |

### BRO — 26/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 16 | +37.4% | 31.3% | 24.6 | 0 | 37.8% | 1 |
| ADX > 15 | 15 | +30.2% | 26.7% | 25.9 | 5 | 37.1% | 1 |
| ADX > 20 | 13 | +18.8% | 30.8% | 25.5 | 35 | 32.2% | 1 |
| ADX > 25 | 10 | +8.6% | 40.0% | 25.7 | 87 | 25.3% | 1 |
| ADX > 30 | 7 | -1.0% | 42.9% | 31.4 | 119 | 21.0% | 1 |

### BSX — 20/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +29.0% | 46.2% | 18.9 | 0 | 44.4% | 0 |
| ADX > 15 | 22 | +38.8% | 50.0% | 21.5 | 10 | 43.1% | 0 |
| ADX > 20 | 19 | +27.9% | 47.4% | 22.5 | 33 | 38.7% | 0 |
| ADX > 25 | 15 | +12.8% | 46.7% | 23.5 | 81 | 32.3% | 0 |
| ADX > 30 | 10 | +11.8% | 60.0% | 22.6 | 161 | 21.0% | 0 |

### BX — 26/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +52.2% | 45.0% | 19.8 | 0 | 36.3% | 0 |
| ADX > 15 | 17 | +27.3% | 41.2% | 20.5 | 35 | 31.6% | 0 |
| ADX > 20 | 13 | -9.6% | 30.8% | 19.5 | 99 | 23.1% | 0 |
| ADX > 25 | 10 | -17.1% | 30.0% | 21.4 | 128 | 19.3% | 0 |
| ADX > 30 | 5 | -1.5% | 60.0% | 29.4 | 171 | 13.6% | 0 |

### BXP — 24/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | +41.1% | 47.1% | 19.5 | 0 | 30.6% | 0 |
| ADX > 15 | 13 | +34.2% | 53.8% | 24.1 | 15 | 28.6% | 0 |
| ADX > 20 | 11 | +41.6% | 54.5% | 26.0 | 33 | 26.2% | 0 |
| ADX > 25 | 10 | +24.2% | 60.0% | 25.7 | 54 | 23.4% | 0 |
| ADX > 30 | 6 | +8.7% | 50.0% | 34.5 | 91 | 18.5% | 0 |

### C — 10/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 40 | +126.4% | 57.5% | 13.1 | 0 | 47.6% | 0 |
| ADX > 15 | 35 | +111.7% | 57.1% | 13.1 | 44 | 41.8% | 0 |
| ADX > 20 | 29 | +52.6% | 51.7% | 13.2 | 95 | 35.0% | 0 |
| ADX > 25 | 19 | +29.3% | 47.4% | 13.7 | 181 | 23.5% | 0 |
| ADX > 30 | 12 | +29.4% | 58.3% | 16.3 | 226 | 17.6% | 0 |

### CAG — 12/60 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | -6.6% | 39.3% | 7.3 | 0 | 19.4% | 0 |
| ADX > 15 | 18 | -7.1% | 38.9% | 8.6 | 34 | 14.9% | 0 |
| ADX > 20 | 9 | -5.1% | 44.4% | 10.1 | 82 | 8.6% | 0 |
| ADX > 25 | 5 | -11.0% | 20.0% | 6.6 | 123 | 3.2% | 0 |
| ADX > 30 | 2 | -8.3% | 0.0% | 7.0 | 138 | 1.2% | 0 |

### CAH — 12/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 37 | +85.2% | 43.2% | 12.6 | 0 | 43.6% | 1 |
| ADX > 15 | 35 | +73.7% | 42.9% | 12.7 | 10 | 41.9% | 1 |
| ADX > 20 | 30 | +34.6% | 43.3% | 12.4 | 56 | 35.4% | 1 |
| ADX > 25 | 19 | +8.4% | 47.4% | 14.7 | 122 | 25.9% | 1 |
| ADX > 30 | 17 | -13.5% | 41.2% | 10.6 | 189 | 16.5% | 0 |

### CARR — 16/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +23.1% | 38.5% | 12.8 | 0 | 31.1% | 0 |
| ADX > 15 | 25 | +7.2% | 32.0% | 12.4 | 13 | 28.9% | 0 |
| ADX > 20 | 22 | -0.2% | 27.3% | 12.0 | 49 | 24.1% | 0 |
| ADX > 25 | 8 | -6.9% | 37.5% | 15.1 | 140 | 11.3% | 0 |
| ADX > 30 | 6 | -11.9% | 33.3% | 12.8 | 170 | 7.3% | 0 |

### CAT — 14/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +184.4% | 52.0% | 19.7 | 0 | 44.7% | 0 |
| ADX > 15 | 24 | +172.7% | 54.2% | 20.0 | 10 | 43.2% | 0 |
| ADX > 20 | 21 | +98.8% | 52.4% | 19.7 | 55 | 37.2% | 0 |
| ADX > 25 | 16 | +72.2% | 56.3% | 21.2 | 105 | 30.6% | 0 |
| ADX > 30 | 12 | +31.7% | 33.3% | 20.8 | 169 | 22.1% | 0 |

### CB — 28/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +16.2% | 50.0% | 26.3 | 0 | 42.7% | 0 |
| ADX > 15 | 15 | +3.9% | 53.3% | 28.2 | 34 | 38.2% | 0 |
| ADX > 20 | 12 | -5.4% | 50.0% | 27.8 | 79 | 30.5% | 0 |
| ADX > 25 | 11 | -17.8% | 18.2% | 22.1 | 134 | 22.3% | 0 |
| ADX > 30 | 4 | -9.3% | 25.0% | 20.5 | 245 | 7.6% | 0 |

### CBRE — 8/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 46 | +24.8% | 39.1% | 10.0 | 0 | 41.8% | 0 |
| ADX > 15 | 42 | +32.0% | 42.9% | 10.4 | 16 | 39.6% | 0 |
| ADX > 20 | 28 | +37.6% | 50.0% | 11.0 | 96 | 28.5% | 0 |
| ADX > 25 | 22 | +19.5% | 45.5% | 10.6 | 144 | 22.1% | 0 |
| ADX > 30 | 17 | +14.9% | 52.9% | 11.4 | 174 | 18.1% | 0 |

### CCI — 26/62 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | -6.4% | 28.6% | 15.9 | 0 | 20.7% | 0 |
| ADX > 15 | 11 | -8.4% | 18.2% | 17.3 | 20 | 17.7% | 0 |
| ADX > 20 | 8 | -4.2% | 25.0% | 19.6 | 44 | 14.5% | 0 |
| ADX > 25 | 5 | -3.1% | 40.0% | 28.2 | 55 | 13.0% | 0 |
| ADX > 30 | 3 | -1.3% | 33.3% | 38.0 | 74 | 10.5% | 0 |

### CCL — 8/56 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +49.7% | 40.5% | 7.6 | 0 | 28.7% | 0 |
| ADX > 15 | 38 | +48.1% | 36.8% | 8.0 | 11 | 27.3% | 0 |
| ADX > 20 | 32 | +32.4% | 31.3% | 7.9 | 48 | 22.3% | 0 |
| ADX > 25 | 23 | +62.9% | 39.1% | 8.3 | 86 | 17.3% | 0 |
| ADX > 30 | 16 | +14.5% | 37.5% | 8.0 | 129 | 11.6% | 0 |

### CDNS — 20/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +10.0% | 33.3% | 13.2 | 0 | 35.8% | 0 |
| ADX > 15 | 26 | +17.5% | 38.5% | 14.6 | 13 | 34.0% | 0 |
| ADX > 20 | 20 | -15.8% | 25.0% | 15.1 | 61 | 27.3% | 0 |
| ADX > 25 | 12 | -8.2% | 41.7% | 17.3 | 117 | 18.5% | 0 |
| ADX > 30 | 4 | -17.8% | 0.0% | 16.3 | 211 | 5.9% | 0 |

### CDW — 30/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 12 | -14.6% | 16.7% | 12.0 | 0 | 13.7% | 1 |
| ADX > 15 | 10 | -9.2% | 20.0% | 13.1 | 9 | 12.5% | 1 |
| ADX > 20 | 7 | -13.1% | 28.6% | 14.3 | 29 | 9.8% | 1 |
| ADX > 25 | 2 | +2.0% | 100.0% | 30.0 | 63 | 5.6% | 0 |
| ADX > 30 | 1 | +3.6% | 100.0% | 51.0 | 69 | 4.8% | 0 |

### CEG — 20/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +37.3% | 45.8% | 15.1 | 0 | 33.2% | 1 |
| ADX > 15 | 20 | +44.3% | 50.0% | 17.4 | 9 | 32.0% | 1 |
| ADX > 20 | 17 | +55.5% | 58.8% | 19.0 | 31 | 29.4% | 0 |
| ADX > 25 | 15 | +46.7% | 60.0% | 17.7 | 69 | 24.3% | 0 |
| ADX > 30 | 13 | +24.7% | 53.8% | 17.4 | 96 | 20.7% | 0 |

### CF — 8/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 38 | +46.0% | 42.1% | 8.4 | 0 | 29.1% | 1 |
| ADX > 15 | 37 | +41.3% | 40.5% | 8.3 | 7 | 28.2% | 1 |
| ADX > 20 | 28 | +35.1% | 35.7% | 8.6 | 56 | 21.9% | 0 |
| ADX > 25 | 19 | +35.3% | 36.8% | 8.4 | 111 | 14.5% | 0 |
| ADX > 30 | 9 | +44.4% | 55.6% | 10.3 | 156 | 8.5% | 0 |

### CFG — 28/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +51.2% | 53.8% | 21.3 | 0 | 50.7% | 0 |
| ADX > 15 | 21 | +33.1% | 52.4% | 23.8 | 41 | 45.2% | 0 |
| ADX > 20 | 16 | +24.1% | 50.0% | 27.6 | 80 | 40.0% | 0 |
| ADX > 25 | 13 | +0.3% | 46.2% | 23.7 | 157 | 27.8% | 0 |
| ADX > 30 | 10 | -1.0% | 50.0% | 24.0 | 201 | 21.9% | 0 |

### CHD — 18/74 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +0.6% | 34.8% | 13.2 | 0 | 27.5% | 0 |
| ADX > 15 | 12 | +4.7% | 50.0% | 17.8 | 59 | 19.7% | 0 |
| ADX > 20 | 7 | +10.2% | 71.4% | 22.9 | 96 | 14.8% | 0 |
| ADX > 25 | 5 | +6.9% | 60.0% | 22.4 | 129 | 10.4% | 0 |
| ADX > 30 | 4 | -4.4% | 25.0% | 17.5 | 159 | 6.4% | 0 |

### CHRW — 8/66 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +55.1% | 51.3% | 10.4 | 0 | 37.4% | 0 |
| ADX > 15 | 35 | +59.2% | 51.4% | 10.8 | 17 | 35.1% | 0 |
| ADX > 20 | 28 | +20.1% | 50.0% | 10.6 | 76 | 27.3% | 0 |
| ADX > 25 | 19 | +22.4% | 47.4% | 11.7 | 129 | 20.2% | 0 |
| ADX > 30 | 15 | +23.4% | 46.7% | 12.4 | 155 | 16.8% | 0 |

### CHTR — 26/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | -9.9% | 21.4% | 16.6 | 0 | 21.5% | 0 |
| ADX > 15 | 12 | -13.3% | 25.0% | 16.9 | 19 | 19.0% | 0 |
| ADX > 20 | 7 | -3.0% | 28.6% | 23.4 | 48 | 15.3% | 0 |
| ADX > 25 | 5 | -5.9% | 20.0% | 25.4 | 73 | 12.0% | 0 |
| ADX > 30 | 3 | -1.5% | 33.3% | 34.0 | 93 | 9.3% | 0 |

### CI — 26/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | -8.8% | 22.2% | 11.6 | 0 | 19.8% | 0 |
| ADX > 15 | 12 | -7.1% | 33.3% | 15.0 | 23 | 16.8% | 0 |
| ADX > 20 | 7 | +4.4% | 42.9% | 22.0 | 43 | 14.1% | 0 |
| ADX > 25 | 6 | +3.6% | 50.0% | 23.2 | 53 | 12.8% | 0 |
| ADX > 30 | 3 | +5.0% | 66.7% | 26.7 | 93 | 7.4% | 0 |

### CIEN — 28/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +401.5% | 47.8% | 26.2 | 0 | 54.8% | 0 |
| ADX > 15 | 22 | +353.0% | 50.0% | 26.8 | 6 | 53.7% | 0 |
| ADX > 20 | 15 | +280.0% | 60.0% | 33.5 | 47 | 46.1% | 0 |
| ADX > 25 | 13 | +15.1% | 30.8% | 30.8 | 117 | 36.6% | 0 |
| ADX > 30 | 9 | -8.3% | 44.4% | 31.0 | 199 | 25.7% | 0 |

### CINF — 30/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | -0.2% | 33.3% | 17.1 | 0 | 46.8% | 0 |
| ADX > 15 | 21 | -2.4% | 38.1% | 21.3 | 38 | 40.7% | 0 |
| ADX > 20 | 12 | -2.3% | 41.7% | 26.8 | 126 | 29.0% | 0 |
| ADX > 25 | 8 | -1.9% | 37.5% | 29.6 | 180 | 21.8% | 0 |
| ADX > 30 | 6 | -17.1% | 33.3% | 13.2 | 289 | 7.3% | 0 |

### CL — 16/80 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +20.8% | 47.8% | 15.3 | 0 | 32.0% | 0 |
| ADX > 15 | 16 | +32.5% | 62.5% | 20.3 | 16 | 29.7% | 0 |
| ADX > 20 | 13 | +21.5% | 53.8% | 19.9 | 60 | 23.8% | 0 |
| ADX > 25 | 10 | +14.9% | 50.0% | 18.5 | 110 | 17.2% | 0 |
| ADX > 30 | 7 | +7.7% | 28.6% | 18.7 | 146 | 12.4% | 0 |

### CLX — 18/76 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +23.6% | 38.9% | 12.0 | 0 | 19.4% | 0 |
| ADX > 15 | 15 | +16.3% | 33.3% | 13.5 | 9 | 18.2% | 0 |
| ADX > 20 | 9 | +16.9% | 44.4% | 18.0 | 34 | 14.9% | 0 |
| ADX > 25 | 6 | +15.4% | 50.0% | 16.7 | 75 | 9.4% | 0 |
| ADX > 30 | 5 | +12.8% | 40.0% | 16.4 | 89 | 7.6% | 0 |

### CMCSA — 24/86 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | -2.0% | 35.3% | 9.2 | 0 | 15.4% | 1 |
| ADX > 15 | 12 | -3.4% | 41.7% | 11.1 | 17 | 13.2% | 1 |
| ADX > 20 | 5 | -0.6% | 40.0% | 13.8 | 61 | 7.3% | 1 |
| ADX > 25 | 3 | -9.4% | 0.0% | 13.3 | 82 | 4.5% | 1 |
| ADX > 30 | 1 | -6.2% | 0.0% | 19.0 | 106 | 1.6% | 0 |

### CME — 10/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +13.1% | 40.5% | 9.1 | 0 | 36.8% | 1 |
| ADX > 15 | 37 | +10.6% | 40.5% | 9.5 | 18 | 34.4% | 1 |
| ADX > 20 | 31 | +2.7% | 38.7% | 8.8 | 73 | 26.9% | 1 |
| ADX > 25 | 18 | -8.5% | 27.8% | 7.3 | 164 | 13.7% | 1 |
| ADX > 30 | 11 | -4.6% | 27.3% | 7.5 | 209 | 7.7% | 0 |

### CMG — 10/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +9.6% | 48.7% | 9.4 | 0 | 33.5% | 1 |
| ADX > 15 | 33 | -13.4% | 45.5% | 9.5 | 36 | 28.6% | 1 |
| ADX > 20 | 25 | +4.8% | 52.0% | 10.0 | 82 | 22.5% | 1 |
| ADX > 25 | 16 | +26.4% | 62.5% | 12.3 | 118 | 18.0% | 0 |
| ADX > 30 | 13 | +35.5% | 69.2% | 12.9 | 138 | 15.3% | 0 |

### CMI — 24/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +89.9% | 40.9% | 24.6 | 0 | 48.9% | 0 |
| ADX > 15 | 20 | +92.3% | 45.0% | 26.0 | 15 | 46.9% | 0 |
| ADX > 20 | 15 | +86.5% | 60.0% | 30.1 | 59 | 41.1% | 0 |
| ADX > 25 | 13 | +34.5% | 61.5% | 27.5 | 113 | 33.0% | 0 |
| ADX > 30 | 11 | +29.7% | 63.6% | 29.1 | 142 | 29.1% | 0 |

### CMS — 10/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 38 | +13.0% | 42.1% | 9.7 | 0 | 34.8% | 0 |
| ADX > 15 | 34 | -2.3% | 35.3% | 9.5 | 33 | 30.5% | 0 |
| ADX > 20 | 24 | -0.8% | 33.3% | 9.3 | 98 | 21.7% | 0 |
| ADX > 25 | 14 | +1.3% | 35.7% | 10.4 | 157 | 13.7% | 0 |
| ADX > 30 | 9 | -6.1% | 22.2% | 11.1 | 189 | 9.4% | 0 |

### CNC — 10/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 40 | +61.7% | 50.0% | 9.2 | 0 | 33.5% | 1 |
| ADX > 15 | 32 | +36.6% | 50.0% | 9.6 | 40 | 28.5% | 0 |
| ADX > 20 | 19 | +49.7% | 57.9% | 10.3 | 116 | 18.4% | 0 |
| ADX > 25 | 14 | +29.7% | 71.4% | 11.4 | 142 | 14.9% | 0 |
| ADX > 30 | 13 | +15.7% | 76.9% | 11.3 | 152 | 13.6% | 0 |

### CNP — 12/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 40 | +25.2% | 40.0% | 10.4 | 0 | 38.7% | 0 |
| ADX > 15 | 29 | +15.4% | 44.8% | 11.2 | 62 | 30.5% | 0 |
| ADX > 20 | 23 | +4.7% | 43.5% | 10.2 | 128 | 21.7% | 0 |
| ADX > 25 | 14 | -6.7% | 28.6% | 7.4 | 219 | 9.6% | 0 |
| ADX > 30 | 6 | -4.6% | 0.0% | 7.0 | 262 | 3.9% | 0 |

### COF — 8/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 50 | +20.4% | 40.0% | 8.2 | 0 | 37.5% | 0 |
| ADX > 15 | 48 | +14.6% | 37.5% | 8.2 | 13 | 35.8% | 0 |
| ADX > 20 | 36 | -9.8% | 30.6% | 7.2 | 99 | 24.3% | 0 |
| ADX > 25 | 24 | -13.8% | 29.2% | 6.5 | 175 | 14.2% | 0 |
| ADX > 30 | 14 | -9.7% | 28.6% | 6.7 | 216 | 8.8% | 0 |

### COHR — 24/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +404.1% | 53.8% | 23.3 | 0 | 55.7% | 0 |
| ADX > 15 | 25 | +277.8% | 52.0% | 23.5 | 14 | 53.9% | 0 |
| ADX > 20 | 16 | +220.9% | 62.5% | 30.6 | 68 | 44.5% | 0 |
| ADX > 25 | 12 | +50.6% | 66.7% | 30.8 | 149 | 33.8% | 0 |
| ADX > 30 | 7 | +24.9% | 42.9% | 29.7 | 260 | 19.0% | 0 |

### COIN — 24/80 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +31.5% | 33.3% | 12.0 | 0 | 22.2% | 0 |
| ADX > 15 | 18 | +35.2% | 33.3% | 12.6 | 15 | 20.2% | 0 |
| ADX > 20 | 10 | +26.2% | 40.0% | 16.5 | 49 | 14.5% | 0 |
| ADX > 25 | 9 | +34.3% | 44.4% | 17.1 | 55 | 13.7% | 0 |
| ADX > 30 | 7 | -1.3% | 57.1% | 16.6 | 80 | 10.4% | 0 |

### COO — 30/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +11.3% | 35.0% | 20.9 | 0 | 38.3% | 0 |
| ADX > 15 | 17 | +16.2% | 41.2% | 23.3 | 8 | 36.2% | 0 |
| ADX > 20 | 11 | +27.6% | 36.4% | 29.8 | 48 | 29.4% | 0 |
| ADX > 25 | 7 | +38.1% | 57.1% | 37.4 | 76 | 23.4% | 0 |
| ADX > 30 | 4 | +37.1% | 100.0% | 63.5 | 82 | 22.6% | 0 |

### COP — 30/80 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | +22.2% | 14.3% | 14.5 | 0 | 19.8% | 1 |
| ADX > 15 | 9 | +17.3% | 22.2% | 18.9 | 23 | 16.8% | 1 |
| ADX > 20 | 3 | +34.1% | 66.7% | 49.3 | 38 | 14.8% | 1 |
| ADX > 25 | 2 | +35.6% | 100.0% | 71.0 | 44 | 14.0% | 1 |
| ADX > 30 | 2 | +26.3% | 50.0% | 64.0 | 63 | 11.7% | 0 |

### COR — 26/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +57.6% | 38.1% | 25.5 | 0 | 51.3% | 1 |
| ADX > 15 | 18 | +52.1% | 44.4% | 26.3 | 46 | 45.2% | 1 |
| ADX > 20 | 12 | +56.1% | 58.3% | 34.9 | 84 | 40.2% | 1 |
| ADX > 25 | 9 | +21.3% | 44.4% | 37.9 | 138 | 33.0% | 1 |
| ADX > 30 | 7 | +8.1% | 42.9% | 36.7 | 203 | 23.5% | 0 |

### COST — 8/68 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 40 | +29.9% | 42.5% | 9.2 | 0 | 33.6% | 0 |
| ADX > 15 | 38 | +18.2% | 39.5% | 8.9 | 18 | 31.3% | 0 |
| ADX > 20 | 30 | +22.1% | 40.0% | 9.5 | 55 | 26.1% | 0 |
| ADX > 25 | 23 | +20.9% | 43.5% | 9.8 | 97 | 20.5% | 0 |
| ADX > 30 | 17 | +13.5% | 58.8% | 11.1 | 127 | 16.5% | 0 |

### CPAY — 14/72 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 34 | +14.0% | 35.3% | 10.9 | 0 | 34.2% | 0 |
| ADX > 15 | 28 | +23.4% | 39.3% | 11.8 | 29 | 30.3% | 0 |
| ADX > 20 | 21 | +28.3% | 52.4% | 13.5 | 57 | 25.9% | 0 |
| ADX > 25 | 16 | +11.2% | 50.0% | 13.3 | 104 | 19.7% | 0 |
| ADX > 30 | 10 | +1.1% | 40.0% | 12.8 | 161 | 12.1% | 0 |

### CPB — 30/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 16 | -13.4% | 31.3% | 11.3 | 0 | 19.7% | 1 |
| ADX > 15 | 12 | -3.8% | 33.3% | 14.3 | 9 | 18.5% | 1 |
| ADX > 20 | 6 | -10.4% | 0.0% | 11.8 | 84 | 7.7% | 1 |
| ADX > 25 | 2 | -2.6% | 50.0% | 22.5 | 112 | 4.3% | 0 |
| ADX > 30 | 1 | -0.2% | 0.0% | 31.0 | 122 | 2.9% | 0 |

### CPRT — 8/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +19.4% | 53.1% | 8.2 | 0 | 23.9% | 0 |
| ADX > 15 | 25 | +16.9% | 56.0% | 8.5 | 34 | 19.4% | 0 |
| ADX > 20 | 15 | +20.9% | 60.0% | 10.0 | 80 | 13.3% | 0 |
| ADX > 25 | 9 | +7.8% | 33.3% | 10.1 | 119 | 8.1% | 0 |
| ADX > 30 | 6 | -4.2% | 33.3% | 10.0 | 139 | 5.5% | 0 |

### CPT — 24/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +4.6% | 46.7% | 14.3 | 0 | 37.9% | 0 |
| ADX > 15 | 21 | +8.5% | 57.1% | 17.7 | 35 | 33.0% | 0 |
| ADX > 20 | 12 | +10.9% | 58.3% | 19.7 | 125 | 20.9% | 0 |
| ADX > 25 | 7 | -0.3% | 28.6% | 20.0 | 176 | 12.2% | 0 |
| ADX > 30 | 3 | +7.0% | 66.7% | 31.7 | 203 | 8.6% | 0 |

### CRH — 30/64 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +59.7% | 55.6% | 23.9 | 0 | 39.6% | 0 |
| ADX > 15 | 18 | +51.9% | 50.0% | 23.6 | 4 | 39.1% | 0 |
| ADX > 20 | 12 | +12.8% | 33.3% | 25.7 | 70 | 28.2% | 0 |
| ADX > 25 | 4 | +20.2% | 25.0% | 49.5 | 143 | 18.0% | 0 |
| ADX > 30 | 4 | +21.7% | 25.0% | 48.0 | 147 | 17.4% | 0 |

### CRL — 12/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +123.0% | 60.9% | 13.7 | 0 | 28.9% | 0 |
| ADX > 15 | 22 | +127.8% | 63.6% | 14.3 | 1 | 28.7% | 0 |
| ADX > 20 | 21 | +108.6% | 61.9% | 14.0 | 13 | 26.7% | 0 |
| ADX > 25 | 16 | +20.6% | 50.0% | 12.9 | 75 | 18.5% | 0 |
| ADX > 30 | 14 | -3.8% | 21.4% | 11.0 | 108 | 14.1% | 0 |

### CRM — 14/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 13 | +5.9% | 46.2% | 13.8 | 0 | 18.1% | 1 |
| ADX > 15 | 12 | +2.2% | 41.7% | 14.4 | 5 | 17.4% | 1 |
| ADX > 20 | 10 | +4.2% | 40.0% | 14.7 | 25 | 14.8% | 1 |
| ADX > 25 | 9 | -3.1% | 33.3% | 13.6 | 47 | 11.8% | 1 |
| ADX > 30 | 5 | +4.8% | 40.0% | 18.4 | 72 | 8.5% | 1 |

### CRWD — 26/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +231.4% | 60.0% | 23.6 | 0 | 43.2% | 0 |
| ADX > 15 | 19 | +220.5% | 63.2% | 24.0 | 10 | 41.9% | 0 |
| ADX > 20 | 14 | +87.5% | 64.3% | 24.9 | 84 | 32.0% | 0 |
| ADX > 25 | 10 | +55.4% | 60.0% | 23.1 | 168 | 20.9% | 0 |
| ADX > 30 | 7 | +54.7% | 71.4% | 28.9 | 189 | 18.1% | 0 |

### CSCO — 30/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +72.8% | 48.0% | 20.0 | 0 | 44.9% | 0 |
| ADX > 15 | 23 | +47.5% | 39.1% | 19.9 | 27 | 41.2% | 0 |
| ADX > 20 | 19 | +44.3% | 42.1% | 21.3 | 57 | 36.4% | 0 |
| ADX > 25 | 10 | +32.6% | 50.0% | 32.0 | 112 | 29.1% | 0 |
| ADX > 30 | 6 | +13.1% | 33.3% | 38.7 | 173 | 21.0% | 0 |

### CSGP — 16/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | -9.4% | 28.6% | 12.4 | 0 | 24.1% | 0 |
| ADX > 15 | 19 | -8.3% | 26.3% | 12.3 | 15 | 21.3% | 0 |
| ADX > 20 | 11 | -5.6% | 18.2% | 12.6 | 71 | 12.5% | 0 |
| ADX > 25 | 9 | -10.1% | 11.1% | 10.8 | 101 | 8.5% | 0 |
| ADX > 30 | 3 | -0.9% | 33.3% | 11.3 | 143 | 2.9% | 0 |

### CSX — 16/96 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +29.0% | 32.3% | 13.5 | 0 | 37.9% | 0 |
| ADX > 15 | 28 | +36.1% | 35.7% | 14.5 | 8 | 36.8% | 0 |
| ADX > 20 | 22 | +20.2% | 31.8% | 15.8 | 41 | 31.6% | 0 |
| ADX > 25 | 14 | +16.8% | 35.7% | 19.1 | 94 | 24.6% | 0 |
| ADX > 30 | 9 | +7.4% | 33.3% | 20.1 | 154 | 16.6% | 0 |

### CTAS — 10/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 45 | +53.6% | 60.0% | 11.7 | 0 | 46.5% | 0 |
| ADX > 15 | 43 | +56.2% | 60.5% | 11.9 | 8 | 45.5% | 0 |
| ADX > 20 | 36 | +16.2% | 61.1% | 11.6 | 77 | 36.3% | 0 |
| ADX > 25 | 27 | +7.6% | 55.6% | 10.6 | 152 | 25.3% | 0 |
| ADX > 30 | 18 | +2.9% | 66.7% | 7.9 | 243 | 12.4% | 0 |

### CTSH — 10/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +34.7% | 36.7% | 10.9 | 0 | 31.0% | 1 |
| ADX > 15 | 27 | +45.9% | 40.7% | 11.7 | 8 | 29.9% | 1 |
| ADX > 20 | 24 | +37.7% | 41.7% | 12.0 | 28 | 27.3% | 1 |
| ADX > 25 | 19 | +25.5% | 36.8% | 12.1 | 67 | 22.1% | 1 |
| ADX > 30 | 12 | +10.4% | 41.7% | 12.7 | 122 | 14.8% | 1 |

### CTVA — 30/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 13 | +19.2% | 38.5% | 37.5 | 0 | 43.9% | 0 |
| ADX > 15 | 13 | +12.7% | 30.8% | 36.7 | 8 | 42.8% | 0 |
| ADX > 20 | 10 | +0.9% | 40.0% | 36.0 | 67 | 32.6% | 0 |
| ADX > 25 | 6 | +2.1% | 50.0% | 43.0 | 116 | 23.1% | 0 |
| ADX > 30 | 5 | +7.3% | 60.0% | 50.0 | 124 | 22.1% | 0 |

### CVNA — 10/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 36 | +129.6% | 33.3% | 11.9 | 0 | 39.9% | 0 |
| ADX > 15 | 30 | +154.9% | 40.0% | 13.0 | 28 | 36.3% | 0 |
| ADX > 20 | 24 | +108.3% | 41.7% | 13.9 | 70 | 30.7% | 0 |
| ADX > 25 | 20 | +73.3% | 45.0% | 13.8 | 102 | 25.8% | 0 |
| ADX > 30 | 15 | +14.3% | 33.3% | 11.8 | 173 | 16.4% | 0 |

### CVS — 22/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +28.5% | 52.4% | 19.5 | 0 | 36.7% | 0 |
| ADX > 15 | 16 | +41.9% | 56.3% | 22.6 | 28 | 32.6% | 0 |
| ADX > 20 | 12 | +31.3% | 66.7% | 28.0 | 47 | 30.1% | 0 |
| ADX > 25 | 10 | +29.9% | 70.0% | 29.7 | 66 | 26.7% | 0 |
| ADX > 30 | 6 | +32.5% | 83.3% | 42.8 | 95 | 22.9% | 0 |

### CVX — 20/62 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +14.6% | 36.4% | 15.6 | 0 | 33.6% | 1 |
| ADX > 15 | 22 | +7.8% | 36.4% | 15.1 | 9 | 32.4% | 1 |
| ADX > 20 | 18 | +7.5% | 38.9% | 16.2 | 39 | 28.5% | 1 |
| ADX > 25 | 11 | +9.6% | 36.4% | 17.9 | 108 | 19.3% | 1 |
| ADX > 30 | 7 | +9.3% | 28.6% | 18.6 | 163 | 12.2% | 0 |

### D — 26/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +20.2% | 36.0% | 19.0 | 0 | 43.9% | 0 |
| ADX > 15 | 16 | +3.5% | 37.5% | 23.6 | 57 | 35.0% | 0 |
| ADX > 20 | 12 | +3.7% | 41.7% | 26.5 | 98 | 29.5% | 0 |
| ADX > 25 | 8 | -11.9% | 25.0% | 24.6 | 183 | 18.2% | 0 |
| ADX > 30 | 6 | -4.2% | 33.3% | 22.2 | 227 | 12.4% | 0 |

### DAL — 8/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 45 | +129.0% | 44.4% | 9.3 | 0 | 38.2% | 0 |
| ADX > 15 | 43 | +108.2% | 39.5% | 9.1 | 18 | 35.8% | 0 |
| ADX > 20 | 35 | +43.2% | 31.4% | 8.7 | 79 | 27.7% | 0 |
| ADX > 25 | 30 | +20.0% | 23.3% | 8.5 | 112 | 23.3% | 0 |
| ADX > 30 | 17 | +47.2% | 35.3% | 9.8 | 171 | 15.3% | 0 |

### DASH — 10/62 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +140.6% | 45.7% | 12.5 | 0 | 40.2% | 0 |
| ADX > 15 | 31 | +115.8% | 48.4% | 12.8 | 29 | 36.3% | 0 |
| ADX > 20 | 26 | +80.5% | 50.0% | 12.6 | 76 | 30.1% | 0 |
| ADX > 25 | 18 | +23.1% | 44.4% | 11.2 | 160 | 18.5% | 0 |
| ADX > 30 | 14 | -12.1% | 35.7% | 7.7 | 222 | 10.2% | 0 |

### DD — 8/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 49 | +400.8% | 46.9% | 7.6 | 0 | 34.4% | 0 |
| ADX > 15 | 43 | +53.7% | 44.2% | 7.6 | 31 | 30.1% | 0 |
| ADX > 20 | 31 | +57.3% | 58.1% | 8.6 | 75 | 24.1% | 0 |
| ADX > 25 | 26 | +18.4% | 57.7% | 7.0 | 131 | 16.6% | 0 |
| ADX > 30 | 17 | +12.3% | 35.3% | 6.9 | 180 | 10.1% | 0 |

### DDOG — 14/56 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +92.6% | 40.7% | 12.4 | 0 | 30.2% | 0 |
| ADX > 15 | 25 | +88.6% | 40.0% | 13.2 | 4 | 29.7% | 0 |
| ADX > 20 | 21 | +53.6% | 42.9% | 14.2 | 26 | 26.7% | 0 |
| ADX > 25 | 13 | +10.2% | 53.8% | 15.6 | 89 | 18.4% | 0 |
| ADX > 30 | 12 | -2.2% | 58.3% | 14.7 | 109 | 15.7% | 0 |

### DE — 12/68 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +23.6% | 28.2% | 9.3 | 0 | 33.8% | 1 |
| ADX > 15 | 32 | +34.9% | 34.4% | 9.9 | 31 | 29.7% | 1 |
| ADX > 20 | 27 | +6.4% | 29.6% | 9.7 | 66 | 24.7% | 1 |
| ADX > 25 | 18 | +3.7% | 27.8% | 9.2 | 137 | 15.6% | 0 |
| ADX > 30 | 9 | +7.7% | 22.2% | 10.1 | 192 | 8.2% | 0 |

### DECK — 14/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +31.0% | 34.6% | 15.2 | 0 | 35.4% | 0 |
| ADX > 15 | 23 | +35.3% | 39.1% | 15.4 | 28 | 31.6% | 0 |
| ADX > 20 | 21 | +31.5% | 42.9% | 14.9 | 58 | 27.7% | 0 |
| ADX > 25 | 16 | +38.0% | 43.8% | 15.4 | 102 | 21.8% | 0 |
| ADX > 30 | 12 | +16.0% | 41.7% | 16.3 | 136 | 17.3% | 0 |

### DELL — 18/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +235.8% | 34.4% | 15.9 | 0 | 46.7% | 0 |
| ADX > 15 | 30 | +166.0% | 30.0% | 15.9 | 25 | 43.5% | 0 |
| ADX > 20 | 23 | +91.6% | 30.4% | 16.8 | 84 | 35.5% | 0 |
| ADX > 25 | 15 | +121.9% | 33.3% | 17.7 | 166 | 24.5% | 0 |
| ADX > 30 | 9 | +57.2% | 44.4% | 20.7 | 223 | 16.9% | 0 |

### DG — 10/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +37.1% | 31.4% | 9.0 | 0 | 29.7% | 1 |
| ADX > 15 | 35 | +15.2% | 28.6% | 8.5 | 8 | 28.6% | 1 |
| ADX > 20 | 30 | +12.6% | 33.3% | 8.3 | 52 | 23.0% | 0 |
| ADX > 25 | 27 | -16.3% | 25.9% | 7.6 | 83 | 18.9% | 0 |
| ADX > 30 | 19 | -1.8% | 26.3% | 8.2 | 120 | 14.0% | 0 |

### DGX — 24/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +14.8% | 46.2% | 18.5 | 0 | 44.3% | 0 |
| ADX > 15 | 24 | +13.1% | 45.8% | 19.0 | 13 | 41.8% | 0 |
| ADX > 20 | 19 | -5.8% | 42.1% | 18.2 | 80 | 31.8% | 0 |
| ADX > 25 | 15 | -10.5% | 40.0% | 18.7 | 126 | 25.7% | 0 |
| ADX > 30 | 11 | -12.8% | 36.4% | 18.3 | 182 | 18.2% | 0 |

### DHI — 8/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +25.5% | 40.6% | 9.6 | 0 | 27.9% | 0 |
| ADX > 15 | 24 | +38.6% | 45.8% | 10.8 | 32 | 23.7% | 0 |
| ADX > 20 | 21 | +24.0% | 47.6% | 10.6 | 56 | 20.5% | 0 |
| ADX > 25 | 18 | +22.2% | 44.4% | 10.4 | 80 | 17.3% | 0 |
| ADX > 30 | 11 | +29.3% | 63.6% | 13.5 | 108 | 13.6% | 0 |

### DHR — 22/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | -11.4% | 39.1% | 14.4 | 0 | 30.9% | 0 |
| ADX > 15 | 18 | -10.3% | 38.9% | 15.6 | 37 | 25.9% | 0 |
| ADX > 20 | 13 | -3.7% | 38.5% | 18.2 | 66 | 22.1% | 0 |
| ADX > 25 | 9 | -18.9% | 33.3% | 20.2 | 105 | 17.0% | 0 |
| ADX > 30 | 4 | +2.4% | 50.0% | 20.8 | 174 | 7.8% | 0 |

### DIS — 16/92 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +34.7% | 40.9% | 11.7 | 0 | 23.1% | 0 |
| ADX > 15 | 21 | +36.7% | 42.9% | 12.1 | 2 | 22.9% | 0 |
| ADX > 20 | 16 | +30.9% | 37.5% | 13.8 | 25 | 19.8% | 0 |
| ADX > 25 | 10 | +27.7% | 40.0% | 16.8 | 62 | 14.9% | 0 |
| ADX > 30 | 8 | +27.8% | 50.0% | 18.1 | 78 | 12.9% | 0 |

### DLR — 22/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +27.7% | 45.0% | 20.4 | 0 | 37.4% | 0 |
| ADX > 15 | 17 | +23.6% | 41.2% | 22.5 | 18 | 35.0% | 0 |
| ADX > 20 | 12 | +16.6% | 41.7% | 25.4 | 69 | 28.2% | 0 |
| ADX > 25 | 8 | +5.3% | 37.5% | 27.3 | 130 | 20.1% | 0 |
| ADX > 30 | 6 | +0.2% | 50.0% | 26.7 | 168 | 15.0% | 0 |

### DLTR — 22/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 13 | +107.8% | 46.2% | 33.1 | 0 | 39.4% | 1 |
| ADX > 15 | 12 | +109.9% | 50.0% | 35.1 | 7 | 38.4% | 1 |
| ADX > 20 | 10 | +88.0% | 60.0% | 38.6 | 31 | 35.2% | 1 |
| ADX > 25 | 9 | +57.3% | 66.7% | 39.7 | 54 | 32.4% | 0 |
| ADX > 30 | 7 | +42.6% | 85.7% | 37.9 | 116 | 24.2% | 0 |

### DOC — 16/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +16.0% | 37.5% | 11.5 | 0 | 33.6% | 0 |
| ADX > 15 | 24 | +18.4% | 45.8% | 13.5 | 23 | 30.3% | 0 |
| ADX > 20 | 17 | +10.3% | 41.2% | 14.5 | 78 | 23.0% | 0 |
| ADX > 25 | 14 | +7.3% | 50.0% | 14.0 | 115 | 18.1% | 0 |
| ADX > 30 | 12 | -2.3% | 33.3% | 12.1 | 151 | 13.3% | 0 |

### DOV — 26/86 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +21.8% | 42.1% | 21.1 | 0 | 36.7% | 0 |
| ADX > 15 | 18 | +11.7% | 38.9% | 21.1 | 13 | 35.0% | 0 |
| ADX > 20 | 13 | +28.0% | 53.8% | 25.0 | 48 | 29.9% | 0 |
| ADX > 25 | 7 | +21.0% | 57.1% | 31.0 | 123 | 19.7% | 0 |
| ADX > 30 | 5 | +12.9% | 60.0% | 35.0 | 155 | 15.4% | 0 |

### DOW — 28/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 9 | +39.8% | 33.3% | 21.7 | 0 | 17.8% | 0 |
| ADX > 15 | 7 | +28.9% | 42.9% | 24.7 | 15 | 15.8% | 0 |
| ADX > 20 | 4 | +31.8% | 75.0% | 37.0 | 32 | 13.6% | 0 |
| ADX > 25 | 3 | +6.7% | 66.7% | 36.7 | 60 | 9.8% | 0 |
| ADX > 30 | 3 | +6.8% | 66.7% | 29.0 | 76 | 7.7% | 0 |

### DPZ — 16/52 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +7.5% | 42.9% | 10.8 | 0 | 27.4% | 0 |
| ADX > 15 | 24 | +10.3% | 45.8% | 11.9 | 12 | 25.8% | 0 |
| ADX > 20 | 22 | +1.5% | 36.4% | 11.1 | 42 | 21.8% | 0 |
| ADX > 25 | 13 | -11.8% | 38.5% | 12.9 | 94 | 14.9% | 0 |
| ADX > 30 | 6 | +1.5% | 50.0% | 16.3 | 139 | 8.9% | 0 |

### DRI — 8/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 48 | +22.2% | 39.6% | 7.6 | 0 | 33.4% | 0 |
| ADX > 15 | 41 | +16.7% | 39.0% | 7.7 | 37 | 28.5% | 0 |
| ADX > 20 | 31 | +17.4% | 41.9% | 7.4 | 95 | 20.7% | 0 |
| ADX > 25 | 18 | +16.9% | 38.9% | 7.9 | 155 | 12.8% | 0 |
| ADX > 30 | 11 | +11.6% | 45.5% | 7.8 | 194 | 7.7% | 0 |

### DTE — 24/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +9.0% | 42.9% | 19.4 | 0 | 37.9% | 0 |
| ADX > 15 | 16 | +7.8% | 37.5% | 23.1 | 26 | 34.4% | 0 |
| ADX > 20 | 10 | +7.7% | 40.0% | 30.4 | 70 | 28.3% | 0 |
| ADX > 25 | 6 | +17.6% | 66.7% | 40.3 | 114 | 22.5% | 0 |
| ADX > 30 | 4 | -0.3% | 50.0% | 37.0 | 171 | 13.7% | 0 |

### DUK — 8/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +19.8% | 45.2% | 8.8 | 0 | 35.1% | 0 |
| ADX > 15 | 34 | +10.5% | 47.1% | 8.8 | 50 | 28.5% | 0 |
| ADX > 20 | 29 | -0.2% | 41.4% | 8.3 | 92 | 22.9% | 0 |
| ADX > 25 | 22 | -3.8% | 27.3% | 7.6 | 140 | 16.5% | 0 |
| ADX > 30 | 14 | -1.9% | 28.6% | 6.2 | 198 | 8.8% | 0 |

### DVA — 16/56 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +81.7% | 39.3% | 13.5 | 0 | 35.4% | 0 |
| ADX > 15 | 25 | +76.3% | 36.0% | 14.8 | 8 | 34.3% | 0 |
| ADX > 20 | 20 | +53.8% | 45.0% | 16.4 | 30 | 30.2% | 0 |
| ADX > 25 | 16 | +58.2% | 43.8% | 18.3 | 56 | 26.7% | 0 |
| ADX > 30 | 15 | +42.4% | 33.3% | 16.0 | 94 | 21.7% | 0 |

### DVN — 10/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +10.0% | 30.4% | 11.2 | 0 | 23.9% | 1 |
| ADX > 15 | 22 | -3.2% | 27.3% | 10.2 | 25 | 20.5% | 1 |
| ADX > 20 | 18 | +19.5% | 33.3% | 10.5 | 52 | 17.2% | 0 |
| ADX > 25 | 10 | +34.1% | 50.0% | 13.0 | 95 | 11.4% | 0 |
| ADX > 30 | 8 | +24.0% | 50.0% | 13.9 | 106 | 10.0% | 0 |

### DXCM — 10/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 37 | +30.9% | 45.9% | 9.5 | 0 | 32.4% | 0 |
| ADX > 15 | 37 | +23.0% | 43.2% | 9.3 | 5 | 31.8% | 0 |
| ADX > 20 | 29 | +12.9% | 44.8% | 9.1 | 59 | 24.6% | 0 |
| ADX > 25 | 19 | -3.9% | 36.8% | 8.7 | 128 | 15.3% | 0 |
| ADX > 30 | 14 | -4.4% | 35.7% | 7.0 | 170 | 9.2% | 0 |

### EA — 18/32 SMA, 735 bars, 2023-09-05 → 2026-08-10

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +13.1% | 54.3% | 13.9 | 0 | 50.1% | 1 |
| ADX > 15 | 35 | +7.2% | 54.3% | 13.5 | 10 | 48.7% | 1 |
| ADX > 20 | 28 | -9.1% | 57.1% | 13.7 | 52 | 40.3% | 1 |
| ADX > 25 | 22 | -13.6% | 54.5% | 12.0 | 134 | 29.1% | 1 |
| ADX > 30 | 15 | -14.9% | 46.7% | 12.5 | 191 | 21.4% | 1 |

### EBAY — 22/52 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +41.0% | 35.7% | 16.7 | 0 | 42.6% | 0 |
| ADX > 15 | 25 | +44.7% | 36.0% | 17.0 | 25 | 39.2% | 0 |
| ADX > 20 | 18 | +47.3% | 44.4% | 18.9 | 84 | 31.4% | 0 |
| ADX > 25 | 13 | +37.2% | 46.2% | 21.3 | 126 | 25.8% | 0 |
| ADX > 30 | 10 | +22.5% | 50.0% | 22.6 | 165 | 20.6% | 0 |

### ECL — 14/56 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +31.3% | 45.2% | 14.2 | 0 | 40.6% | 0 |
| ADX > 15 | 27 | +36.2% | 48.1% | 15.5 | 18 | 38.2% | 0 |
| ADX > 20 | 26 | +21.9% | 34.6% | 12.8 | 75 | 30.6% | 0 |
| ADX > 25 | 15 | +17.9% | 46.7% | 15.1 | 152 | 20.3% | 0 |
| ADX > 30 | 10 | -2.4% | 20.0% | 15.7 | 201 | 13.8% | 0 |

### ED — 26/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +15.3% | 27.3% | 19.9 | 0 | 40.0% | 0 |
| ADX > 15 | 19 | +6.9% | 26.3% | 19.9 | 40 | 34.7% | 0 |
| ADX > 20 | 13 | +3.6% | 30.8% | 22.3 | 90 | 26.7% | 0 |
| ADX > 25 | 8 | +14.0% | 50.0% | 29.5 | 125 | 21.8% | 0 |
| ADX > 30 | 6 | +15.1% | 50.0% | 32.7 | 152 | 18.2% | 0 |

### EFX — 30/68 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | -6.8% | 21.4% | 15.6 | 0 | 22.6% | 1 |
| ADX > 15 | 12 | +0.2% | 25.0% | 17.8 | 19 | 20.1% | 1 |
| ADX > 20 | 9 | +5.8% | 33.3% | 22.1 | 33 | 18.2% | 1 |
| ADX > 25 | 6 | +8.4% | 33.3% | 28.7 | 55 | 15.6% | 0 |
| ADX > 30 | 4 | +8.8% | 50.0% | 38.0 | 67 | 14.0% | 0 |

### EG — 28/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 15 | -8.0% | 33.3% | 14.8 | 0 | 22.1% | 1 |
| ADX > 15 | 12 | -10.0% | 33.3% | 16.1 | 15 | 18.6% | 0 |
| ADX > 20 | 4 | -3.1% | 50.0% | 24.0 | 72 | 9.4% | 0 |
| ADX > 25 | 3 | +2.8% | 66.7% | 27.7 | 83 | 8.0% | 0 |
| ADX > 30 | 1 | +1.3% | 100.0% | 21.0 | 115 | 2.0% | 0 |

### EIX — 30/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +11.4% | 52.4% | 23.7 | 0 | 44.8% | 0 |
| ADX > 15 | 15 | +4.9% | 46.7% | 27.8 | 52 | 37.8% | 0 |
| ADX > 20 | 10 | +1.4% | 30.0% | 28.1 | 141 | 25.1% | 0 |
| ADX > 25 | 7 | -10.0% | 28.6% | 27.0 | 198 | 16.9% | 0 |
| ADX > 30 | 6 | -10.4% | 16.7% | 23.8 | 227 | 13.0% | 0 |

### EL — 8/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +2.6% | 45.2% | 8.1 | 0 | 22.6% | 0 |
| ADX > 15 | 24 | -3.5% | 41.7% | 7.6 | 46 | 16.5% | 0 |
| ADX > 20 | 18 | -2.5% | 38.9% | 7.1 | 83 | 11.6% | 0 |
| ADX > 25 | 14 | +2.8% | 35.7% | 7.4 | 101 | 9.2% | 0 |
| ADX > 30 | 11 | -4.6% | 36.4% | 6.5 | 121 | 6.5% | 0 |

### ELV — 20/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +10.6% | 33.3% | 14.3 | 0 | 38.7% | 1 |
| ADX > 15 | 21 | +7.9% | 28.6% | 16.1 | 49 | 30.5% | 0 |
| ADX > 20 | 15 | -3.6% | 20.0% | 15.5 | 115 | 21.3% | 0 |
| ADX > 25 | 11 | -6.7% | 18.2% | 17.1 | 146 | 17.2% | 0 |
| ADX > 30 | 6 | +3.5% | 33.3% | 14.7 | 213 | 8.0% | 0 |

### EME — 30/52 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 16 | +221.0% | 68.8% | 32.7 | 0 | 47.7% | 0 |
| ADX > 15 | 16 | +198.1% | 62.5% | 31.4 | 14 | 45.9% | 0 |
| ADX > 20 | 14 | +162.6% | 71.4% | 32.1 | 52 | 40.8% | 0 |
| ADX > 25 | 10 | +63.9% | 50.0% | 32.1 | 124 | 29.4% | 0 |
| ADX > 30 | 7 | +55.2% | 57.1% | 37.7 | 162 | 24.3% | 0 |

### EMR — 14/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +31.0% | 40.7% | 12.8 | 0 | 31.3% | 0 |
| ADX > 15 | 22 | +15.2% | 50.0% | 14.4 | 17 | 29.0% | 0 |
| ADX > 20 | 16 | +28.8% | 56.3% | 17.2 | 47 | 25.0% | 0 |
| ADX > 25 | 11 | +25.7% | 54.5% | 22.5 | 69 | 22.1% | 0 |
| ADX > 30 | 8 | +24.5% | 75.0% | 22.6 | 115 | 16.0% | 0 |

### EOG — 10/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +12.4% | 30.8% | 10.9 | 0 | 25.8% | 1 |
| ADX > 15 | 21 | +8.4% | 33.3% | 11.0 | 36 | 20.6% | 0 |
| ADX > 20 | 15 | +11.7% | 26.7% | 11.0 | 80 | 14.8% | 0 |
| ADX > 25 | 10 | +3.9% | 30.0% | 11.2 | 116 | 10.0% | 0 |
| ADX > 30 | 7 | +10.6% | 28.6% | 11.9 | 134 | 7.6% | 0 |

### EPAM — 18/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +22.8% | 54.5% | 13.1 | 0 | 27.7% | 1 |
| ADX > 15 | 21 | +24.5% | 57.1% | 13.7 | 2 | 27.4% | 1 |
| ADX > 20 | 20 | +16.3% | 55.0% | 14.1 | 14 | 25.8% | 1 |
| ADX > 25 | 17 | -20.0% | 47.1% | 12.1 | 72 | 18.4% | 0 |
| ADX > 30 | 12 | -18.0% | 50.0% | 10.9 | 124 | 11.4% | 0 |

### EQIX — 26/50 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +30.1% | 45.5% | 20.5 | 0 | 41.4% | 0 |
| ADX > 15 | 20 | +25.1% | 45.0% | 21.2 | 19 | 38.8% | 0 |
| ADX > 20 | 12 | +24.5% | 58.3% | 26.8 | 91 | 29.3% | 0 |
| ADX > 25 | 5 | +15.2% | 60.0% | 46.2 | 149 | 21.4% | 0 |
| ADX > 30 | 5 | -1.3% | 20.0% | 31.8 | 198 | 14.9% | 0 |

### EQR — 16/94 SMA, 750 bars, 2023-09-05 → 2026-08-31

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +3.5% | 50.0% | 11.7 | 0 | 27.7% | 0 |
| ADX > 15 | 20 | -5.8% | 50.0% | 11.8 | 43 | 22.0% | 0 |
| ADX > 20 | 14 | -5.1% | 42.9% | 11.4 | 87 | 15.3% | 0 |
| ADX > 25 | 4 | +1.3% | 50.0% | 17.8 | 153 | 6.5% | 0 |
| ADX > 30 | 3 | +1.1% | 66.7% | 16.0 | 170 | 4.3% | 0 |

### EQT — 26/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | +44.5% | 41.2% | 22.4 | 0 | 36.4% | 1 |
| ADX > 15 | 17 | +33.4% | 35.3% | 22.1 | 4 | 35.9% | 1 |
| ADX > 20 | 17 | +11.8% | 29.4% | 20.4 | 25 | 33.1% | 1 |
| ADX > 25 | 12 | -1.1% | 33.3% | 20.8 | 105 | 22.7% | 0 |
| ADX > 30 | 5 | -12.1% | 20.0% | 21.0 | 194 | 9.6% | 0 |

### ERIE — 8/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +43.6% | 41.4% | 8.2 | 0 | 21.8% | 0 |
| ADX > 15 | 26 | +40.3% | 42.3% | 8.5 | 13 | 20.1% | 0 |
| ADX > 20 | 21 | +48.1% | 47.6% | 9.5 | 26 | 18.4% | 0 |
| ADX > 25 | 17 | +34.2% | 47.1% | 9.3 | 58 | 14.1% | 0 |
| ADX > 30 | 12 | +25.9% | 50.0% | 9.8 | 85 | 10.5% | 0 |

### ES — 24/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | -3.7% | 43.5% | 18.0 | 0 | 38.0% | 0 |
| ADX > 15 | 16 | -17.2% | 31.3% | 21.8 | 41 | 32.6% | 0 |
| ADX > 20 | 12 | -17.2% | 25.0% | 23.2 | 81 | 25.9% | 0 |
| ADX > 25 | 9 | -20.1% | 33.3% | 20.0 | 150 | 16.8% | 0 |
| ADX > 30 | 4 | -1.0% | 25.0% | 26.0 | 201 | 10.0% | 0 |

### ESS — 24/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +11.2% | 38.7% | 14.8 | 0 | 42.2% | 0 |
| ADX > 15 | 21 | +21.2% | 57.1% | 18.2 | 43 | 35.4% | 0 |
| ADX > 20 | 13 | +6.9% | 46.2% | 18.8 | 134 | 22.5% | 0 |
| ADX > 25 | 9 | -11.8% | 22.2% | 19.2 | 185 | 15.7% | 0 |
| ADX > 30 | 6 | -10.8% | 16.7% | 17.5 | 229 | 9.3% | 0 |

### ETN — 12/96 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +2.8% | 35.7% | 10.5 | 0 | 40.6% | 0 |
| ADX > 15 | 33 | +9.7% | 36.4% | 11.7 | 36 | 35.8% | 0 |
| ADX > 20 | 20 | +9.4% | 35.0% | 14.8 | 101 | 27.1% | 0 |
| ADX > 25 | 12 | -4.3% | 33.3% | 14.1 | 189 | 15.4% | 0 |
| ADX > 30 | 5 | -9.0% | 20.0% | 22.4 | 228 | 10.2% | 0 |

### ETR — 28/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +18.7% | 34.6% | 20.7 | 0 | 49.3% | 0 |
| ADX > 15 | 24 | +28.1% | 37.5% | 21.8 | 9 | 48.1% | 0 |
| ADX > 20 | 19 | +1.7% | 26.3% | 20.5 | 81 | 36.0% | 0 |
| ADX > 25 | 8 | +12.6% | 25.0% | 38.9 | 125 | 29.1% | 0 |
| ADX > 30 | 6 | +14.2% | 50.0% | 39.5 | 177 | 22.2% | 0 |

### EVRG — 14/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 40 | +17.1% | 35.0% | 11.8 | 0 | 43.4% | 0 |
| ADX > 15 | 30 | +9.0% | 26.7% | 11.6 | 86 | 31.9% | 0 |
| ADX > 20 | 20 | +5.3% | 30.0% | 12.8 | 146 | 23.7% | 0 |
| ADX > 25 | 12 | +7.5% | 41.7% | 15.1 | 195 | 17.2% | 0 |
| ADX > 30 | 7 | +7.4% | 57.1% | 17.3 | 238 | 11.2% | 0 |

### EW — 26/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +30.4% | 48.4% | 13.6 | 0 | 40.7% | 1 |
| ADX > 15 | 20 | -13.2% | 30.0% | 16.8 | 47 | 33.5% | 1 |
| ADX > 20 | 13 | +2.5% | 46.2% | 20.1 | 93 | 24.3% | 1 |
| ADX > 25 | 7 | +3.8% | 42.9% | 21.0 | 173 | 13.2% | 0 |
| ADX > 30 | 3 | +5.2% | 66.7% | 28.0 | 215 | 7.6% | 0 |

### EXC — 16/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +28.2% | 48.3% | 14.4 | 0 | 38.6% | 0 |
| ADX > 15 | 23 | +27.5% | 52.2% | 16.8 | 24 | 35.4% | 0 |
| ADX > 20 | 16 | +15.0% | 56.3% | 18.8 | 83 | 27.3% | 0 |
| ADX > 25 | 13 | +21.1% | 53.8% | 18.4 | 117 | 21.8% | 0 |
| ADX > 30 | 9 | +15.2% | 66.7% | 16.8 | 178 | 13.7% | 0 |

### EXE — 18/88 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +13.3% | 26.1% | 12.4 | 0 | 27.3% | 1 |
| ADX > 15 | 21 | +16.1% | 28.6% | 13.3 | 10 | 26.1% | 0 |
| ADX > 20 | 18 | -21.5% | 22.2% | 10.7 | 72 | 18.0% | 0 |
| ADX > 25 | 9 | -14.0% | 33.3% | 16.0 | 109 | 12.9% | 0 |
| ADX > 30 | 5 | -4.1% | 40.0% | 17.2 | 147 | 7.8% | 0 |

### EXPD — 12/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +15.2% | 57.1% | 12.8 | 0 | 41.2% | 0 |
| ADX > 15 | 26 | +5.5% | 46.2% | 13.7 | 63 | 32.6% | 0 |
| ADX > 20 | 17 | -6.0% | 47.1% | 12.3 | 165 | 19.0% | 0 |
| ADX > 25 | 11 | +5.5% | 54.5% | 12.0 | 219 | 11.8% | 0 |
| ADX > 30 | 9 | +6.1% | 55.6% | 10.4 | 245 | 8.4% | 0 |

### EXPE — 14/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +85.4% | 50.0% | 15.1 | 0 | 44.4% | 0 |
| ADX > 15 | 30 | +49.7% | 43.3% | 14.9 | 25 | 40.8% | 0 |
| ADX > 20 | 27 | +14.5% | 40.7% | 14.7 | 57 | 36.6% | 0 |
| ADX > 25 | 22 | +20.2% | 40.9% | 15.3 | 100 | 30.9% | 0 |
| ADX > 30 | 18 | +4.5% | 33.3% | 14.4 | 154 | 23.7% | 0 |

### EXR — 8/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 45 | +4.5% | 31.1% | 7.7 | 0 | 31.3% | 0 |
| ADX > 15 | 37 | +10.1% | 32.4% | 8.6 | 22 | 28.3% | 0 |
| ADX > 20 | 22 | +21.1% | 45.5% | 9.3 | 93 | 18.9% | 0 |
| ADX > 25 | 12 | +11.3% | 16.7% | 8.3 | 164 | 9.4% | 0 |
| ADX > 30 | 6 | +12.9% | 16.7% | 10.0 | 197 | 5.1% | 0 |

### F — 8/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 47 | +13.3% | 29.8% | 7.1 | 0 | 31.1% | 0 |
| ADX > 15 | 39 | +14.2% | 25.6% | 7.5 | 31 | 27.0% | 0 |
| ADX > 20 | 21 | -13.6% | 28.6% | 7.7 | 119 | 14.8% | 0 |
| ADX > 25 | 9 | -9.8% | 22.2% | 6.6 | 189 | 5.5% | 0 |
| ADX > 30 | 4 | -8.7% | 25.0% | 5.8 | 215 | 2.0% | 0 |

### FANG — 12/68 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +12.5% | 42.3% | 11.6 | 0 | 27.8% | 0 |
| ADX > 15 | 20 | +21.7% | 45.0% | 12.7 | 35 | 23.1% | 0 |
| ADX > 20 | 15 | +11.3% | 40.0% | 13.5 | 71 | 18.4% | 0 |
| ADX > 25 | 10 | +19.8% | 40.0% | 14.2 | 111 | 13.0% | 0 |
| ADX > 30 | 8 | +4.7% | 25.0% | 13.0 | 139 | 9.3% | 0 |

### FAST — 10/72 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 41 | +47.5% | 39.0% | 10.0 | 0 | 37.2% | 0 |
| ADX > 15 | 29 | +42.0% | 37.9% | 11.2 | 63 | 28.9% | 0 |
| ADX > 20 | 21 | +10.7% | 38.1% | 10.9 | 125 | 20.6% | 0 |
| ADX > 25 | 15 | +17.5% | 40.0% | 12.7 | 154 | 16.8% | 0 |
| ADX > 30 | 10 | +15.6% | 60.0% | 14.9 | 181 | 13.2% | 0 |

### FCX — 16/86 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +28.0% | 44.8% | 11.9 | 0 | 31.8% | 0 |
| ADX > 15 | 24 | +0.3% | 41.7% | 12.8 | 26 | 28.3% | 0 |
| ADX > 20 | 19 | +1.1% | 36.8% | 12.5 | 73 | 22.1% | 0 |
| ADX > 25 | 13 | +8.1% | 46.2% | 12.6 | 123 | 15.6% | 0 |
| ADX > 30 | 9 | +7.8% | 33.3% | 11.9 | 157 | 10.5% | 0 |

### FDS — 10/86 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +17.8% | 42.1% | 10.9 | 0 | 20.5% | 1 |
| ADX > 15 | 18 | +3.1% | 33.3% | 10.7 | 10 | 19.1% | 1 |
| ADX > 20 | 15 | -10.1% | 26.7% | 8.1 | 60 | 12.5% | 1 |
| ADX > 25 | 6 | +5.8% | 66.7% | 8.0 | 113 | 5.5% | 1 |
| ADX > 30 | 6 | -0.7% | 50.0% | 6.5 | 128 | 3.7% | 0 |

### FDX — 12/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +36.9% | 43.5% | 15.5 | 0 | 32.0% | 0 |
| ADX > 15 | 23 | +22.8% | 34.8% | 14.3 | 17 | 29.8% | 0 |
| ADX > 20 | 18 | +13.2% | 27.8% | 14.6 | 62 | 23.8% | 0 |
| ADX > 25 | 11 | +6.7% | 36.4% | 16.4 | 119 | 16.2% | 0 |
| ADX > 30 | 6 | +0.5% | 50.0% | 20.2 | 158 | 11.0% | 0 |

### FE — 22/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +17.5% | 45.0% | 21.4 | 0 | 39.5% | 0 |
| ADX > 15 | 16 | +17.9% | 37.5% | 22.5 | 39 | 33.5% | 0 |
| ADX > 20 | 12 | +0.4% | 33.3% | 19.8 | 112 | 22.5% | 0 |
| ADX > 25 | 11 | -5.9% | 36.4% | 19.1 | 133 | 19.7% | 0 |
| ADX > 30 | 8 | +1.7% | 25.0% | 19.4 | 168 | 14.6% | 0 |

### FFIV — 30/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +68.1% | 51.9% | 24.8 | 0 | 60.9% | 0 |
| ADX > 15 | 25 | +53.3% | 48.0% | 25.0 | 32 | 56.6% | 0 |
| ADX > 20 | 19 | +10.1% | 47.4% | 27.0 | 104 | 47.1% | 0 |
| ADX > 25 | 10 | +19.3% | 70.0% | 35.7 | 215 | 32.3% | 0 |
| ADX > 30 | 8 | -5.9% | 50.0% | 31.9 | 284 | 23.1% | 0 |

### FICO — 8/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 47 | +26.5% | 31.9% | 8.2 | 0 | 34.7% | 0 |
| ADX > 15 | 44 | +14.7% | 29.5% | 8.0 | 20 | 31.8% | 0 |
| ADX > 20 | 28 | +14.5% | 35.7% | 9.3 | 87 | 22.9% | 0 |
| ADX > 25 | 23 | +10.1% | 30.4% | 9.1 | 118 | 18.8% | 0 |
| ADX > 30 | 19 | +3.0% | 31.6% | 9.2 | 144 | 15.3% | 0 |

### FIS — 8/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 38 | +15.3% | 34.2% | 6.9 | 0 | 24.6% | 0 |
| ADX > 15 | 29 | +20.2% | 41.4% | 6.3 | 57 | 17.0% | 0 |
| ADX > 20 | 23 | +21.1% | 39.1% | 5.7 | 88 | 12.9% | 0 |
| ADX > 25 | 15 | -7.3% | 26.7% | 5.9 | 123 | 8.2% | 0 |
| ADX > 30 | 11 | -9.1% | 18.2% | 4.7 | 146 | 5.2% | 0 |

### FISV — 24/64 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | +21.8% | 28.6% | 22.0 | 0 | 28.5% | 0 |
| ADX > 15 | 13 | +23.5% | 30.8% | 23.6 | 1 | 28.3% | 0 |
| ADX > 20 | 8 | +24.3% | 50.0% | 33.4 | 25 | 24.3% | 0 |
| ADX > 25 | 7 | +30.3% | 57.1% | 36.0 | 34 | 23.1% | 0 |
| ADX > 30 | 6 | +29.5% | 66.7% | 39.3 | 44 | 21.8% | 0 |

### FITB — 26/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +55.1% | 37.5% | 21.5 | 0 | 47.3% | 0 |
| ADX > 15 | 20 | +54.2% | 45.0% | 24.6 | 13 | 44.8% | 0 |
| ADX > 20 | 18 | +32.7% | 38.9% | 24.6 | 39 | 40.2% | 0 |
| ADX > 25 | 12 | +13.9% | 25.0% | 26.3 | 123 | 28.1% | 0 |
| ADX > 30 | 9 | +1.4% | 33.3% | 25.1 | 183 | 20.1% | 0 |

### FIX — 16/84 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +189.3% | 46.9% | 18.0 | 0 | 52.0% | 0 |
| ADX > 15 | 28 | +161.3% | 50.0% | 18.6 | 37 | 46.9% | 0 |
| ADX > 20 | 22 | +57.1% | 45.5% | 19.8 | 91 | 39.8% | 0 |
| ADX > 25 | 14 | +33.7% | 42.9% | 25.7 | 142 | 32.7% | 0 |
| ADX > 30 | 10 | +24.8% | 40.0% | 27.4 | 197 | 25.4% | 0 |

### FOX — 8/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 52 | +33.0% | 40.4% | 9.5 | 0 | 45.6% | 0 |
| ADX > 15 | 44 | +40.6% | 40.9% | 10.2 | 31 | 41.5% | 0 |
| ADX > 20 | 38 | +20.0% | 47.4% | 9.9 | 83 | 34.6% | 0 |
| ADX > 25 | 27 | +17.5% | 44.4% | 9.4 | 165 | 23.4% | 0 |
| ADX > 30 | 21 | +2.1% | 42.9% | 9.0 | 212 | 17.2% | 0 |

### FOXA — 10/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 40 | +47.7% | 50.0% | 12.7 | 0 | 45.9% | 0 |
| ADX > 15 | 39 | +46.5% | 48.7% | 12.4 | 15 | 43.9% | 0 |
| ADX > 20 | 33 | +11.3% | 45.5% | 11.7 | 83 | 34.8% | 0 |
| ADX > 25 | 26 | -21.6% | 26.9% | 9.7 | 176 | 22.5% | 0 |
| ADX > 30 | 14 | -2.0% | 35.7% | 11.3 | 241 | 13.4% | 0 |

### FRT — 30/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +14.7% | 30.8% | 17.1 | 0 | 41.1% | 0 |
| ADX > 15 | 21 | +17.9% | 38.1% | 20.2 | 17 | 38.8% | 0 |
| ADX > 20 | 14 | +10.6% | 35.7% | 26.8 | 51 | 34.0% | 0 |
| ADX > 25 | 8 | +9.7% | 37.5% | 28.3 | 127 | 20.2% | 0 |
| ADX > 30 | 4 | -4.1% | 50.0% | 36.5 | 174 | 13.4% | 0 |

### FSLR — 22/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +38.9% | 47.8% | 17.4 | 0 | 36.2% | 0 |
| ADX > 15 | 19 | -6.0% | 42.1% | 18.4 | 24 | 31.9% | 0 |
| ADX > 20 | 15 | -8.6% | 33.3% | 18.7 | 70 | 25.8% | 0 |
| ADX > 25 | 9 | +40.3% | 44.4% | 23.1 | 121 | 19.0% | 0 |
| ADX > 30 | 6 | +27.5% | 16.7% | 15.8 | 199 | 8.6% | 0 |

### FTNT — 12/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 34 | +121.5% | 44.1% | 11.4 | 0 | 35.6% | 0 |
| ADX > 15 | 26 | +70.1% | 46.2% | 12.4 | 42 | 29.7% | 0 |
| ADX > 20 | 21 | +83.8% | 52.4% | 14.0 | 65 | 26.6% | 0 |
| ADX > 25 | 16 | +64.5% | 56.3% | 15.1 | 99 | 22.1% | 0 |
| ADX > 30 | 13 | +50.1% | 53.8% | 15.4 | 126 | 18.5% | 0 |

### FTV — 8/72 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 45 | -4.0% | 35.6% | 7.3 | 0 | 29.1% | 0 |
| ADX > 15 | 36 | +4.4% | 36.1% | 8.0 | 23 | 25.7% | 0 |
| ADX > 20 | 27 | -10.1% | 22.2% | 7.1 | 86 | 17.3% | 0 |
| ADX > 25 | 17 | -5.3% | 29.4% | 8.0 | 124 | 12.2% | 0 |
| ADX > 30 | 14 | -2.5% | 28.6% | 8.4 | 140 | 10.1% | 0 |

### GD — 30/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +1.7% | 20.7% | 20.3 | 0 | 54.3% | 0 |
| ADX > 15 | 20 | -7.5% | 35.0% | 23.9 | 67 | 44.5% | 0 |
| ADX > 20 | 12 | +5.8% | 50.0% | 33.9 | 119 | 37.6% | 0 |
| ADX > 25 | 7 | +15.1% | 57.1% | 44.3 | 179 | 29.0% | 0 |
| ADX > 30 | 5 | -5.2% | 20.0% | 30.0 | 292 | 14.0% | 0 |

### GDDY — 8/96 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +27.6% | 48.4% | 9.5 | 0 | 27.5% | 1 |
| ADX > 15 | 28 | +16.5% | 46.4% | 9.6 | 23 | 24.7% | 0 |
| ADX > 20 | 22 | +20.3% | 50.0% | 9.8 | 57 | 20.2% | 0 |
| ADX > 25 | 20 | +8.6% | 40.0% | 9.2 | 80 | 17.2% | 0 |
| ADX > 30 | 16 | -5.1% | 25.0% | 6.8 | 133 | 10.1% | 0 |

### GE — 16/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +78.3% | 48.4% | 18.5 | 0 | 52.5% | 0 |
| ADX > 15 | 31 | +70.0% | 48.4% | 18.4 | 2 | 52.3% | 0 |
| ADX > 20 | 28 | +20.2% | 39.3% | 16.5 | 67 | 42.7% | 0 |
| ADX > 25 | 18 | +40.6% | 44.4% | 19.2 | 143 | 31.8% | 0 |
| ADX > 30 | 13 | +39.1% | 61.5% | 18.9 | 213 | 22.5% | 0 |

### GEHC — 26/64 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +4.3% | 34.8% | 15.4 | 0 | 32.7% | 0 |
| ADX > 15 | 18 | +6.3% | 33.3% | 18.7 | 13 | 31.0% | 0 |
| ADX > 20 | 14 | +17.0% | 50.0% | 20.8 | 41 | 27.0% | 0 |
| ADX > 25 | 10 | +2.6% | 30.0% | 23.4 | 86 | 21.0% | 0 |
| ADX > 30 | 8 | -0.0% | 37.5% | 20.4 | 133 | 14.8% | 0 |

### GEN — 10/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +55.3% | 45.2% | 11.9 | 0 | 35.0% | 1 |
| ADX > 15 | 30 | +59.2% | 43.3% | 11.6 | 24 | 31.8% | 1 |
| ADX > 20 | 23 | +26.9% | 43.5% | 11.7 | 83 | 24.2% | 0 |
| ADX > 25 | 13 | +20.9% | 46.2% | 13.3 | 149 | 15.4% | 0 |
| ADX > 30 | 10 | +17.0% | 40.0% | 14.5 | 169 | 12.8% | 0 |

### GEV — 22/38 SMA, 611 bars, 2024-03-27 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +245.8% | 34.6% | 18.0 | 0 | 52.0% | 0 |
| ADX > 15 | 20 | +175.7% | 40.0% | 20.1 | 44 | 44.7% | 0 |
| ADX > 20 | 13 | +39.7% | 30.8% | 21.4 | 124 | 31.6% | 0 |
| ADX > 25 | 9 | +42.5% | 33.3% | 25.9 | 153 | 26.8% | 0 |
| ADX > 30 | 3 | +93.9% | 66.7% | 64.7 | 184 | 21.8% | 0 |

### GILD — 10/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 37 | +35.7% | 40.5% | 10.7 | 0 | 36.7% | 1 |
| ADX > 15 | 33 | +23.8% | 42.4% | 10.9 | 23 | 33.6% | 1 |
| ADX > 20 | 22 | +16.7% | 50.0% | 13.3 | 73 | 27.0% | 1 |
| ADX > 25 | 16 | +13.4% | 43.8% | 15.0 | 111 | 21.9% | 1 |
| ADX > 30 | 11 | +18.0% | 54.5% | 16.9 | 147 | 17.2% | 1 |

### GIS — 28/62 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 12 | -2.0% | 41.7% | 12.3 | 0 | 16.4% | 1 |
| ADX > 15 | 10 | -2.9% | 30.0% | 13.6 | 14 | 14.5% | 1 |
| ADX > 20 | 4 | -2.3% | 50.0% | 22.0 | 55 | 9.0% | 1 |
| ADX > 25 | 3 | +0.6% | 33.3% | 24.3 | 74 | 6.8% | 0 |
| ADX > 30 | 2 | -1.5% | 50.0% | 23.5 | 91 | 4.5% | 0 |

### GL — 24/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +28.5% | 40.0% | 23.9 | 0 | 43.8% | 0 |
| ADX > 15 | 19 | +24.9% | 42.1% | 24.6 | 7 | 42.8% | 0 |
| ADX > 20 | 17 | +2.6% | 41.2% | 23.2 | 56 | 36.3% | 0 |
| ADX > 25 | 12 | -14.2% | 33.3% | 20.6 | 158 | 22.7% | 0 |
| ADX > 30 | 6 | +12.6% | 50.0% | 29.0 | 209 | 16.0% | 0 |

### GLW — 8/66 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 59 | +165.7% | 49.2% | 9.2 | 0 | 49.2% | 0 |
| ADX > 15 | 56 | +133.5% | 50.0% | 9.4 | 13 | 47.5% | 0 |
| ADX > 20 | 48 | +40.5% | 43.8% | 8.9 | 75 | 39.0% | 0 |
| ADX > 25 | 34 | +51.6% | 44.1% | 9.2 | 155 | 28.3% | 0 |
| ADX > 30 | 25 | +75.0% | 48.0% | 9.5 | 204 | 21.8% | 0 |

### GM — 28/76 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +21.5% | 39.3% | 18.6 | 0 | 48.0% | 0 |
| ADX > 15 | 21 | +6.3% | 42.9% | 22.5 | 28 | 43.8% | 0 |
| ADX > 20 | 15 | +15.9% | 46.7% | 27.6 | 70 | 38.2% | 0 |
| ADX > 25 | 12 | +11.3% | 50.0% | 26.1 | 142 | 28.6% | 0 |
| ADX > 30 | 6 | +2.6% | 16.7% | 29.5 | 238 | 15.8% | 0 |

### GNRC — 26/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 15 | +154.7% | 60.0% | 26.3 | 0 | 36.6% | 0 |
| ADX > 15 | 15 | +137.9% | 60.0% | 26.1 | 2 | 36.3% | 0 |
| ADX > 20 | 13 | +61.1% | 46.2% | 27.0 | 20 | 32.4% | 0 |
| ADX > 25 | 10 | +41.4% | 60.0% | 29.0 | 41 | 26.9% | 0 |
| ADX > 30 | 7 | +4.0% | 28.6% | 29.4 | 100 | 19.0% | 0 |

### GOOG — 22/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +136.5% | 57.9% | 28.2 | 0 | 48.3% | 0 |
| ADX > 15 | 18 | +114.9% | 61.1% | 29.4 | 7 | 47.3% | 0 |
| ADX > 20 | 12 | +104.8% | 66.7% | 36.8 | 63 | 39.9% | 0 |
| ADX > 25 | 9 | +60.5% | 44.4% | 38.1 | 127 | 31.4% | 0 |
| ADX > 30 | 8 | +33.0% | 50.0% | 32.8 | 183 | 23.9% | 0 |

### GOOGL — 22/50 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +145.7% | 57.9% | 27.8 | 0 | 47.6% | 0 |
| ADX > 15 | 18 | +123.3% | 61.1% | 29.0 | 7 | 46.7% | 0 |
| ADX > 20 | 14 | +95.5% | 50.0% | 31.5 | 59 | 39.8% | 0 |
| ADX > 25 | 9 | +57.8% | 55.6% | 37.9 | 124 | 31.1% | 0 |
| ADX > 30 | 7 | +39.0% | 57.1% | 36.0 | 186 | 22.9% | 0 |

### GPC — 8/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 41 | +8.1% | 41.5% | 7.0 | 0 | 25.8% | 0 |
| ADX > 15 | 34 | -9.7% | 26.5% | 7.1 | 30 | 21.8% | 0 |
| ADX > 20 | 20 | +5.0% | 35.0% | 8.0 | 85 | 14.5% | 0 |
| ADX > 25 | 11 | -0.2% | 36.4% | 8.6 | 130 | 8.5% | 0 |
| ADX > 30 | 6 | -8.5% | 33.3% | 7.0 | 168 | 3.5% | 0 |

### GPN — 18/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +10.3% | 37.5% | 13.7 | 0 | 30.1% | 0 |
| ADX > 15 | 20 | +12.5% | 30.0% | 14.8 | 21 | 27.3% | 0 |
| ADX > 20 | 14 | +18.6% | 35.7% | 18.6 | 46 | 23.9% | 0 |
| ADX > 25 | 12 | -7.8% | 33.3% | 15.3 | 95 | 17.2% | 0 |
| ADX > 30 | 8 | -8.5% | 37.5% | 15.9 | 136 | 11.7% | 0 |

### GRMN — 16/74 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +61.3% | 46.7% | 13.8 | 0 | 38.2% | 0 |
| ADX > 15 | 25 | +37.0% | 52.0% | 15.4 | 21 | 35.4% | 0 |
| ADX > 20 | 23 | +2.8% | 34.8% | 14.0 | 65 | 29.5% | 0 |
| ADX > 25 | 16 | +5.6% | 37.5% | 14.5 | 122 | 21.9% | 0 |
| ADX > 30 | 14 | -16.7% | 28.6% | 13.5 | 154 | 17.7% | 0 |

### GS — 12/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 47 | +76.4% | 44.7% | 11.3 | 0 | 48.3% | 0 |
| ADX > 15 | 47 | +60.5% | 42.6% | 11.1 | 8 | 47.2% | 0 |
| ADX > 20 | 39 | +10.1% | 35.9% | 9.7 | 98 | 34.7% | 0 |
| ADX > 25 | 31 | -12.2% | 25.8% | 9.5 | 156 | 27.0% | 0 |
| ADX > 30 | 20 | +1.3% | 30.0% | 8.5 | 242 | 15.6% | 0 |

### GWW — 30/74 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 10 | +64.6% | 50.0% | 46.4 | 0 | 42.0% | 0 |
| ADX > 15 | 9 | +53.5% | 44.4% | 46.8 | 30 | 38.0% | 0 |
| ADX > 20 | 8 | +54.2% | 50.0% | 51.9 | 34 | 37.5% | 0 |
| ADX > 25 | 6 | +39.9% | 66.7% | 54.2 | 94 | 29.5% | 0 |
| ADX > 30 | 6 | +18.2% | 66.7% | 43.3 | 139 | 23.5% | 0 |

### HAL — 8/68 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +56.5% | 44.8% | 8.9 | 0 | 23.3% | 1 |
| ADX > 15 | 25 | +37.5% | 52.0% | 8.4 | 31 | 19.1% | 1 |
| ADX > 20 | 20 | +15.3% | 55.0% | 7.0 | 76 | 13.3% | 0 |
| ADX > 25 | 12 | -9.5% | 33.3% | 5.4 | 131 | 6.1% | 0 |
| ADX > 30 | 7 | -4.0% | 42.9% | 5.3 | 151 | 3.5% | 0 |

### HAS — 28/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +69.0% | 52.4% | 25.7 | 0 | 49.6% | 0 |
| ADX > 15 | 17 | +53.5% | 58.8% | 28.1 | 38 | 44.1% | 0 |
| ADX > 20 | 10 | +34.9% | 70.0% | 38.8 | 93 | 36.0% | 0 |
| ADX > 25 | 9 | +17.2% | 55.6% | 36.2 | 125 | 30.5% | 0 |
| ADX > 30 | 5 | +19.5% | 60.0% | 36.4 | 226 | 17.0% | 0 |

### HBAN — 28/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +17.3% | 41.7% | 19.6 | 0 | 43.2% | 0 |
| ADX > 15 | 21 | +18.4% | 42.9% | 22.0 | 6 | 42.4% | 0 |
| ADX > 20 | 16 | +1.3% | 37.5% | 25.5 | 36 | 37.0% | 0 |
| ADX > 25 | 10 | -10.8% | 30.0% | 24.8 | 116 | 21.9% | 0 |
| ADX > 30 | 8 | -21.8% | 12.5% | 24.5 | 146 | 17.6% | 0 |

### HCA — 28/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +36.6% | 50.0% | 21.4 | 0 | 46.5% | 1 |
| ADX > 15 | 20 | +26.9% | 50.0% | 22.4 | 13 | 44.4% | 1 |
| ADX > 20 | 18 | +19.2% | 44.4% | 23.2 | 35 | 41.2% | 1 |
| ADX > 25 | 12 | +5.7% | 33.3% | 25.7 | 128 | 27.9% | 0 |
| ADX > 30 | 7 | +10.6% | 42.9% | 34.6 | 174 | 21.8% | 0 |

### HD — 24/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +30.3% | 40.9% | 18.1 | 0 | 36.3% | 0 |
| ADX > 15 | 20 | +18.6% | 40.0% | 17.9 | 21 | 32.7% | 0 |
| ADX > 20 | 13 | +14.2% | 53.8% | 20.8 | 77 | 24.9% | 0 |
| ADX > 25 | 8 | +8.4% | 50.0% | 26.9 | 115 | 19.8% | 0 |
| ADX > 30 | 5 | +22.3% | 100.0% | 34.8 | 145 | 15.8% | 0 |

### HIG — 30/74 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +25.8% | 57.1% | 23.2 | 0 | 44.4% | 0 |
| ADX > 15 | 20 | +20.2% | 55.0% | 23.6 | 11 | 43.0% | 0 |
| ADX > 20 | 16 | +6.8% | 62.5% | 25.9 | 51 | 37.6% | 0 |
| ADX > 25 | 9 | +12.9% | 66.7% | 33.0 | 132 | 26.9% | 0 |
| ADX > 30 | 6 | +6.7% | 50.0% | 34.0 | 198 | 18.1% | 0 |

### HII — 30/72 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +38.7% | 45.5% | 19.9 | 0 | 40.4% | 0 |
| ADX > 15 | 21 | +33.0% | 47.6% | 19.8 | 14 | 38.6% | 0 |
| ADX > 20 | 15 | +29.6% | 53.3% | 23.7 | 59 | 32.6% | 0 |
| ADX > 25 | 15 | -15.0% | 40.0% | 18.8 | 110 | 25.8% | 0 |
| ADX > 30 | 9 | -12.0% | 22.2% | 21.8 | 168 | 18.1% | 0 |

### HLT — 8/92 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 63 | +19.8% | 41.3% | 7.5 | 0 | 42.2% | 0 |
| ADX > 15 | 59 | +19.4% | 44.1% | 7.7 | 13 | 40.4% | 0 |
| ADX > 20 | 43 | -7.5% | 41.9% | 7.0 | 116 | 26.7% | 0 |
| ADX > 25 | 30 | -16.5% | 30.0% | 5.9 | 200 | 15.6% | 0 |
| ADX > 30 | 17 | -0.5% | 35.3% | 6.5 | 244 | 9.7% | 0 |

### HON — 28/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +17.6% | 36.4% | 17.5 | 0 | 35.4% | 0 |
| ADX > 15 | 16 | +16.5% | 43.8% | 20.7 | 35 | 30.2% | 0 |
| ADX > 20 | 13 | +2.8% | 46.2% | 22.5 | 58 | 26.7% | 0 |
| ADX > 25 | 12 | -12.7% | 25.0% | 21.3 | 83 | 23.4% | 0 |
| ADX > 30 | 10 | -14.9% | 20.0% | 19.5 | 123 | 17.8% | 0 |

### HOOD — 28/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +356.1% | 52.6% | 25.1 | 0 | 44.4% | 1 |
| ADX > 15 | 18 | +283.2% | 55.6% | 26.1 | 6 | 43.6% | 1 |
| ADX > 20 | 14 | +358.3% | 71.4% | 30.9 | 39 | 39.2% | 1 |
| ADX > 25 | 10 | +186.5% | 70.0% | 34.3 | 101 | 31.3% | 0 |
| ADX > 30 | 7 | +107.8% | 57.1% | 36.3 | 164 | 22.9% | 0 |

### HPE — 20/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +129.9% | 48.1% | 17.6 | 0 | 42.8% | 0 |
| ADX > 15 | 25 | +84.7% | 44.0% | 17.4 | 16 | 39.6% | 0 |
| ADX > 20 | 24 | +81.7% | 45.8% | 16.3 | 44 | 35.9% | 0 |
| ADX > 25 | 16 | +86.0% | 43.8% | 17.2 | 123 | 25.4% | 0 |
| ADX > 30 | 7 | +43.8% | 28.6% | 19.9 | 208 | 12.8% | 0 |

### HPQ — 8/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +55.5% | 42.9% | 8.2 | 0 | 27.1% | 1 |
| ADX > 15 | 28 | +64.9% | 46.4% | 8.4 | 40 | 21.8% | 1 |
| ADX > 20 | 22 | +57.2% | 50.0% | 9.1 | 60 | 19.0% | 1 |
| ADX > 25 | 15 | +80.5% | 66.7% | 10.5 | 92 | 14.8% | 1 |
| ADX > 30 | 12 | +41.0% | 50.0% | 8.8 | 130 | 10.0% | 0 |

### HRL — 18/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +2.0% | 50.0% | 12.4 | 0 | 24.7% | 0 |
| ADX > 15 | 18 | +3.2% | 55.6% | 13.5 | 18 | 22.3% | 0 |
| ADX > 20 | 12 | +6.1% | 75.0% | 16.2 | 55 | 17.4% | 0 |
| ADX > 25 | 6 | +6.9% | 83.3% | 22.3 | 96 | 12.0% | 0 |
| ADX > 30 | 3 | +7.0% | 100.0% | 29.3 | 128 | 7.7% | 0 |

### HSIC — 26/72 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | -9.8% | 30.0% | 12.7 | 0 | 33.9% | 0 |
| ADX > 15 | 21 | -17.5% | 23.8% | 14.4 | 44 | 26.9% | 0 |
| ADX > 20 | 14 | -9.2% | 28.6% | 16.9 | 91 | 20.6% | 0 |
| ADX > 25 | 7 | -1.2% | 42.9% | 24.9 | 130 | 15.4% | 0 |
| ADX > 30 | 4 | +5.3% | 50.0% | 27.8 | 172 | 9.8% | 0 |

### HST — 30/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +15.8% | 45.5% | 20.7 | 0 | 41.1% | 0 |
| ADX > 15 | 21 | +7.3% | 42.9% | 20.8 | 7 | 39.5% | 0 |
| ADX > 20 | 16 | +10.3% | 50.0% | 22.0 | 61 | 31.8% | 0 |
| ADX > 25 | 9 | +0.0% | 44.4% | 26.8 | 120 | 22.1% | 0 |
| ADX > 30 | 4 | +13.7% | 75.0% | 30.3 | 199 | 10.9% | 0 |

### HSY — 30/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +3.0% | 26.1% | 10.9 | 0 | 23.1% | 0 |
| ADX > 15 | 19 | +7.9% | 31.6% | 12.0 | 15 | 21.1% | 0 |
| ADX > 20 | 13 | +9.8% | 30.8% | 10.3 | 80 | 12.4% | 0 |
| ADX > 25 | 4 | -17.5% | 0.0% | 16.0 | 129 | 5.9% | 0 |
| ADX > 30 | 3 | -17.9% | 0.0% | 17.7 | 138 | 4.7% | 0 |

### HUBB — 16/96 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +16.4% | 37.9% | 13.9 | 0 | 36.4% | 0 |
| ADX > 15 | 25 | -6.6% | 36.0% | 13.3 | 49 | 29.9% | 0 |
| ADX > 20 | 15 | -6.6% | 40.0% | 15.4 | 119 | 20.6% | 0 |
| ADX > 25 | 6 | +2.6% | 50.0% | 23.0 | 179 | 12.4% | 0 |
| ADX > 30 | 4 | +3.1% | 50.0% | 16.3 | 228 | 5.9% | 0 |

### HUM — 14/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +69.2% | 36.8% | 14.3 | 0 | 24.2% | 0 |
| ADX > 15 | 18 | +63.3% | 33.3% | 14.5 | 7 | 23.3% | 0 |
| ADX > 20 | 13 | +66.9% | 23.1% | 15.9 | 41 | 18.9% | 0 |
| ADX > 25 | 8 | +69.5% | 37.5% | 20.0 | 72 | 14.8% | 0 |
| ADX > 30 | 7 | +62.6% | 28.6% | 18.9 | 92 | 12.1% | 0 |

### HWM — 10/88 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 53 | +112.4% | 41.5% | 11.2 | 0 | 54.5% | 0 |
| ADX > 15 | 47 | +134.2% | 40.4% | 11.8 | 29 | 50.7% | 0 |
| ADX > 20 | 34 | +65.1% | 41.2% | 12.5 | 113 | 39.1% | 0 |
| ADX > 25 | 25 | +9.5% | 36.0% | 11.8 | 203 | 27.1% | 0 |
| ADX > 30 | 13 | +2.2% | 30.8% | 14.5 | 277 | 17.3% | 0 |

### IBKR — 8/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +181.7% | 47.6% | 11.3 | 0 | 43.6% | 0 |
| ADX > 15 | 39 | +116.0% | 43.6% | 11.0 | 35 | 39.0% | 0 |
| ADX > 20 | 29 | +55.3% | 41.4% | 10.5 | 120 | 27.7% | 0 |
| ADX > 25 | 18 | +17.5% | 44.4% | 9.4 | 209 | 15.8% | 0 |
| ADX > 30 | 11 | +5.2% | 45.5% | 10.5 | 247 | 10.8% | 0 |

### IBM — 10/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +89.7% | 51.6% | 12.8 | 0 | 36.3% | 0 |
| ADX > 15 | 30 | +84.6% | 53.3% | 13.0 | 6 | 35.5% | 0 |
| ADX > 20 | 26 | +66.6% | 53.8% | 13.0 | 44 | 30.5% | 0 |
| ADX > 25 | 24 | +64.4% | 58.3% | 12.5 | 70 | 27.0% | 0 |
| ADX > 30 | 17 | +18.9% | 41.2% | 12.9 | 123 | 19.9% | 0 |

### ICE — 12/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 34 | +27.5% | 47.1% | 13.5 | 0 | 41.8% | 0 |
| ADX > 15 | 32 | +26.0% | 46.9% | 13.4 | 19 | 39.2% | 0 |
| ADX > 20 | 24 | +33.7% | 50.0% | 14.4 | 77 | 31.5% | 0 |
| ADX > 25 | 17 | +21.4% | 52.9% | 14.8 | 136 | 23.0% | 0 |
| ADX > 30 | 14 | +11.3% | 57.1% | 14.8 | 166 | 18.9% | 0 |

### IDXX — 26/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | -2.6% | 33.3% | 15.8 | 0 | 29.7% | 0 |
| ADX > 15 | 18 | -15.8% | 27.8% | 16.4 | 24 | 26.3% | 0 |
| ADX > 20 | 13 | -2.5% | 30.8% | 20.6 | 42 | 23.7% | 0 |
| ADX > 25 | 7 | +8.7% | 42.9% | 30.6 | 73 | 19.0% | 0 |
| ADX > 30 | 3 | +3.5% | 66.7% | 46.0 | 125 | 12.1% | 0 |

### IEX — 20/96 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | +45.9% | 64.3% | 23.8 | 0 | 30.6% | 0 |
| ADX > 15 | 13 | +55.6% | 69.2% | 24.1 | 14 | 28.7% | 0 |
| ADX > 20 | 11 | +48.7% | 63.6% | 25.9 | 36 | 25.8% | 0 |
| ADX > 25 | 8 | +35.3% | 62.5% | 28.9 | 73 | 20.9% | 0 |
| ADX > 30 | 6 | +41.0% | 100.0% | 34.0 | 92 | 18.4% | 0 |

### IFF — 8/66 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +2.3% | 45.2% | 7.9 | 0 | 30.2% | 0 |
| ADX > 15 | 36 | -8.1% | 44.4% | 7.9 | 36 | 25.4% | 0 |
| ADX > 20 | 29 | -11.5% | 34.5% | 7.2 | 83 | 19.1% | 0 |
| ADX > 25 | 17 | -14.4% | 35.3% | 6.0 | 156 | 9.4% | 0 |
| ADX > 30 | 11 | -11.5% | 18.2% | 5.6 | 184 | 5.9% | 0 |

### INCY — 8/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 50 | +66.6% | 34.0% | 8.6 | 0 | 38.7% | 0 |
| ADX > 15 | 45 | +45.8% | 33.3% | 8.3 | 36 | 33.9% | 0 |
| ADX > 20 | 37 | +43.4% | 35.1% | 8.5 | 77 | 28.5% | 0 |
| ADX > 25 | 27 | +15.6% | 33.3% | 7.9 | 147 | 19.3% | 0 |
| ADX > 30 | 19 | -1.2% | 26.3% | 6.9 | 204 | 11.7% | 0 |

### INTC — 20/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +171.0% | 37.5% | 17.9 | 0 | 38.8% | 0 |
| ADX > 15 | 20 | +150.2% | 45.0% | 20.0 | 17 | 36.3% | 0 |
| ADX > 20 | 17 | +80.5% | 47.1% | 19.6 | 53 | 30.5% | 0 |
| ADX > 25 | 15 | +75.3% | 46.7% | 20.3 | 70 | 27.4% | 0 |
| ADX > 30 | 13 | +47.1% | 46.2% | 19.8 | 100 | 23.4% | 0 |

### INTU — 16/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +5.9% | 25.0% | 12.0 | 0 | 26.1% | 0 |
| ADX > 15 | 22 | -7.5% | 27.3% | 11.6 | 24 | 22.9% | 0 |
| ADX > 20 | 16 | +3.3% | 31.3% | 12.3 | 60 | 17.7% | 0 |
| ADX > 25 | 12 | -6.4% | 33.3% | 12.8 | 87 | 13.4% | 0 |
| ADX > 30 | 5 | +11.1% | 60.0% | 21.2 | 117 | 9.4% | 0 |

### INVH — 30/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | -2.0% | 54.2% | 10.6 | 0 | 23.9% | 0 |
| ADX > 15 | 17 | -12.8% | 35.3% | 12.9 | 28 | 20.2% | 0 |
| ADX > 20 | 8 | -4.9% | 50.0% | 20.4 | 68 | 14.9% | 0 |
| ADX > 25 | 5 | +1.3% | 60.0% | 27.4 | 87 | 12.4% | 0 |
| ADX > 30 | 3 | -2.7% | 66.7% | 17.3 | 145 | 4.7% | 0 |

### IP — 8/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +16.8% | 40.0% | 8.1 | 0 | 25.3% | 0 |
| ADX > 15 | 33 | +14.9% | 42.4% | 8.2 | 10 | 23.9% | 0 |
| ADX > 20 | 27 | -10.1% | 25.9% | 8.0 | 46 | 19.1% | 0 |
| ADX > 25 | 18 | -26.2% | 16.7% | 6.8 | 107 | 11.0% | 0 |
| ADX > 30 | 5 | -4.3% | 40.0% | 11.2 | 149 | 5.5% | 0 |

### IQV — 14/68 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +34.3% | 42.3% | 12.8 | 0 | 31.1% | 1 |
| ADX > 15 | 23 | +44.2% | 43.5% | 13.9 | 8 | 30.1% | 1 |
| ADX > 20 | 18 | +12.0% | 33.3% | 12.9 | 62 | 22.9% | 1 |
| ADX > 25 | 12 | -21.5% | 16.7% | 11.8 | 124 | 14.2% | 1 |
| ADX > 30 | 9 | -19.9% | 11.1% | 10.8 | 153 | 10.4% | 1 |

### IR — 20/66 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +28.8% | 42.9% | 18.0 | 0 | 34.4% | 0 |
| ADX > 15 | 19 | +17.9% | 42.1% | 18.3 | 21 | 31.6% | 0 |
| ADX > 20 | 14 | +30.8% | 57.1% | 21.6 | 50 | 27.5% | 0 |
| ADX > 25 | 7 | +32.3% | 42.9% | 26.4 | 122 | 17.2% | 0 |
| ADX > 30 | 5 | +18.0% | 40.0% | 29.0 | 152 | 13.2% | 0 |

### IRM — 22/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +93.1% | 35.7% | 16.6 | 0 | 43.0% | 0 |
| ADX > 15 | 25 | +76.3% | 36.0% | 18.0 | 10 | 41.6% | 0 |
| ADX > 20 | 18 | +72.8% | 44.4% | 21.5 | 51 | 35.6% | 0 |
| ADX > 25 | 13 | +44.3% | 38.5% | 24.3 | 101 | 29.0% | 0 |
| ADX > 30 | 8 | +49.0% | 62.5% | 35.6 | 123 | 26.1% | 0 |

### ISRG — 26/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +19.6% | 50.0% | 19.5 | 0 | 38.4% | 0 |
| ADX > 15 | 18 | +24.0% | 50.0% | 23.3 | 7 | 37.5% | 0 |
| ADX > 20 | 14 | +4.8% | 42.9% | 23.3 | 64 | 29.1% | 0 |
| ADX > 25 | 10 | +17.3% | 60.0% | 28.1 | 95 | 25.0% | 0 |
| ADX > 30 | 6 | +12.2% | 66.7% | 28.0 | 171 | 14.9% | 0 |

### IT — 16/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +42.2% | 53.8% | 12.5 | 0 | 29.8% | 0 |
| ADX > 15 | 22 | +5.4% | 40.9% | 11.8 | 45 | 23.8% | 0 |
| ADX > 20 | 16 | -10.9% | 31.3% | 12.5 | 89 | 18.0% | 0 |
| ADX > 25 | 12 | -4.9% | 25.0% | 13.0 | 119 | 14.0% | 0 |
| ADX > 30 | 9 | +5.0% | 33.3% | 14.7 | 134 | 12.0% | 0 |

### ITW — 24/82 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 12 | +23.6% | 50.0% | 26.1 | 0 | 28.6% | 0 |
| ADX > 15 | 12 | +5.0% | 33.3% | 23.1 | 24 | 25.4% | 0 |
| ADX > 20 | 12 | -8.7% | 25.0% | 19.5 | 57 | 21.0% | 0 |
| ADX > 25 | 4 | -0.7% | 25.0% | 19.8 | 159 | 7.4% | 0 |
| ADX > 30 | 3 | +2.3% | 33.3% | 23.7 | 165 | 6.6% | 0 |

### IVZ — 22/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +35.8% | 27.6% | 17.5 | 0 | 45.9% | 0 |
| ADX > 15 | 25 | +32.9% | 28.0% | 19.2 | 16 | 43.8% | 0 |
| ADX > 20 | 18 | +37.4% | 33.3% | 22.8 | 49 | 37.6% | 0 |
| ADX > 25 | 13 | +18.3% | 23.1% | 20.4 | 145 | 24.1% | 0 |
| ADX > 30 | 8 | +8.5% | 37.5% | 20.0 | 202 | 14.8% | 0 |

### J — 16/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +40.0% | 40.0% | 16.9 | 0 | 31.6% | 0 |
| ADX > 15 | 18 | +30.5% | 38.9% | 15.8 | 34 | 27.1% | 0 |
| ADX > 20 | 15 | +22.3% | 46.7% | 16.9 | 57 | 24.1% | 0 |
| ADX > 25 | 12 | +19.9% | 58.3% | 17.3 | 90 | 19.7% | 0 |
| ADX > 30 | 9 | +9.4% | 55.6% | 19.7 | 113 | 16.6% | 0 |

### JBHT — 12/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 33 | +44.7% | 33.3% | 10.6 | 0 | 31.8% | 0 |
| ADX > 15 | 32 | +49.8% | 37.5% | 10.8 | 4 | 31.3% | 0 |
| ADX > 20 | 26 | +13.4% | 34.6% | 11.2 | 38 | 26.3% | 0 |
| ADX > 25 | 17 | +0.9% | 47.1% | 10.4 | 115 | 16.1% | 0 |
| ADX > 30 | 11 | -12.8% | 27.3% | 9.5 | 162 | 9.6% | 0 |

### JBL — 26/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +44.0% | 40.9% | 23.9 | 0 | 46.8% | 0 |
| ADX > 15 | 21 | +31.3% | 42.9% | 24.2 | 6 | 45.3% | 0 |
| ADX > 20 | 16 | +0.8% | 43.8% | 26.4 | 53 | 37.4% | 0 |
| ADX > 25 | 11 | +26.7% | 36.4% | 27.5 | 111 | 27.1% | 0 |
| ADX > 30 | 7 | -6.7% | 42.9% | 25.3 | 195 | 16.0% | 0 |

### JCI — 12/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 55 | +21.0% | 32.7% | 10.1 | 0 | 50.8% | 0 |
| ADX > 15 | 42 | +16.7% | 26.2% | 10.7 | 72 | 41.1% | 0 |
| ADX > 20 | 32 | +11.2% | 31.3% | 11.1 | 135 | 32.7% | 0 |
| ADX > 25 | 20 | +20.2% | 35.0% | 13.6 | 192 | 25.1% | 0 |
| ADX > 30 | 12 | +8.5% | 50.0% | 15.9 | 245 | 17.6% | 0 |

### JKHY — 30/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +14.1% | 38.9% | 20.8 | 0 | 35.1% | 1 |
| ADX > 15 | 11 | +24.9% | 54.5% | 28.5 | 40 | 29.7% | 1 |
| ADX > 20 | 10 | +14.9% | 60.0% | 28.6 | 56 | 27.3% | 1 |
| ADX > 25 | 6 | +6.3% | 50.0% | 31.8 | 116 | 18.1% | 1 |
| ADX > 30 | 4 | +9.0% | 75.0% | 37.0 | 152 | 13.2% | 0 |

### JNJ — 8/84 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +44.9% | 46.2% | 8.8 | 0 | 32.3% | 1 |
| ADX > 15 | 36 | +45.8% | 47.2% | 9.1 | 11 | 30.9% | 1 |
| ADX > 20 | 30 | +20.8% | 40.0% | 9.0 | 52 | 25.4% | 1 |
| ADX > 25 | 22 | +11.9% | 36.4% | 9.2 | 100 | 19.3% | 0 |
| ADX > 30 | 19 | -1.3% | 31.6% | 7.8 | 137 | 14.4% | 0 |

### JPM — 18/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +61.8% | 50.0% | 19.7 | 0 | 50.1% | 0 |
| ADX > 15 | 26 | +45.1% | 46.2% | 20.2 | 19 | 47.6% | 0 |
| ADX > 20 | 23 | +28.4% | 43.5% | 18.8 | 80 | 39.5% | 0 |
| ADX > 25 | 14 | +18.3% | 42.9% | 22.4 | 163 | 28.5% | 0 |
| ADX > 30 | 8 | +20.8% | 62.5% | 26.8 | 228 | 19.8% | 0 |

### KDP — 12/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +15.0% | 40.6% | 11.8 | 0 | 34.7% | 1 |
| ADX > 15 | 26 | +15.5% | 42.3% | 12.6 | 30 | 30.6% | 1 |
| ADX > 20 | 25 | +2.9% | 36.0% | 10.1 | 72 | 24.2% | 1 |
| ADX > 25 | 22 | -2.8% | 31.8% | 9.9 | 103 | 20.2% | 0 |
| ADX > 30 | 11 | +6.8% | 45.5% | 13.1 | 159 | 12.9% | 0 |

### KEY — 16/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +16.7% | 35.5% | 14.1 | 0 | 39.6% | 0 |
| ADX > 15 | 29 | +13.0% | 34.5% | 14.2 | 17 | 37.4% | 0 |
| ADX > 20 | 19 | +10.1% | 42.1% | 16.4 | 86 | 28.2% | 0 |
| ADX > 25 | 16 | -1.9% | 50.0% | 15.1 | 131 | 22.2% | 0 |
| ADX > 30 | 13 | -3.6% | 38.5% | 13.0 | 180 | 15.0% | 0 |

### KEYS — 10/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +56.9% | 41.0% | 10.5 | 0 | 37.1% | 0 |
| ADX > 15 | 35 | +49.4% | 34.3% | 10.3 | 32 | 32.6% | 0 |
| ADX > 20 | 28 | +35.0% | 35.7% | 9.4 | 94 | 24.3% | 0 |
| ADX > 25 | 19 | +11.1% | 36.8% | 8.6 | 160 | 15.0% | 0 |
| ADX > 30 | 7 | +24.3% | 28.6% | 11.4 | 218 | 7.3% | 0 |

### KHC — 28/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | +1.8% | 29.4% | 17.4 | 0 | 27.3% | 0 |
| ADX > 15 | 14 | +5.3% | 35.7% | 20.4 | 8 | 26.3% | 0 |
| ADX > 20 | 9 | -4.9% | 22.2% | 21.1 | 60 | 17.6% | 0 |
| ADX > 25 | 4 | +2.8% | 50.0% | 36.5 | 91 | 13.4% | 0 |
| ADX > 30 | 2 | +2.9% | 50.0% | 43.5 | 126 | 7.8% | 0 |

### KIM — 20/68 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +34.1% | 40.0% | 15.1 | 0 | 34.4% | 0 |
| ADX > 15 | 18 | +38.6% | 38.9% | 17.3 | 45 | 28.5% | 0 |
| ADX > 20 | 14 | +15.4% | 42.9% | 17.8 | 86 | 23.0% | 0 |
| ADX > 25 | 9 | +8.8% | 44.4% | 19.0 | 139 | 16.0% | 0 |
| ADX > 30 | 6 | +15.8% | 66.7% | 22.3 | 166 | 12.4% | 0 |

### KKR — 28/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +33.0% | 33.3% | 21.2 | 0 | 46.3% | 0 |
| ADX > 15 | 20 | +9.4% | 35.0% | 23.1 | 26 | 42.0% | 0 |
| ADX > 20 | 17 | +16.4% | 41.2% | 23.4 | 69 | 36.3% | 0 |
| ADX > 25 | 11 | +53.2% | 36.4% | 27.8 | 129 | 27.8% | 0 |
| ADX > 30 | 7 | +34.9% | 28.6% | 29.0 | 190 | 18.5% | 0 |

### KLAC — 16/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 36 | -77.7% | 47.2% | 13.7 | 0 | 44.3% | 0 |
| ADX > 15 | 29 | -79.5% | 48.3% | 15.4 | 32 | 40.0% | 0 |
| ADX > 20 | 18 | -85.3% | 50.0% | 18.5 | 113 | 29.3% | 0 |
| ADX > 25 | 14 | -7.0% | 50.0% | 17.5 | 169 | 21.8% | 0 |
| ADX > 30 | 8 | +1.3% | 25.0% | 19.9 | 227 | 14.1% | 0 |

### KMB — 10/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | -7.1% | 40.0% | 8.5 | 0 | 23.8% | 0 |
| ADX > 15 | 26 | -15.2% | 34.6% | 8.9 | 20 | 21.1% | 0 |
| ADX > 20 | 18 | -10.6% | 44.4% | 9.2 | 65 | 15.2% | 0 |
| ADX > 25 | 13 | -16.8% | 30.8% | 8.7 | 103 | 10.1% | 0 |
| ADX > 30 | 5 | -6.0% | 40.0% | 7.8 | 152 | 3.6% | 0 |

### KMI — 30/96 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 15 | +61.5% | 46.7% | 28.7 | 0 | 38.8% | 0 |
| ADX > 15 | 10 | +63.4% | 70.0% | 39.3 | 25 | 35.5% | 0 |
| ADX > 20 | 10 | +41.5% | 70.0% | 36.3 | 46 | 32.7% | 0 |
| ADX > 25 | 9 | +26.7% | 66.7% | 35.2 | 77 | 28.6% | 0 |
| ADX > 30 | 8 | -7.1% | 37.5% | 25.0 | 133 | 18.6% | 0 |

### KO — 8/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 44 | +15.5% | 47.7% | 9.2 | 0 | 37.1% | 0 |
| ADX > 15 | 36 | +23.5% | 58.3% | 10.1 | 29 | 33.2% | 0 |
| ADX > 20 | 27 | +34.0% | 74.1% | 10.8 | 73 | 27.1% | 0 |
| ADX > 25 | 20 | -7.9% | 50.0% | 8.9 | 148 | 16.6% | 0 |
| ADX > 30 | 13 | -0.8% | 53.8% | 9.3 | 190 | 11.0% | 0 |

### KR — 28/92 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +8.1% | 40.0% | 18.8 | 0 | 34.7% | 0 |
| ADX > 15 | 20 | +8.6% | 40.0% | 18.2 | 7 | 33.8% | 0 |
| ADX > 20 | 14 | -7.3% | 28.6% | 22.1 | 44 | 28.9% | 0 |
| ADX > 25 | 8 | +0.6% | 25.0% | 23.3 | 133 | 17.0% | 0 |
| ADX > 30 | 6 | -18.5% | 16.7% | 20.3 | 178 | 11.0% | 0 |

### KVUE — 8/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 41 | +12.4% | 36.6% | 7.8 | 0 | 29.4% | 0 |
| ADX > 15 | 35 | +9.9% | 37.1% | 8.1 | 25 | 26.1% | 0 |
| ADX > 20 | 28 | +10.5% | 42.9% | 7.8 | 68 | 20.2% | 0 |
| ADX > 25 | 19 | -2.5% | 31.6% | 8.0 | 112 | 14.4% | 0 |
| ADX > 30 | 9 | -3.9% | 22.2% | 6.9 | 175 | 6.0% | 0 |

### L — 24/80 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +0.5% | 40.0% | 16.6 | 0 | 52.8% | 0 |
| ADX > 15 | 27 | -0.1% | 40.7% | 18.9 | 49 | 46.3% | 0 |
| ADX > 20 | 20 | -19.3% | 25.0% | 15.6 | 179 | 28.5% | 0 |
| ADX > 25 | 13 | -24.7% | 15.4% | 16.5 | 243 | 19.9% | 0 |
| ADX > 30 | 6 | -9.8% | 16.7% | 18.7 | 316 | 10.2% | 0 |

### LDOS — 8/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +76.2% | 51.4% | 11.7 | 0 | 37.6% | 1 |
| ADX > 15 | 32 | +79.7% | 53.1% | 11.8 | 19 | 35.1% | 1 |
| ADX > 20 | 30 | +57.0% | 46.7% | 11.1 | 47 | 31.3% | 1 |
| ADX > 25 | 25 | +39.1% | 48.0% | 11.2 | 85 | 26.2% | 1 |
| ADX > 30 | 18 | +10.0% | 44.4% | 10.9 | 144 | 18.4% | 1 |

### LEN — 26/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 13 | -1.1% | 15.4% | 16.8 | 0 | 20.2% | 0 |
| ADX > 15 | 11 | -1.2% | 18.2% | 18.6 | 11 | 18.8% | 0 |
| ADX > 20 | 10 | -5.6% | 20.0% | 17.0 | 36 | 15.4% | 0 |
| ADX > 25 | 6 | -6.5% | 33.3% | 18.3 | 77 | 10.0% | 0 |
| ADX > 30 | 3 | -4.1% | 33.3% | 16.0 | 119 | 4.4% | 0 |

### LH — 12/72 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 41 | +31.9% | 46.3% | 9.4 | 0 | 35.5% | 0 |
| ADX > 15 | 40 | +31.1% | 47.5% | 9.5 | 3 | 35.1% | 0 |
| ADX > 20 | 33 | -1.9% | 39.4% | 9.5 | 50 | 28.9% | 0 |
| ADX > 25 | 28 | -10.3% | 35.7% | 9.0 | 91 | 23.4% | 0 |
| ADX > 30 | 15 | +4.0% | 53.3% | 10.3 | 162 | 14.0% | 0 |

### LHX — 22/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +54.4% | 38.7% | 16.1 | 0 | 45.2% | 0 |
| ADX > 15 | 27 | +34.3% | 40.7% | 17.2 | 26 | 41.8% | 0 |
| ADX > 20 | 22 | +19.4% | 40.9% | 16.5 | 90 | 33.1% | 0 |
| ADX > 25 | 16 | -5.1% | 37.5% | 17.6 | 147 | 25.5% | 0 |
| ADX > 30 | 12 | -8.4% | 16.7% | 15.8 | 199 | 17.6% | 0 |

### LII — 28/60 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | -3.3% | 38.5% | 18.2 | 0 | 42.7% | 0 |
| ADX > 15 | 17 | -17.4% | 47.1% | 21.4 | 62 | 32.8% | 0 |
| ADX > 20 | 10 | -24.2% | 20.0% | 21.1 | 165 | 19.1% | 0 |
| ADX > 25 | 5 | -15.0% | 20.0% | 19.8 | 236 | 9.3% | 0 |
| ADX > 30 | 1 | -1.2% | 0.0% | 35.0 | 282 | 3.2% | 0 |

### LIN — 20/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 36 | +14.4% | 41.7% | 13.6 | 0 | 44.3% | 0 |
| ADX > 15 | 21 | +15.1% | 57.1% | 17.0 | 90 | 31.8% | 0 |
| ADX > 20 | 14 | +16.9% | 57.1% | 16.2 | 158 | 20.3% | 0 |
| ADX > 25 | 11 | +13.7% | 54.5% | 17.2 | 180 | 16.8% | 0 |
| ADX > 30 | 6 | -0.7% | 33.3% | 19.0 | 231 | 10.0% | 0 |

### LITE — 22/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +446.0% | 50.0% | 24.3 | 0 | 52.5% | 0 |
| ADX > 15 | 23 | +397.2% | 47.8% | 24.3 | 17 | 50.3% | 0 |
| ADX > 20 | 18 | +289.4% | 55.6% | 29.1 | 34 | 47.2% | 0 |
| ADX > 25 | 16 | +111.8% | 37.5% | 28.3 | 75 | 41.2% | 0 |
| ADX > 30 | 10 | +136.3% | 40.0% | 35.1 | 149 | 31.4% | 0 |

### LLY — 12/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 38 | +32.5% | 23.7% | 10.3 | 0 | 35.5% | 0 |
| ADX > 15 | 31 | +45.3% | 25.8% | 11.5 | 25 | 32.2% | 0 |
| ADX > 20 | 27 | +9.7% | 22.2% | 11.0 | 63 | 27.1% | 0 |
| ADX > 25 | 17 | +11.4% | 29.4% | 13.6 | 110 | 20.9% | 0 |
| ADX > 30 | 8 | +3.8% | 37.5% | 18.3 | 170 | 12.9% | 0 |

### LMT — 16/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +52.7% | 40.0% | 16.7 | 0 | 37.9% | 0 |
| ADX > 15 | 18 | +55.1% | 55.6% | 19.5 | 43 | 32.2% | 0 |
| ADX > 20 | 11 | +51.2% | 72.7% | 24.2 | 97 | 24.9% | 0 |
| ADX > 25 | 9 | +24.9% | 55.6% | 24.2 | 130 | 20.5% | 0 |
| ADX > 30 | 6 | +25.6% | 83.3% | 26.7 | 170 | 15.2% | 0 |

### LNT — 8/62 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 51 | +12.5% | 49.0% | 7.7 | 0 | 36.7% | 0 |
| ADX > 15 | 38 | +8.9% | 52.6% | 8.2 | 57 | 28.9% | 0 |
| ADX > 20 | 29 | -8.0% | 44.8% | 7.9 | 107 | 21.7% | 0 |
| ADX > 25 | 20 | -2.8% | 40.0% | 7.5 | 165 | 14.0% | 0 |
| ADX > 30 | 11 | +1.2% | 45.5% | 7.7 | 210 | 8.0% | 0 |

### LOW — 12/80 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +34.9% | 38.9% | 14.7 | 0 | 23.9% | 0 |
| ADX > 15 | 17 | +36.5% | 41.2% | 14.7 | 10 | 22.6% | 0 |
| ADX > 20 | 14 | +13.8% | 42.9% | 15.8 | 29 | 20.1% | 0 |
| ADX > 25 | 10 | +4.0% | 40.0% | 15.6 | 74 | 14.1% | 0 |
| ADX > 30 | 7 | +1.4% | 42.9% | 15.3 | 106 | 9.8% | 0 |

### LRCX — 26/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +206.9% | 47.8% | 22.7 | 0 | 46.8% | 0 |
| ADX > 15 | 21 | +134.3% | 52.4% | 23.0 | 24 | 43.6% | 0 |
| ADX > 20 | 11 | +93.2% | 54.5% | 35.5 | 82 | 35.5% | 0 |
| ADX > 25 | 9 | +21.6% | 44.4% | 31.7 | 155 | 25.8% | 0 |
| ADX > 30 | 5 | +3.4% | 40.0% | 30.2 | 245 | 13.8% | 0 |

### LULU — 26/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 9 | +44.0% | 55.6% | 25.7 | 0 | 20.7% | 0 |
| ADX > 15 | 7 | +45.7% | 71.4% | 30.4 | 4 | 19.0% | 0 |
| ADX > 20 | 7 | +26.3% | 71.4% | 29.3 | 10 | 18.2% | 0 |
| ADX > 25 | 6 | +3.9% | 50.0% | 29.3 | 31 | 15.4% | 0 |
| ADX > 30 | 5 | -30.9% | 0.0% | 23.0 | 71 | 10.1% | 0 |

### LUV — 12/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 38 | +27.8% | 36.8% | 10.1 | 0 | 34.4% | 0 |
| ADX > 15 | 32 | +25.9% | 37.5% | 10.8 | 26 | 31.0% | 0 |
| ADX > 20 | 27 | +2.2% | 33.3% | 10.4 | 66 | 25.1% | 0 |
| ADX > 25 | 20 | -8.1% | 35.0% | 10.1 | 118 | 18.2% | 0 |
| ADX > 30 | 14 | -18.2% | 28.6% | 10.0 | 161 | 12.5% | 0 |

### LVS — 16/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +39.9% | 50.0% | 10.8 | 0 | 23.4% | 0 |
| ADX > 15 | 24 | +41.0% | 50.0% | 10.6 | 2 | 23.1% | 0 |
| ADX > 20 | 20 | +34.4% | 55.0% | 11.4 | 18 | 21.0% | 0 |
| ADX > 25 | 17 | +9.6% | 47.1% | 11.1 | 36 | 17.3% | 0 |
| ADX > 30 | 15 | +8.0% | 46.7% | 11.6 | 47 | 15.8% | 0 |

### LYB — 22/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 9 | +39.5% | 22.2% | 19.0 | 0 | 16.1% | 0 |
| ADX > 15 | 7 | +38.1% | 28.6% | 19.9 | 23 | 13.0% | 0 |
| ADX > 20 | 4 | +45.5% | 50.0% | 29.3 | 39 | 10.9% | 0 |
| ADX > 25 | 2 | +49.5% | 100.0% | 53.0 | 48 | 9.7% | 0 |
| ADX > 30 | 2 | -1.2% | 50.0% | 19.0 | 96 | 3.3% | 0 |

### LYV — 14/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +45.4% | 33.3% | 14.3 | 0 | 39.0% | 0 |
| ADX > 15 | 26 | +24.3% | 34.6% | 14.6 | 32 | 34.7% | 0 |
| ADX > 20 | 15 | +30.5% | 46.7% | 17.1 | 117 | 23.4% | 0 |
| ADX > 25 | 11 | +19.4% | 36.4% | 17.7 | 158 | 18.0% | 0 |
| ADX > 30 | 6 | +20.6% | 50.0% | 20.2 | 209 | 11.2% | 0 |

### MA — 10/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +9.7% | 41.0% | 10.7 | 0 | 37.9% | 0 |
| ADX > 15 | 35 | +2.9% | 37.1% | 11.1 | 20 | 35.1% | 0 |
| ADX > 20 | 29 | -2.6% | 34.5% | 10.7 | 73 | 28.1% | 0 |
| ADX > 25 | 20 | -3.4% | 30.0% | 11.2 | 130 | 20.5% | 0 |
| ADX > 30 | 10 | -8.2% | 10.0% | 10.2 | 215 | 9.2% | 0 |

### MAA — 30/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +2.6% | 52.4% | 16.8 | 0 | 32.0% | 0 |
| ADX > 15 | 15 | +5.4% | 53.3% | 18.5 | 37 | 25.7% | 0 |
| ADX > 20 | 11 | -1.1% | 45.5% | 21.2 | 71 | 21.1% | 0 |
| ADX > 25 | 6 | -13.9% | 16.7% | 21.2 | 143 | 11.6% | 0 |
| ADX > 30 | 3 | -0.0% | 33.3% | 24.7 | 178 | 6.9% | 0 |

### MAR — 16/74 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +31.4% | 50.0% | 15.5 | 0 | 36.6% | 0 |
| ADX > 15 | 25 | +24.2% | 52.0% | 15.7 | 7 | 35.6% | 0 |
| ADX > 20 | 22 | -2.3% | 40.9% | 14.9 | 48 | 29.7% | 0 |
| ADX > 25 | 18 | -18.7% | 33.3% | 15.0 | 90 | 24.1% | 0 |
| ADX > 30 | 10 | -20.2% | 20.0% | 13.4 | 177 | 12.4% | 0 |

### MAS — 24/56 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +39.7% | 47.8% | 17.7 | 0 | 36.8% | 0 |
| ADX > 15 | 22 | +16.7% | 45.5% | 17.2 | 20 | 34.2% | 0 |
| ADX > 20 | 17 | +16.6% | 41.2% | 19.3 | 53 | 29.8% | 0 |
| ADX > 25 | 13 | +19.8% | 53.8% | 20.9 | 94 | 24.3% | 0 |
| ADX > 30 | 9 | -6.9% | 44.4% | 21.4 | 144 | 17.7% | 0 |

### MCD — 14/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +0.5% | 34.8% | 14.2 | 0 | 29.7% | 0 |
| ADX > 15 | 17 | +2.6% | 29.4% | 16.8 | 32 | 25.4% | 0 |
| ADX > 20 | 12 | -2.7% | 25.0% | 19.0 | 70 | 20.3% | 0 |
| ADX > 25 | 6 | +10.5% | 50.0% | 27.8 | 111 | 14.9% | 0 |
| ADX > 30 | 3 | +6.8% | 66.7% | 40.7 | 138 | 11.3% | 0 |

### MCHP — 30/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +23.3% | 31.6% | 16.7 | 0 | 29.0% | 0 |
| ADX > 15 | 18 | +25.2% | 33.3% | 16.8 | 2 | 27.4% | 0 |
| ADX > 20 | 11 | +22.5% | 36.4% | 24.1 | 22 | 23.8% | 0 |
| ADX > 25 | 8 | +35.3% | 50.0% | 29.0 | 45 | 20.7% | 0 |
| ADX > 30 | 5 | +36.3% | 60.0% | 40.0 | 64 | 17.6% | 0 |

### MCK — 24/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +72.8% | 51.9% | 19.9 | 0 | 50.5% | 1 |
| ADX > 15 | 20 | +60.3% | 55.0% | 22.9 | 56 | 43.1% | 1 |
| ADX > 20 | 14 | +28.1% | 57.1% | 25.1 | 121 | 33.1% | 1 |
| ADX > 25 | 11 | +1.6% | 36.4% | 20.8 | 215 | 20.9% | 0 |
| ADX > 30 | 7 | -7.6% | 42.9% | 16.4 | 294 | 10.4% | 0 |

### MCO — 28/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +16.2% | 42.3% | 18.3 | 0 | 44.3% | 1 |
| ADX > 15 | 18 | +9.8% | 44.4% | 23.4 | 32 | 38.2% | 0 |
| ADX > 20 | 12 | +13.2% | 41.7% | 29.3 | 80 | 31.8% | 0 |
| ADX > 25 | 10 | +7.3% | 40.0% | 21.7 | 152 | 19.9% | 0 |
| ADX > 30 | 3 | +12.0% | 66.7% | 40.7 | 220 | 10.9% | 0 |

### MDLZ — 24/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | -2.0% | 41.7% | 16.2 | 0 | 35.9% | 0 |
| ADX > 15 | 17 | +0.7% | 47.1% | 19.2 | 31 | 30.6% | 0 |
| ADX > 20 | 10 | +12.6% | 60.0% | 26.4 | 76 | 24.1% | 0 |
| ADX > 25 | 6 | -4.8% | 16.7% | 23.3 | 154 | 12.9% | 0 |
| ADX > 30 | 2 | -0.6% | 50.0% | 29.5 | 209 | 5.6% | 0 |

### MDT — 8/92 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 36 | +10.3% | 36.1% | 7.9 | 0 | 27.1% | 1 |
| ADX > 15 | 32 | +7.9% | 37.5% | 7.7 | 29 | 23.3% | 1 |
| ADX > 20 | 22 | +1.6% | 36.4% | 8.1 | 76 | 17.0% | 1 |
| ADX > 25 | 18 | -4.2% | 27.8% | 7.1 | 113 | 12.1% | 1 |
| ADX > 30 | 10 | -2.2% | 30.0% | 6.6 | 159 | 6.3% | 0 |

### MET — 28/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +8.7% | 36.4% | 19.1 | 0 | 38.8% | 0 |
| ADX > 15 | 17 | +10.7% | 35.3% | 21.1 | 39 | 33.1% | 0 |
| ADX > 20 | 14 | +11.3% | 42.9% | 24.8 | 49 | 31.9% | 0 |
| ADX > 25 | 8 | +11.5% | 75.0% | 32.0 | 100 | 23.5% | 0 |
| ADX > 30 | 6 | -5.6% | 50.0% | 26.3 | 161 | 14.2% | 0 |

### META — 20/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +42.5% | 34.8% | 14.8 | 0 | 31.1% | 0 |
| ADX > 15 | 20 | +14.7% | 25.0% | 15.6 | 22 | 28.2% | 0 |
| ADX > 20 | 15 | +24.7% | 33.3% | 15.6 | 72 | 21.5% | 0 |
| ADX > 25 | 11 | +34.1% | 45.5% | 15.7 | 112 | 16.1% | 0 |
| ADX > 30 | 8 | +20.4% | 50.0% | 16.1 | 142 | 12.1% | 0 |

### MGM — 26/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +18.2% | 44.4% | 18.6 | 0 | 30.1% | 0 |
| ADX > 15 | 13 | -4.2% | 30.8% | 20.3 | 40 | 23.7% | 0 |
| ADX > 20 | 10 | -14.0% | 20.0% | 20.8 | 76 | 18.9% | 0 |
| ADX > 25 | 7 | -17.1% | 14.3% | 21.3 | 118 | 13.3% | 0 |
| ADX > 30 | 3 | +2.8% | 33.3% | 33.7 | 152 | 8.8% | 0 |

### MKC — 18/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +9.6% | 39.1% | 14.8 | 0 | 31.0% | 0 |
| ADX > 15 | 21 | +16.2% | 42.9% | 15.3 | 10 | 29.3% | 0 |
| ADX > 20 | 16 | +8.1% | 37.5% | 16.1 | 50 | 23.5% | 0 |
| ADX > 25 | 6 | +0.3% | 16.7% | 20.5 | 142 | 11.3% | 0 |
| ADX > 30 | 4 | +1.8% | 25.0% | 21.5 | 164 | 8.4% | 0 |

### MLM — 14/96 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +5.9% | 43.3% | 9.6 | 0 | 27.3% | 0 |
| ADX > 15 | 23 | -4.6% | 39.1% | 9.2 | 55 | 19.9% | 0 |
| ADX > 20 | 14 | +0.3% | 28.6% | 9.3 | 110 | 12.6% | 0 |
| ADX > 25 | 9 | +0.8% | 33.3% | 9.0 | 146 | 7.8% | 0 |
| ADX > 30 | 6 | -0.0% | 33.3% | 9.7 | 165 | 5.3% | 0 |

### MMM — 14/64 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +55.0% | 43.3% | 14.2 | 0 | 39.0% | 0 |
| ADX > 15 | 24 | +50.7% | 45.8% | 16.4 | 24 | 35.8% | 0 |
| ADX > 20 | 19 | +12.3% | 52.6% | 15.6 | 88 | 27.3% | 0 |
| ADX > 25 | 11 | +18.6% | 81.8% | 19.0 | 150 | 19.0% | 0 |
| ADX > 30 | 10 | +15.7% | 60.0% | 17.7 | 172 | 16.1% | 0 |

### MNST — 14/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 33 | -29.3% | 42.4% | 13.8 | 0 | 41.9% | 0 |
| ADX > 15 | 30 | -31.2% | 43.3% | 14.0 | 24 | 38.7% | 0 |
| ADX > 20 | 23 | -42.2% | 39.1% | 15.0 | 75 | 31.3% | 0 |
| ADX > 25 | 17 | -39.7% | 41.2% | 14.6 | 138 | 22.6% | 0 |
| ADX > 30 | 13 | -47.3% | 30.8% | 11.7 | 203 | 14.0% | 0 |

### MO — 22/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +10.6% | 34.5% | 14.0 | 0 | 38.4% | 0 |
| ADX > 15 | 23 | +20.4% | 39.1% | 16.6 | 19 | 35.9% | 0 |
| ADX > 20 | 16 | +8.3% | 37.5% | 19.1 | 69 | 28.3% | 0 |
| ADX > 25 | 12 | +11.6% | 41.7% | 19.8 | 105 | 22.1% | 0 |
| ADX > 30 | 9 | +10.4% | 55.6% | 23.6 | 125 | 19.4% | 0 |

### MOS — 12/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | -1.1% | 26.7% | 8.4 | 0 | 23.8% | 1 |
| ADX > 15 | 27 | -6.2% | 22.2% | 8.0 | 23 | 20.7% | 1 |
| ADX > 20 | 17 | -0.9% | 29.4% | 9.1 | 71 | 14.4% | 1 |
| ADX > 25 | 7 | +17.2% | 57.1% | 13.6 | 117 | 8.5% | 0 |
| ADX > 30 | 4 | +6.8% | 25.0% | 15.0 | 140 | 5.5% | 0 |

### MPC — 10/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +65.1% | 35.7% | 9.0 | 0 | 35.6% | 1 |
| ADX > 15 | 37 | +63.9% | 37.8% | 9.3 | 24 | 32.4% | 1 |
| ADX > 20 | 36 | +31.9% | 36.1% | 8.6 | 46 | 29.5% | 1 |
| ADX > 25 | 24 | +28.2% | 33.3% | 9.0 | 111 | 20.9% | 1 |
| ADX > 30 | 16 | +16.6% | 31.3% | 9.9 | 154 | 15.2% | 1 |

### MPWR — 18/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 33 | +44.9% | 45.5% | 15.1 | 0 | 44.4% | 0 |
| ADX > 15 | 30 | +39.5% | 43.3% | 15.8 | 20 | 41.8% | 0 |
| ADX > 20 | 25 | +1.4% | 36.0% | 14.5 | 91 | 32.3% | 0 |
| ADX > 25 | 17 | -8.9% | 35.3% | 17.3 | 139 | 25.9% | 0 |
| ADX > 30 | 9 | +12.4% | 44.4% | 19.9 | 213 | 16.1% | 0 |

### MRK — 10/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +58.2% | 46.7% | 11.8 | 0 | 32.4% | 0 |
| ADX > 15 | 25 | +78.5% | 56.0% | 13.3 | 17 | 30.2% | 0 |
| ADX > 20 | 15 | +59.0% | 60.0% | 14.0 | 102 | 18.9% | 0 |
| ADX > 25 | 10 | +32.8% | 60.0% | 16.1 | 135 | 14.5% | 0 |
| ADX > 30 | 9 | +6.1% | 55.6% | 13.2 | 163 | 10.8% | 0 |

### MRNA — 8/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +416.0% | 50.0% | 10.2 | 0 | 22.1% | 1 |
| ADX > 15 | 24 | +370.1% | 50.0% | 10.0 | 5 | 21.4% | 1 |
| ADX > 20 | 23 | +64.0% | 43.5% | 8.8 | 29 | 18.2% | 1 |
| ADX > 25 | 17 | +35.4% | 35.3% | 8.3 | 72 | 12.5% | 1 |
| ADX > 30 | 15 | +8.5% | 33.3% | 7.3 | 94 | 9.6% | 1 |

### MRSH — 26/82 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | +5.6% | 47.1% | 16.5 | 0 | 25.4% | 0 |
| ADX > 15 | 16 | +2.2% | 43.8% | 16.7 | 9 | 24.1% | 0 |
| ADX > 20 | 12 | -2.3% | 33.3% | 12.8 | 84 | 14.1% | 0 |
| ADX > 25 | 7 | -5.6% | 28.6% | 11.1 | 136 | 7.2% | 0 |
| ADX > 30 | 4 | -8.6% | 25.0% | 11.5 | 158 | 4.3% | 0 |

### MS — 28/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +46.5% | 44.4% | 31.3 | 0 | 51.2% | 0 |
| ADX > 15 | 17 | +44.6% | 47.1% | 32.9 | 3 | 50.8% | 0 |
| ADX > 20 | 14 | +35.4% | 42.9% | 36.6 | 36 | 46.4% | 0 |
| ADX > 25 | 11 | -4.0% | 36.4% | 31.4 | 143 | 31.3% | 0 |
| ADX > 30 | 7 | +2.1% | 28.6% | 37.0 | 206 | 22.9% | 0 |

### MSCI — 30/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | -16.2% | 34.5% | 14.1 | 0 | 37.5% | 0 |
| ADX > 15 | 23 | -29.6% | 26.1% | 14.9 | 28 | 30.9% | 0 |
| ADX > 20 | 13 | -16.8% | 30.8% | 17.5 | 88 | 20.2% | 0 |
| ADX > 25 | 6 | -2.0% | 33.3% | 21.7 | 150 | 12.0% | 0 |
| ADX > 30 | 5 | -10.7% | 20.0% | 19.0 | 165 | 8.6% | 0 |

### MSFT — 8/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 36 | +33.6% | 55.6% | 9.8 | 0 | 33.5% | 1 |
| ADX > 15 | 34 | +8.1% | 50.0% | 9.9 | 13 | 31.8% | 1 |
| ADX > 20 | 29 | +1.0% | 44.8% | 8.6 | 72 | 23.9% | 1 |
| ADX > 25 | 20 | +0.0% | 50.0% | 9.1 | 120 | 17.6% | 1 |
| ADX > 30 | 16 | -2.1% | 50.0% | 8.5 | 151 | 13.4% | 1 |

### MSI — 10/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +63.7% | 51.7% | 15.3 | 0 | 42.7% | 1 |
| ADX > 15 | 29 | +50.2% | 51.7% | 14.4 | 16 | 40.4% | 1 |
| ADX > 20 | 26 | +28.7% | 50.0% | 13.7 | 63 | 34.2% | 1 |
| ADX > 25 | 22 | +20.9% | 50.0% | 12.5 | 119 | 26.7% | 1 |
| ADX > 30 | 12 | +20.0% | 50.0% | 14.4 | 189 | 17.4% | 1 |

### MTB — 12/56 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 38 | +52.6% | 44.7% | 11.7 | 0 | 40.6% | 0 |
| ADX > 15 | 31 | +61.6% | 48.4% | 13.3 | 20 | 37.9% | 0 |
| ADX > 20 | 25 | +23.5% | 48.0% | 13.2 | 76 | 30.5% | 0 |
| ADX > 25 | 20 | -4.7% | 35.0% | 12.1 | 139 | 22.1% | 0 |
| ADX > 30 | 16 | -17.3% | 18.8% | 9.7 | 198 | 14.2% | 0 |

### MTD — 24/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +4.6% | 39.3% | 11.2 | 0 | 28.6% | 0 |
| ADX > 15 | 22 | +7.4% | 45.5% | 12.2 | 27 | 25.0% | 0 |
| ADX > 20 | 14 | -24.6% | 42.9% | 11.0 | 109 | 14.1% | 0 |
| ADX > 25 | 7 | -3.6% | 57.1% | 15.1 | 141 | 9.8% | 0 |
| ADX > 30 | 4 | -16.6% | 0.0% | 11.3 | 184 | 4.1% | 0 |

### MU — 24/64 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +670.8% | 36.4% | 24.5 | 0 | 49.1% | 0 |
| ADX > 15 | 15 | +772.8% | 53.3% | 34.5 | 12 | 47.2% | 0 |
| ADX > 20 | 13 | +635.3% | 61.5% | 36.5 | 41 | 43.4% | 0 |
| ADX > 25 | 9 | +511.1% | 77.8% | 44.0 | 95 | 35.8% | 0 |
| ADX > 30 | 8 | +79.5% | 37.5% | 32.8 | 186 | 23.7% | 0 |

### NCLH — 8/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 38 | +84.7% | 44.7% | 9.0 | 0 | 31.6% | 0 |
| ADX > 15 | 36 | +25.0% | 38.9% | 8.3 | 28 | 27.5% | 0 |
| ADX > 20 | 25 | +31.4% | 48.0% | 8.7 | 87 | 19.7% | 0 |
| ADX > 25 | 18 | +13.9% | 44.4% | 9.2 | 123 | 14.9% | 0 |
| ADX > 30 | 14 | -1.6% | 28.6% | 8.1 | 157 | 10.4% | 0 |

### NDAQ — 16/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 33 | +47.2% | 39.4% | 14.8 | 0 | 44.4% | 0 |
| ADX > 15 | 29 | +50.9% | 41.4% | 15.5 | 26 | 41.0% | 0 |
| ADX > 20 | 23 | +39.8% | 39.1% | 16.8 | 67 | 35.1% | 0 |
| ADX > 25 | 15 | +21.1% | 40.0% | 19.7 | 130 | 26.7% | 0 |
| ADX > 30 | 13 | -2.3% | 23.1% | 15.6 | 192 | 18.5% | 0 |

### NDSN — 22/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +12.3% | 37.1% | 13.9 | 0 | 43.2% | 0 |
| ADX > 15 | 27 | +14.5% | 37.0% | 14.7 | 55 | 35.9% | 0 |
| ADX > 20 | 14 | +13.5% | 42.9% | 19.5 | 137 | 24.7% | 0 |
| ADX > 25 | 9 | +22.7% | 44.4% | 22.4 | 184 | 18.5% | 0 |
| ADX > 30 | 7 | +18.0% | 42.9% | 22.7 | 214 | 14.5% | 0 |

### NEE — 22/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +19.4% | 28.6% | 17.3 | 0 | 34.0% | 0 |
| ADX > 15 | 18 | +16.4% | 22.2% | 18.4 | 24 | 30.9% | 0 |
| ADX > 20 | 14 | +19.0% | 28.6% | 18.7 | 62 | 24.9% | 0 |
| ADX > 25 | 8 | +29.6% | 50.0% | 27.5 | 94 | 20.6% | 0 |
| ADX > 30 | 7 | +1.5% | 28.6% | 21.9 | 142 | 14.2% | 0 |

### NEM — 16/62 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +78.8% | 48.1% | 18.9 | 0 | 46.7% | 0 |
| ADX > 15 | 27 | +76.2% | 48.1% | 18.9 | 1 | 46.5% | 0 |
| ADX > 20 | 24 | +20.5% | 50.0% | 16.5 | 72 | 37.1% | 0 |
| ADX > 25 | 15 | +8.7% | 46.7% | 17.8 | 167 | 24.5% | 0 |
| ADX > 30 | 10 | +15.7% | 40.0% | 18.2 | 226 | 16.6% | 0 |

### NFLX — 26/64 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | +70.4% | 64.3% | 30.6 | 0 | 38.8% | 1 |
| ADX > 15 | 14 | +70.4% | 64.3% | 30.6 | 0 | 38.8% | 1 |
| ADX > 20 | 12 | +69.7% | 75.0% | 33.8 | 17 | 36.6% | 1 |
| ADX > 25 | 10 | +75.1% | 90.0% | 38.8 | 29 | 34.8% | 0 |
| ADX > 30 | 9 | +63.1% | 88.9% | 37.3 | 65 | 30.1% | 0 |

### NI — 22/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +12.9% | 34.3% | 15.7 | 0 | 51.2% | 0 |
| ADX > 15 | 27 | -0.9% | 29.6% | 15.3 | 97 | 38.3% | 0 |
| ADX > 20 | 14 | +12.5% | 35.7% | 20.1 | 183 | 26.3% | 0 |
| ADX > 25 | 9 | +16.5% | 44.4% | 25.1 | 224 | 20.9% | 0 |
| ADX > 30 | 5 | +15.5% | 60.0% | 34.2 | 260 | 16.1% | 0 |

### NKE — 8/62 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | -11.3% | 14.3% | 6.5 | 0 | 12.4% | 0 |
| ADX > 15 | 16 | -15.7% | 18.8% | 7.1 | 14 | 10.5% | 0 |
| ADX > 20 | 10 | -10.1% | 20.0% | 8.9 | 31 | 8.2% | 0 |
| ADX > 25 | 8 | -21.7% | 12.5% | 7.9 | 48 | 6.0% | 0 |
| ADX > 30 | 8 | -25.5% | 0.0% | 5.8 | 59 | 4.5% | 0 |

### NOC — 16/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +34.6% | 44.0% | 14.0 | 0 | 32.0% | 0 |
| ADX > 15 | 22 | +26.5% | 45.5% | 14.2 | 28 | 28.3% | 0 |
| ADX > 20 | 16 | -3.7% | 43.8% | 14.8 | 79 | 21.5% | 0 |
| ADX > 25 | 14 | -13.9% | 35.7% | 13.8 | 107 | 17.8% | 0 |
| ADX > 30 | 9 | -2.6% | 44.4% | 15.2 | 144 | 12.9% | 0 |

### NOW — 10/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 33 | +30.8% | 42.4% | 9.6 | 0 | 30.3% | 1 |
| ADX > 15 | 27 | +6.0% | 33.3% | 9.3 | 42 | 24.7% | 1 |
| ADX > 20 | 18 | +31.3% | 44.4% | 11.4 | 80 | 19.7% | 1 |
| ADX > 25 | 15 | +4.8% | 46.7% | 11.5 | 107 | 16.1% | 1 |
| ADX > 30 | 10 | +7.7% | 40.0% | 12.0 | 145 | 11.3% | 0 |

### NRG — 26/92 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | -0.2% | 28.6% | 13.7 | 0 | 35.4% | 0 |
| ADX > 15 | 18 | +36.7% | 27.8% | 18.1 | 38 | 30.3% | 0 |
| ADX > 20 | 14 | +5.5% | 28.6% | 17.6 | 83 | 22.7% | 0 |
| ADX > 25 | 9 | +4.9% | 22.2% | 20.1 | 127 | 16.9% | 0 |
| ADX > 30 | 6 | +10.9% | 33.3% | 25.5 | 146 | 14.4% | 0 |

### NSC — 30/56 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +30.7% | 45.0% | 23.8 | 0 | 43.2% | 0 |
| ADX > 15 | 15 | +19.4% | 40.0% | 28.7 | 23 | 38.8% | 0 |
| ADX > 20 | 14 | +6.8% | 21.4% | 27.9 | 46 | 35.5% | 0 |
| ADX > 25 | 10 | +1.8% | 30.0% | 30.4 | 103 | 27.9% | 0 |
| ADX > 30 | 5 | +8.6% | 60.0% | 38.4 | 180 | 17.7% | 0 |

### NTAP — 16/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +88.1% | 38.5% | 16.4 | 0 | 39.4% | 0 |
| ADX > 15 | 22 | +107.9% | 40.9% | 17.7 | 21 | 36.0% | 0 |
| ADX > 20 | 19 | +116.0% | 42.1% | 18.3 | 49 | 32.0% | 0 |
| ADX > 25 | 13 | +73.3% | 53.8% | 20.2 | 102 | 24.3% | 0 |
| ADX > 30 | 9 | +46.0% | 33.3% | 22.0 | 147 | 18.4% | 0 |

### NTRS — 30/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +80.8% | 54.5% | 25.2 | 0 | 51.1% | 0 |
| ADX > 15 | 22 | +56.7% | 45.5% | 24.0 | 19 | 48.5% | 0 |
| ADX > 20 | 8 | +66.3% | 62.5% | 43.3 | 145 | 31.6% | 0 |
| ADX > 25 | 5 | +37.4% | 80.0% | 57.0 | 180 | 25.9% | 0 |
| ADX > 30 | 4 | +38.3% | 100.0% | 60.8 | 208 | 22.2% | 0 |

### NUE — 26/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 13 | +75.4% | 61.5% | 27.3 | 0 | 31.8% | 0 |
| ADX > 15 | 12 | +78.3% | 66.7% | 29.5 | 1 | 31.6% | 0 |
| ADX > 20 | 11 | +54.9% | 45.5% | 29.7 | 23 | 28.9% | 0 |
| ADX > 25 | 8 | +33.3% | 50.0% | 31.6 | 69 | 22.7% | 0 |
| ADX > 30 | 7 | +21.3% | 28.6% | 25.7 | 118 | 16.2% | 0 |

### NVDA — 10/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +73.7% | 48.7% | 11.6 | 0 | 41.0% | 1 |
| ADX > 15 | 30 | +126.2% | 56.7% | 13.2 | 37 | 36.0% | 1 |
| ADX > 20 | 22 | +35.7% | 50.0% | 12.8 | 117 | 25.7% | 0 |
| ADX > 25 | 15 | +58.5% | 66.7% | 14.7 | 161 | 19.8% | 0 |
| ADX > 30 | 12 | +34.2% | 50.0% | 15.5 | 185 | 16.6% | 0 |

### NWS — 12/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +16.0% | 41.0% | 10.7 | 0 | 37.9% | 0 |
| ADX > 15 | 33 | +7.5% | 45.5% | 10.9 | 37 | 33.0% | 0 |
| ADX > 20 | 27 | +0.8% | 37.0% | 9.5 | 107 | 23.7% | 0 |
| ADX > 25 | 18 | -11.4% | 33.3% | 8.6 | 177 | 14.4% | 0 |
| ADX > 30 | 9 | -9.8% | 22.2% | 9.8 | 225 | 8.0% | 0 |

### NWSA — 8/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 58 | +2.7% | 41.4% | 7.2 | 0 | 37.8% | 0 |
| ADX > 15 | 40 | +10.3% | 45.0% | 7.7 | 77 | 27.5% | 0 |
| ADX > 20 | 31 | -3.0% | 38.7% | 7.3 | 133 | 20.1% | 0 |
| ADX > 25 | 25 | -10.6% | 32.0% | 5.8 | 180 | 13.2% | 0 |
| ADX > 30 | 12 | -2.3% | 41.7% | 7.8 | 216 | 8.4% | 0 |

### NXPI — 12/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +35.9% | 34.6% | 10.9 | 0 | 26.2% | 0 |
| ADX > 15 | 22 | +16.0% | 36.4% | 11.6 | 20 | 23.5% | 0 |
| ADX > 20 | 17 | +50.1% | 47.1% | 12.9 | 45 | 20.2% | 0 |
| ADX > 25 | 10 | +24.6% | 40.0% | 14.4 | 97 | 13.3% | 0 |
| ADX > 30 | 8 | -3.7% | 12.5% | 12.6 | 127 | 9.3% | 0 |

### O — 30/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +12.5% | 36.4% | 21.5 | 0 | 43.8% | 0 |
| ADX > 15 | 15 | +18.9% | 40.0% | 27.8 | 33 | 37.9% | 0 |
| ADX > 20 | 8 | +16.1% | 37.5% | 33.8 | 114 | 24.5% | 0 |
| ADX > 25 | 6 | +18.9% | 50.0% | 35.2 | 140 | 19.0% | 0 |
| ADX > 30 | 4 | +25.1% | 75.0% | 48.5 | 151 | 17.6% | 0 |

### ODFL — 12/88 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +19.3% | 41.4% | 10.4 | 0 | 27.5% | 0 |
| ADX > 15 | 24 | +20.5% | 41.7% | 11.2 | 23 | 24.5% | 0 |
| ADX > 20 | 18 | +19.3% | 38.9% | 10.7 | 78 | 17.2% | 0 |
| ADX > 25 | 17 | -24.5% | 17.6% | 8.0 | 116 | 12.1% | 0 |
| ADX > 30 | 13 | -15.7% | 15.4% | 6.9 | 147 | 8.0% | 0 |

### OKE — 14/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +9.5% | 53.3% | 12.7 | 0 | 35.2% | 1 |
| ADX > 15 | 27 | -3.0% | 44.4% | 12.2 | 35 | 29.9% | 1 |
| ADX > 20 | 18 | +17.6% | 55.6% | 13.3 | 91 | 21.9% | 0 |
| ADX > 25 | 14 | +2.6% | 50.0% | 13.3 | 127 | 17.2% | 0 |
| ADX > 30 | 10 | -12.4% | 30.0% | 12.1 | 172 | 11.2% | 0 |

### OMC — 8/92 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | -11.7% | 41.0% | 7.0 | 0 | 25.3% | 0 |
| ADX > 15 | 39 | -26.2% | 38.5% | 6.1 | 22 | 22.1% | 0 |
| ADX > 20 | 23 | -9.0% | 43.5% | 6.0 | 95 | 12.4% | 0 |
| ADX > 25 | 15 | -6.8% | 46.7% | 5.9 | 127 | 8.1% | 0 |
| ADX > 30 | 3 | -1.3% | 66.7% | 5.7 | 175 | 1.7% | 0 |

### ON — 28/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 15 | +56.6% | 40.0% | 20.3 | 0 | 27.7% | 0 |
| ADX > 15 | 12 | +79.0% | 50.0% | 23.2 | 14 | 25.5% | 0 |
| ADX > 20 | 12 | +17.1% | 50.0% | 20.8 | 22 | 23.0% | 0 |
| ADX > 25 | 7 | +54.5% | 71.4% | 26.7 | 55 | 17.0% | 0 |
| ADX > 30 | 6 | +9.5% | 50.0% | 23.5 | 86 | 12.9% | 0 |

### ORCL — 10/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +133.6% | 48.6% | 9.3 | 0 | 30.2% | 0 |
| ADX > 15 | 33 | +114.0% | 48.5% | 9.5 | 8 | 29.1% | 0 |
| ADX > 20 | 32 | +85.8% | 46.9% | 8.9 | 28 | 26.5% | 0 |
| ADX > 25 | 27 | +21.8% | 37.0% | 8.7 | 63 | 21.8% | 0 |
| ADX > 30 | 18 | +12.6% | 50.0% | 8.3 | 124 | 13.7% | 0 |

### ORLY — 30/82 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +16.8% | 42.9% | 17.3 | 0 | 33.9% | 0 |
| ADX > 15 | 17 | +22.3% | 47.1% | 20.8 | 7 | 33.0% | 0 |
| ADX > 20 | 14 | +13.4% | 50.0% | 23.1 | 28 | 30.2% | 0 |
| ADX > 25 | 11 | +0.4% | 27.3% | 23.1 | 80 | 23.3% | 0 |
| ADX > 30 | 8 | -0.6% | 37.5% | 24.1 | 121 | 17.8% | 0 |

### OTIS — 26/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | -10.9% | 29.2% | 15.5 | 0 | 34.6% | 0 |
| ADX > 15 | 17 | -5.3% | 29.4% | 19.2 | 24 | 30.6% | 0 |
| ADX > 20 | 12 | -4.8% | 25.0% | 22.8 | 58 | 25.4% | 0 |
| ADX > 25 | 6 | +5.3% | 33.3% | 31.3 | 113 | 17.4% | 0 |
| ADX > 30 | 4 | +11.4% | 75.0% | 27.5 | 166 | 10.4% | 0 |

### OXY — 24/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +21.4% | 30.4% | 11.1 | 0 | 25.5% | 1 |
| ADX > 15 | 18 | +10.0% | 22.2% | 11.4 | 33 | 20.7% | 1 |
| ADX > 20 | 8 | +23.0% | 37.5% | 18.0 | 82 | 14.2% | 1 |
| ADX > 25 | 5 | +22.0% | 40.0% | 23.2 | 113 | 10.4% | 0 |
| ADX > 30 | 3 | +24.2% | 33.3% | 27.0 | 134 | 7.6% | 0 |

### PANW — 8/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 44 | +105.9% | 50.0% | 9.0 | 0 | 36.7% | 1 |
| ADX > 15 | 41 | +65.1% | 46.3% | 8.3 | 37 | 31.8% | 1 |
| ADX > 20 | 28 | +47.7% | 53.6% | 8.9 | 104 | 22.6% | 1 |
| ADX > 25 | 19 | +38.0% | 52.6% | 8.6 | 165 | 14.6% | 0 |
| ADX > 30 | 16 | +23.8% | 43.8% | 7.6 | 194 | 10.8% | 0 |

### PAYX — 16/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +3.6% | 36.4% | 14.2 | 0 | 29.7% | 1 |
| ADX > 15 | 20 | +0.5% | 30.0% | 14.1 | 20 | 27.0% | 1 |
| ADX > 20 | 14 | -5.9% | 35.7% | 13.4 | 81 | 18.5% | 1 |
| ADX > 25 | 9 | -1.6% | 44.4% | 14.9 | 118 | 13.6% | 1 |
| ADX > 30 | 6 | -6.7% | 50.0% | 14.0 | 152 | 9.0% | 1 |

### PCAR — 20/96 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +25.2% | 30.0% | 17.1 | 0 | 31.3% | 0 |
| ADX > 15 | 20 | +21.5% | 30.0% | 16.9 | 3 | 30.9% | 0 |
| ADX > 20 | 14 | +28.9% | 42.9% | 20.9 | 32 | 27.0% | 0 |
| ADX > 25 | 10 | +27.3% | 60.0% | 24.9 | 66 | 22.5% | 0 |
| ADX > 30 | 7 | +14.9% | 42.9% | 25.3 | 104 | 16.5% | 0 |

### PCG — 8/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 36 | +2.1% | 33.3% | 7.2 | 0 | 24.1% | 0 |
| ADX > 15 | 35 | -0.1% | 31.4% | 7.1 | 4 | 23.5% | 0 |
| ADX > 20 | 29 | -7.4% | 27.6% | 6.0 | 55 | 16.8% | 0 |
| ADX > 25 | 22 | -9.0% | 27.3% | 4.8 | 103 | 10.4% | 0 |
| ADX > 30 | 8 | -9.3% | 12.5% | 5.4 | 149 | 4.3% | 0 |

### PEG — 20/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +13.9% | 37.5% | 11.5 | 0 | 34.4% | 0 |
| ADX > 15 | 28 | +1.8% | 28.6% | 11.3 | 36 | 29.7% | 0 |
| ADX > 20 | 16 | +3.5% | 31.3% | 13.6 | 103 | 20.3% | 0 |
| ADX > 25 | 13 | -5.2% | 30.8% | 13.0 | 138 | 15.7% | 0 |
| ADX > 30 | 8 | -12.0% | 25.0% | 11.5 | 194 | 8.2% | 0 |

### PEP — 8/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | -4.0% | 30.0% | 7.7 | 0 | 21.3% | 0 |
| ADX > 15 | 25 | -2.1% | 32.0% | 7.5 | 28 | 17.4% | 0 |
| ADX > 20 | 19 | -10.7% | 31.6% | 7.4 | 61 | 13.0% | 0 |
| ADX > 25 | 13 | -14.4% | 23.1% | 5.7 | 104 | 7.3% | 0 |
| ADX > 30 | 6 | -14.6% | 0.0% | 4.7 | 138 | 2.8% | 0 |

### PFE — 26/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | -10.2% | 16.0% | 8.7 | 0 | 21.8% | 1 |
| ADX > 15 | 19 | -13.7% | 21.1% | 9.3 | 29 | 17.8% | 1 |
| ADX > 20 | 6 | -5.4% | 16.7% | 14.5 | 77 | 10.1% | 1 |
| ADX > 25 | 3 | +0.1% | 33.3% | 15.7 | 106 | 6.3% | 1 |
| ADX > 30 | 2 | -7.3% | 0.0% | 13.5 | 124 | 3.9% | 1 |

### PFG — 10/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 40 | +14.1% | 37.5% | 10.8 | 0 | 39.1% | 0 |
| ADX > 15 | 37 | +16.8% | 40.5% | 11.1 | 16 | 37.0% | 0 |
| ADX > 20 | 27 | -6.4% | 40.7% | 10.6 | 99 | 25.9% | 0 |
| ADX > 25 | 18 | +8.9% | 50.0% | 10.8 | 160 | 17.8% | 0 |
| ADX > 30 | 11 | -1.5% | 54.5% | 7.6 | 236 | 7.7% | 0 |

### PG — 14/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | -12.9% | 36.0% | 9.8 | 0 | 22.9% | 0 |
| ADX > 15 | 14 | +1.6% | 50.0% | 13.7 | 40 | 17.6% | 0 |
| ADX > 20 | 9 | -1.0% | 55.6% | 16.3 | 70 | 13.6% | 0 |
| ADX > 25 | 6 | -9.5% | 33.3% | 14.3 | 114 | 7.7% | 0 |
| ADX > 30 | 5 | -3.2% | 40.0% | 13.4 | 126 | 6.1% | 0 |

### PGR — 10/74 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +14.9% | 29.0% | 11.4 | 0 | 32.0% | 1 |
| ADX > 15 | 26 | +16.1% | 30.8% | 12.3 | 18 | 29.1% | 1 |
| ADX > 20 | 18 | +1.5% | 27.8% | 13.4 | 74 | 21.9% | 0 |
| ADX > 25 | 14 | +3.1% | 35.7% | 14.6 | 96 | 19.0% | 0 |
| ADX > 30 | 9 | +0.2% | 44.4% | 15.6 | 139 | 13.3% | 0 |

### PH — 18/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +66.3% | 61.3% | 18.3 | 0 | 51.3% | 0 |
| ADX > 15 | 27 | +75.3% | 66.7% | 20.6 | 8 | 50.0% | 0 |
| ADX > 20 | 24 | +25.0% | 58.3% | 20.0 | 59 | 43.1% | 0 |
| ADX > 25 | 14 | +34.5% | 64.3% | 26.1 | 133 | 33.2% | 0 |
| ADX > 30 | 10 | +22.5% | 70.0% | 27.6 | 196 | 24.9% | 0 |

### PHM — 12/56 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 41 | +3.2% | 39.0% | 9.0 | 0 | 33.4% | 0 |
| ADX > 15 | 33 | +11.4% | 39.4% | 10.2 | 20 | 30.7% | 0 |
| ADX > 20 | 25 | -7.3% | 32.0% | 10.6 | 72 | 23.8% | 0 |
| ADX > 25 | 20 | -11.2% | 40.0% | 9.2 | 126 | 16.6% | 0 |
| ADX > 30 | 9 | +3.0% | 44.4% | 13.8 | 168 | 11.0% | 0 |

### PKG — 18/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +44.2% | 45.2% | 16.3 | 0 | 45.9% | 0 |
| ADX > 15 | 26 | +17.7% | 38.5% | 16.8 | 42 | 40.3% | 0 |
| ADX > 20 | 19 | +14.4% | 42.1% | 16.9 | 120 | 29.8% | 0 |
| ADX > 25 | 14 | +4.5% | 28.6% | 17.6 | 173 | 22.6% | 0 |
| ADX > 30 | 9 | -1.5% | 33.3% | 18.2 | 229 | 15.2% | 0 |

### PLD — 30/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +9.7% | 47.6% | 20.4 | 0 | 39.2% | 0 |
| ADX > 15 | 19 | +9.3% | 42.1% | 21.4 | 17 | 37.0% | 0 |
| ADX > 20 | 10 | +11.5% | 60.0% | 28.9 | 95 | 26.5% | 0 |
| ADX > 25 | 8 | +0.4% | 50.0% | 26.8 | 148 | 19.4% | 0 |
| ADX > 30 | 5 | +1.1% | 40.0% | 23.8 | 213 | 10.8% | 0 |

### PLTR — 10/74 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 37 | +189.6% | 56.8% | 11.3 | 0 | 38.6% | 1 |
| ADX > 15 | 32 | +124.2% | 53.1% | 11.9 | 23 | 35.5% | 1 |
| ADX > 20 | 27 | +64.5% | 44.4% | 11.3 | 76 | 28.5% | 1 |
| ADX > 25 | 19 | +89.0% | 52.6% | 11.6 | 135 | 20.6% | 1 |
| ADX > 30 | 15 | +59.5% | 40.0% | 10.5 | 173 | 15.0% | 1 |

### PM — 8/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +73.8% | 42.9% | 10.1 | 0 | 39.4% | 0 |
| ADX > 15 | 38 | +74.3% | 44.7% | 10.6 | 21 | 36.6% | 0 |
| ADX > 20 | 29 | +64.3% | 44.8% | 11.4 | 67 | 30.5% | 0 |
| ADX > 25 | 21 | +47.8% | 52.4% | 12.2 | 119 | 23.5% | 0 |
| ADX > 30 | 18 | +26.0% | 38.9% | 10.5 | 165 | 17.4% | 0 |

### PNC — 10/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +61.0% | 38.5% | 11.1 | 0 | 39.4% | 0 |
| ADX > 15 | 37 | +46.6% | 40.5% | 10.6 | 26 | 35.9% | 0 |
| ADX > 20 | 31 | +26.3% | 41.9% | 10.4 | 75 | 29.4% | 0 |
| ADX > 25 | 19 | +9.2% | 31.6% | 10.9 | 152 | 19.1% | 0 |
| ADX > 30 | 17 | +0.9% | 17.6% | 9.8 | 179 | 15.6% | 0 |

### PNR — 8/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 37 | +35.5% | 43.2% | 9.3 | 0 | 31.5% | 0 |
| ADX > 15 | 32 | +18.7% | 46.9% | 9.7 | 24 | 28.3% | 0 |
| ADX > 20 | 29 | +14.3% | 48.3% | 9.9 | 41 | 26.1% | 0 |
| ADX > 25 | 22 | +8.3% | 45.5% | 9.0 | 102 | 18.0% | 0 |
| ADX > 30 | 14 | +12.4% | 64.3% | 10.0 | 145 | 12.2% | 0 |

### PNW — 30/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +14.3% | 38.9% | 21.5 | 0 | 35.4% | 0 |
| ADX > 15 | 16 | +4.8% | 37.5% | 21.4 | 31 | 31.3% | 0 |
| ADX > 20 | 11 | +4.8% | 36.4% | 24.3 | 81 | 24.6% | 0 |
| ADX > 25 | 5 | +2.3% | 20.0% | 29.2 | 164 | 13.6% | 0 |
| ADX > 30 | 4 | -4.6% | 25.0% | 23.3 | 203 | 8.4% | 0 |

### PODD — 12/84 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 34 | +8.9% | 41.2% | 8.4 | 0 | 25.8% | 0 |
| ADX > 15 | 32 | +6.8% | 40.6% | 8.8 | 2 | 25.5% | 0 |
| ADX > 20 | 28 | +1.6% | 42.9% | 8.9 | 20 | 23.1% | 0 |
| ADX > 25 | 17 | -4.1% | 41.2% | 9.6 | 83 | 14.8% | 0 |
| ADX > 30 | 9 | -9.9% | 22.2% | 9.8 | 135 | 7.8% | 0 |

### POOL — 30/64 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | -12.3% | 26.3% | 12.5 | 0 | 21.7% | 0 |
| ADX > 15 | 17 | -16.3% | 23.5% | 12.6 | 17 | 19.4% | 0 |
| ADX > 20 | 11 | -14.0% | 18.2% | 15.4 | 49 | 15.2% | 0 |
| ADX > 25 | 5 | -8.9% | 20.0% | 16.0 | 110 | 7.0% | 0 |
| ADX > 30 | 3 | -10.4% | 0.0% | 18.3 | 128 | 4.7% | 0 |

### PPG — 14/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +15.8% | 26.3% | 11.7 | 0 | 20.2% | 0 |
| ADX > 15 | 13 | +5.3% | 23.1% | 14.5 | 23 | 17.2% | 0 |
| ADX > 20 | 7 | +11.4% | 28.6% | 16.6 | 73 | 10.5% | 0 |
| ADX > 25 | 2 | +22.7% | 100.0% | 39.5 | 100 | 6.9% | 0 |
| ADX > 30 | 2 | +18.0% | 100.0% | 32.5 | 108 | 5.9% | 0 |

### PPL — 24/78 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +9.3% | 45.8% | 16.9 | 0 | 37.2% | 0 |
| ADX > 15 | 24 | +5.8% | 45.8% | 16.4 | 7 | 36.3% | 0 |
| ADX > 20 | 16 | -8.2% | 18.8% | 15.8 | 106 | 23.1% | 0 |
| ADX > 25 | 9 | -5.8% | 22.2% | 16.8 | 173 | 14.2% | 0 |
| ADX > 30 | 3 | +2.3% | 33.3% | 25.3 | 226 | 7.2% | 0 |

### PRU — 22/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +26.0% | 47.8% | 18.7 | 0 | 39.2% | 0 |
| ADX > 15 | 17 | +26.9% | 52.9% | 22.5 | 29 | 35.4% | 0 |
| ADX > 20 | 12 | +0.1% | 33.3% | 23.6 | 99 | 26.1% | 0 |
| ADX > 25 | 10 | -12.4% | 30.0% | 22.0 | 141 | 20.5% | 0 |
| ADX > 30 | 6 | -11.5% | 0.0% | 15.7 | 232 | 8.4% | 0 |

### PSA — 26/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | +31.1% | 52.9% | 19.6 | 0 | 31.0% | 0 |
| ADX > 15 | 9 | +28.4% | 66.7% | 31.0 | 42 | 25.4% | 0 |
| ADX > 20 | 7 | +22.0% | 71.4% | 27.6 | 98 | 18.0% | 0 |
| ADX > 25 | 5 | +18.1% | 80.0% | 30.6 | 125 | 14.4% | 0 |
| ADX > 30 | 4 | +0.2% | 75.0% | 19.3 | 164 | 7.2% | 0 |

### PSKY — 8/54 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +11.8% | 38.5% | 5.9 | 0 | 22.5% | 0 |
| ADX > 15 | 24 | +36.5% | 45.8% | 6.3 | 57 | 14.9% | 0 |
| ADX > 20 | 11 | +38.3% | 54.5% | 8.8 | 96 | 9.7% | 0 |
| ADX > 25 | 8 | +32.6% | 50.0% | 9.3 | 111 | 7.7% | 0 |
| ADX > 30 | 6 | +27.6% | 50.0% | 9.7 | 125 | 5.9% | 0 |

### PSX — 18/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +53.2% | 45.8% | 14.3 | 0 | 34.3% | 1 |
| ADX > 15 | 21 | +37.0% | 52.4% | 15.0 | 20 | 31.6% | 1 |
| ADX > 20 | 17 | +22.1% | 41.2% | 15.6 | 55 | 27.0% | 1 |
| ADX > 25 | 10 | +23.1% | 60.0% | 18.3 | 113 | 19.3% | 1 |
| ADX > 30 | 6 | +8.2% | 33.3% | 19.8 | 166 | 12.2% | 1 |

### PTC — 12/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +36.2% | 34.4% | 11.1 | 0 | 31.6% | 0 |
| ADX > 15 | 27 | +32.3% | 37.0% | 11.3 | 27 | 27.5% | 0 |
| ADX > 20 | 21 | +13.4% | 33.3% | 11.2 | 77 | 20.9% | 0 |
| ADX > 25 | 11 | +12.3% | 45.5% | 14.5 | 129 | 14.0% | 0 |
| ADX > 30 | 7 | +17.9% | 57.1% | 14.4 | 167 | 8.9% | 0 |

### PWR — 28/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +128.8% | 63.2% | 30.2 | 0 | 52.3% | 0 |
| ADX > 15 | 15 | +103.3% | 66.7% | 34.2 | 40 | 46.8% | 0 |
| ADX > 20 | 11 | +109.4% | 90.9% | 38.6 | 95 | 38.7% | 0 |
| ADX > 25 | 8 | +38.7% | 87.5% | 40.9 | 148 | 29.7% | 0 |
| ADX > 30 | 7 | +30.0% | 85.7% | 38.9 | 183 | 25.0% | 0 |

### PYPL — 10/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | -5.4% | 45.7% | 9.9 | 0 | 31.8% | 0 |
| ADX > 15 | 32 | +5.6% | 46.9% | 10.1 | 16 | 29.7% | 0 |
| ADX > 20 | 24 | -15.4% | 41.7% | 10.5 | 68 | 22.7% | 0 |
| ADX > 25 | 18 | -13.7% | 38.9% | 10.9 | 103 | 18.1% | 0 |
| ADX > 30 | 9 | -13.6% | 11.1% | 10.8 | 170 | 9.2% | 0 |

### Q — 30/32 SMA, 214 bars, 2025-10-27 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 6 | +47.1% | 33.3% | 26.0 | 0 | 50.9% | 0 |
| ADX > 15 | 6 | +39.0% | 33.3% | 24.8 | 5 | 48.6% | 0 |
| ADX > 20 | 6 | +30.2% | 33.3% | 22.7 | 12 | 45.3% | 0 |
| ADX > 25 | 4 | +10.0% | 50.0% | 24.3 | 30 | 32.2% | 0 |
| ADX > 30 | 3 | -2.9% | 33.3% | 24.7 | 47 | 24.3% | 0 |

### QCOM — 14/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +56.1% | 44.8% | 13.2 | 0 | 34.6% | 0 |
| ADX > 15 | 27 | +56.1% | 40.7% | 13.1 | 22 | 31.4% | 0 |
| ADX > 20 | 20 | +86.8% | 45.0% | 13.9 | 70 | 25.0% | 0 |
| ADX > 25 | 14 | +81.8% | 50.0% | 16.6 | 100 | 20.6% | 0 |
| ADX > 30 | 14 | +25.6% | 42.9% | 13.3 | 132 | 16.4% | 0 |

### RCL — 12/86 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +150.8% | 62.5% | 17.9 | 0 | 39.2% | 0 |
| ADX > 15 | 22 | +104.3% | 50.0% | 18.3 | 19 | 36.7% | 0 |
| ADX > 20 | 21 | +65.2% | 47.6% | 16.7 | 52 | 32.2% | 0 |
| ADX > 25 | 15 | +48.8% | 46.7% | 17.7 | 114 | 23.9% | 0 |
| ADX > 30 | 11 | +43.4% | 54.5% | 17.6 | 162 | 17.6% | 0 |

### REG — 18/52 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +17.7% | 34.8% | 16.4 | 0 | 34.4% | 0 |
| ADX > 15 | 15 | +20.8% | 40.0% | 20.9 | 42 | 28.9% | 0 |
| ADX > 20 | 9 | +15.0% | 55.6% | 23.0 | 117 | 18.9% | 0 |
| ADX > 25 | 5 | +14.3% | 80.0% | 31.0 | 151 | 14.4% | 0 |
| ADX > 30 | 4 | +0.9% | 50.0% | 30.5 | 168 | 11.2% | 0 |

### REGN — 8/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 41 | +39.2% | 36.6% | 7.8 | 0 | 29.7% | 1 |
| ADX > 15 | 32 | +26.6% | 37.5% | 8.7 | 32 | 25.4% | 1 |
| ADX > 20 | 21 | +62.2% | 47.6% | 11.0 | 63 | 21.3% | 1 |
| ADX > 25 | 20 | +46.3% | 50.0% | 10.3 | 80 | 19.0% | 1 |
| ADX > 30 | 13 | +15.0% | 46.2% | 10.0 | 131 | 12.2% | 1 |

### RF — 8/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 48 | +55.4% | 45.8% | 9.0 | 0 | 39.4% | 0 |
| ADX > 15 | 45 | +41.0% | 44.4% | 9.1 | 20 | 36.7% | 0 |
| ADX > 20 | 38 | +20.0% | 42.1% | 9.3 | 55 | 32.0% | 0 |
| ADX > 25 | 28 | -3.2% | 39.3% | 8.6 | 134 | 21.5% | 0 |
| ADX > 30 | 12 | -1.8% | 41.7% | 9.8 | 210 | 10.9% | 0 |

### RJF — 22/92 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +42.7% | 40.0% | 18.8 | 0 | 34.7% | 0 |
| ADX > 15 | 15 | +37.1% | 40.0% | 22.6 | 25 | 31.4% | 0 |
| ADX > 20 | 10 | +24.5% | 50.0% | 24.4 | 89 | 22.9% | 0 |
| ADX > 25 | 5 | +19.3% | 60.0% | 28.6 | 160 | 13.4% | 0 |
| ADX > 30 | 3 | +15.0% | 33.3% | 29.7 | 200 | 8.1% | 0 |

### RL — 20/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +144.7% | 46.7% | 18.4 | 0 | 49.7% | 0 |
| ADX > 15 | 24 | +127.8% | 41.7% | 21.0 | 33 | 45.3% | 0 |
| ADX > 20 | 18 | +82.8% | 38.9% | 22.7 | 78 | 36.7% | 0 |
| ADX > 25 | 14 | +60.1% | 42.9% | 23.6 | 128 | 30.1% | 0 |
| ADX > 30 | 12 | +30.4% | 50.0% | 22.0 | 166 | 23.7% | 0 |

### RMD — 12/60 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | -1.9% | 34.4% | 11.6 | 0 | 34.0% | 0 |
| ADX > 15 | 28 | +15.3% | 39.3% | 12.7 | 11 | 32.6% | 0 |
| ADX > 20 | 26 | +3.6% | 34.6% | 11.4 | 52 | 27.1% | 0 |
| ADX > 25 | 15 | +4.9% | 46.7% | 12.3 | 130 | 16.8% | 0 |
| ADX > 30 | 10 | +2.9% | 40.0% | 11.8 | 176 | 10.6% | 0 |

### ROK — 26/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +3.9% | 40.6% | 14.2 | 0 | 41.0% | 0 |
| ADX > 15 | 17 | +16.0% | 58.8% | 21.9 | 51 | 33.8% | 0 |
| ADX > 20 | 12 | +26.9% | 66.7% | 23.9 | 106 | 25.9% | 0 |
| ADX > 25 | 10 | +9.9% | 50.0% | 26.0 | 127 | 23.1% | 0 |
| ADX > 30 | 7 | -1.0% | 28.6% | 25.1 | 182 | 15.8% | 0 |

### ROL — 28/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | -2.7% | 32.1% | 16.2 | 0 | 41.5% | 0 |
| ADX > 15 | 19 | -2.9% | 36.8% | 18.3 | 58 | 32.0% | 0 |
| ADX > 20 | 13 | -6.8% | 30.8% | 19.9 | 119 | 23.9% | 0 |
| ADX > 25 | 10 | +6.3% | 40.0% | 21.2 | 152 | 19.5% | 0 |
| ADX > 30 | 5 | -10.9% | 20.0% | 17.8 | 223 | 8.1% | 0 |

### ROP — 26/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | -7.9% | 19.2% | 11.0 | 0 | 29.0% | 1 |
| ADX > 15 | 20 | -10.1% | 25.0% | 12.0 | 26 | 24.6% | 1 |
| ADX > 20 | 11 | -8.4% | 18.2% | 15.8 | 75 | 18.0% | 1 |
| ADX > 25 | 7 | -4.6% | 28.6% | 15.9 | 114 | 12.1% | 1 |
| ADX > 30 | 3 | -0.4% | 33.3% | 29.7 | 140 | 8.6% | 1 |

### ROST — 12/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +32.8% | 38.1% | 12.0 | 0 | 44.8% | 0 |
| ADX > 15 | 41 | +25.3% | 39.0% | 12.0 | 8 | 43.8% | 0 |
| ADX > 20 | 36 | +23.0% | 38.9% | 12.8 | 31 | 40.7% | 0 |
| ADX > 25 | 28 | +12.4% | 35.7% | 11.6 | 118 | 29.1% | 0 |
| ADX > 30 | 19 | +0.5% | 36.8% | 11.3 | 196 | 18.8% | 0 |

### RSG — 26/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +27.3% | 50.0% | 21.3 | 0 | 43.6% | 1 |
| ADX > 15 | 18 | +19.2% | 44.4% | 23.6 | 32 | 39.4% | 1 |
| ADX > 20 | 11 | +23.1% | 45.5% | 29.9 | 97 | 29.8% | 0 |
| ADX > 25 | 10 | +22.8% | 50.0% | 29.3 | 122 | 26.5% | 0 |
| ADX > 30 | 7 | +11.7% | 42.9% | 35.1 | 151 | 22.6% | 0 |

### RTX — 26/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +51.3% | 45.8% | 26.8 | 0 | 58.9% | 0 |
| ADX > 15 | 21 | +47.3% | 52.4% | 28.8 | 26 | 55.5% | 0 |
| ADX > 20 | 19 | +29.9% | 52.6% | 28.5 | 61 | 49.9% | 0 |
| ADX > 25 | 13 | +8.0% | 53.8% | 33.4 | 133 | 40.3% | 0 |
| ADX > 30 | 10 | +0.0% | 40.0% | 28.7 | 236 | 26.6% | 0 |

### RVTY — 14/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +7.0% | 46.9% | 10.1 | 0 | 29.5% | 1 |
| ADX > 15 | 28 | -13.4% | 42.9% | 9.7 | 39 | 24.3% | 1 |
| ADX > 20 | 14 | -29.4% | 21.4% | 8.4 | 144 | 10.4% | 1 |
| ADX > 25 | 6 | -10.5% | 33.3% | 10.5 | 182 | 5.3% | 1 |
| ADX > 30 | 3 | -3.9% | 33.3% | 9.7 | 205 | 2.5% | 0 |

### SATS — 18/96 SMA, 750 bars, 2023-09-05 → 2026-08-31

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +64.1% | 28.2% | 10.6 | 0 | 37.6% | 0 |
| ADX > 15 | 28 | -31.0% | 28.6% | 11.6 | 60 | 29.6% | 0 |
| ADX > 20 | 17 | -9.5% | 23.5% | 13.6 | 125 | 20.9% | 0 |
| ADX > 25 | 11 | +33.2% | 27.3% | 17.0 | 155 | 16.9% | 0 |
| ADX > 30 | 7 | +13.2% | 42.9% | 20.0 | 184 | 13.1% | 0 |

### SBAC — 26/62 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 15 | +1.6% | 33.3% | 17.4 | 0 | 24.2% | 0 |
| ADX > 15 | 12 | +2.8% | 41.7% | 19.1 | 23 | 21.1% | 0 |
| ADX > 20 | 9 | -0.3% | 44.4% | 19.6 | 61 | 16.1% | 0 |
| ADX > 25 | 6 | +10.2% | 66.7% | 24.3 | 81 | 13.4% | 0 |
| ADX > 30 | 5 | -7.7% | 40.0% | 20.2 | 113 | 9.2% | 0 |

### SBUX — 8/78 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 38 | +0.2% | 26.3% | 7.4 | 0 | 25.8% | 0 |
| ADX > 15 | 30 | +2.0% | 23.3% | 7.2 | 44 | 19.9% | 0 |
| ADX > 20 | 23 | +4.8% | 30.4% | 7.4 | 74 | 16.0% | 0 |
| ADX > 25 | 14 | +9.7% | 35.7% | 8.1 | 114 | 10.6% | 0 |
| ADX > 30 | 12 | +1.8% | 41.7% | 7.3 | 134 | 8.0% | 0 |

### SCHW — 18/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +74.3% | 40.0% | 18.8 | 0 | 43.4% | 0 |
| ADX > 15 | 21 | +73.2% | 47.6% | 20.7 | 23 | 40.2% | 0 |
| ADX > 20 | 16 | +52.3% | 62.5% | 24.4 | 55 | 35.8% | 0 |
| ADX > 25 | 15 | +37.2% | 46.7% | 21.9 | 98 | 30.1% | 0 |
| ADX > 30 | 12 | +11.8% | 50.0% | 17.9 | 173 | 20.1% | 0 |

### SHW — 8/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 43 | +11.7% | 37.2% | 8.2 | 0 | 32.0% | 0 |
| ADX > 15 | 43 | +11.0% | 37.2% | 8.2 | 1 | 31.9% | 0 |
| ADX > 20 | 36 | -11.6% | 30.6% | 7.7 | 52 | 25.0% | 0 |
| ADX > 25 | 22 | -1.9% | 36.4% | 9.1 | 107 | 17.7% | 0 |
| ADX > 30 | 12 | +2.3% | 41.7% | 11.4 | 148 | 12.2% | 0 |

### SJM — 30/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 16 | +3.7% | 31.3% | 21.3 | 0 | 35.4% | 1 |
| ADX > 15 | 14 | +1.0% | 28.6% | 23.1 | 12 | 33.5% | 1 |
| ADX > 20 | 10 | -10.5% | 20.0% | 25.1 | 62 | 25.4% | 1 |
| ADX > 25 | 7 | -9.3% | 28.6% | 26.4 | 99 | 19.3% | 1 |
| ADX > 30 | 4 | -15.9% | 25.0% | 24.5 | 181 | 8.6% | 0 |

### SLB — 22/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 11 | +27.1% | 27.3% | 17.4 | 0 | 17.8% | 1 |
| ADX > 15 | 10 | +27.1% | 30.0% | 19.0 | 1 | 17.7% | 1 |
| ADX > 20 | 7 | +11.4% | 28.6% | 24.1 | 15 | 15.8% | 1 |
| ADX > 25 | 4 | +9.7% | 25.0% | 32.0 | 43 | 12.1% | 1 |
| ADX > 30 | 3 | +0.8% | 33.3% | 25.7 | 82 | 7.2% | 0 |

### SMCI — 8/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 46 | +10.6% | 39.1% | 7.0 | 0 | 28.6% | 0 |
| ADX > 15 | 39 | +0.1% | 38.5% | 7.6 | 18 | 26.2% | 0 |
| ADX > 20 | 27 | +18.6% | 33.3% | 7.1 | 84 | 17.3% | 0 |
| ADX > 25 | 16 | +13.8% | 37.5% | 7.3 | 134 | 10.6% | 0 |
| ADX > 30 | 7 | +46.9% | 28.6% | 10.4 | 165 | 6.5% | 0 |

### SNA — 30/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +19.2% | 40.9% | 20.0 | 0 | 40.2% | 0 |
| ADX > 15 | 19 | +10.9% | 36.8% | 19.3 | 33 | 33.5% | 0 |
| ADX > 20 | 11 | -1.8% | 36.4% | 15.0 | 168 | 15.6% | 0 |
| ADX > 25 | 3 | +20.7% | 100.0% | 31.7 | 219 | 8.8% | 0 |
| ADX > 30 | 2 | +12.7% | 100.0% | 45.0 | 222 | 8.4% | 0 |

### SNDK — 18/42 SMA, 390 bars, 2025-02-13 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 8 | +3008.0% | 62.5% | 39.6 | 0 | 54.9% | 1 |
| ADX > 15 | 8 | +2740.7% | 62.5% | 39.3 | 5 | 54.1% | 0 |
| ADX > 20 | 7 | +2302.5% | 42.9% | 42.7 | 15 | 51.5% | 0 |
| ADX > 25 | 5 | +1244.2% | 60.0% | 50.8 | 35 | 44.9% | 0 |
| ADX > 30 | 4 | +975.4% | 75.0% | 55.0 | 60 | 38.5% | 0 |

### SNPS — 24/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +4.5% | 35.0% | 16.7 | 0 | 30.2% | 0 |
| ADX > 15 | 14 | +13.6% | 42.9% | 21.9 | 19 | 27.7% | 0 |
| ADX > 20 | 11 | +1.2% | 54.5% | 22.9 | 51 | 22.6% | 0 |
| ADX > 25 | 6 | +1.5% | 50.0% | 35.7 | 76 | 19.3% | 0 |
| ADX > 30 | 5 | -6.6% | 40.0% | 31.8 | 115 | 14.1% | 0 |

### SO — 16/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +16.2% | 42.9% | 13.0 | 0 | 42.2% | 0 |
| ADX > 15 | 34 | +2.5% | 38.2% | 11.1 | 45 | 35.4% | 0 |
| ADX > 20 | 24 | -2.7% | 37.5% | 11.6 | 112 | 26.1% | 0 |
| ADX > 25 | 18 | +1.2% | 33.3% | 11.7 | 150 | 20.1% | 0 |
| ADX > 30 | 12 | -1.6% | 41.7% | 12.3 | 192 | 14.5% | 0 |

### SOLV — 8/42 SMA, 612 bars, 2024-03-26 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +14.7% | 36.7% | 8.9 | 0 | 29.6% | 0 |
| ADX > 15 | 30 | +4.6% | 26.7% | 8.1 | 15 | 27.1% | 0 |
| ADX > 20 | 25 | -1.0% | 32.0% | 8.8 | 34 | 24.0% | 0 |
| ADX > 25 | 18 | -14.2% | 22.2% | 8.1 | 84 | 15.8% | 0 |
| ADX > 30 | 11 | -13.1% | 27.3% | 8.6 | 119 | 10.3% | 0 |

### SPG — 24/88 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 29 | +8.2% | 31.0% | 18.6 | 0 | 48.7% | 0 |
| ADX > 15 | 19 | +6.7% | 31.6% | 23.4 | 62 | 40.4% | 0 |
| ADX > 20 | 15 | +4.0% | 40.0% | 23.7 | 118 | 33.0% | 0 |
| ADX > 25 | 9 | +5.6% | 55.6% | 25.4 | 208 | 21.0% | 0 |
| ADX > 30 | 6 | -7.9% | 0.0% | 11.5 | 311 | 6.3% | 0 |

### SPGI — 30/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 16 | +11.3% | 43.8% | 21.6 | 0 | 32.6% | 1 |
| ADX > 15 | 13 | +4.1% | 30.8% | 23.7 | 37 | 27.8% | 0 |
| ADX > 20 | 8 | +2.6% | 37.5% | 29.1 | 85 | 21.4% | 0 |
| ADX > 25 | 7 | +4.1% | 42.9% | 32.0 | 93 | 20.2% | 0 |
| ADX > 30 | 4 | +0.6% | 50.0% | 43.5 | 124 | 16.1% | 0 |

### SRE — 30/88 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +13.3% | 42.1% | 17.9 | 0 | 31.0% | 0 |
| ADX > 15 | 17 | +11.2% | 47.1% | 19.2 | 10 | 29.7% | 0 |
| ADX > 20 | 12 | +11.6% | 50.0% | 22.3 | 49 | 24.5% | 0 |
| ADX > 25 | 10 | +1.4% | 50.0% | 23.1 | 74 | 21.1% | 0 |
| ADX > 30 | 8 | +1.5% | 50.0% | 25.3 | 95 | 18.4% | 0 |

### STE — 26/84 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | -1.5% | 29.2% | 14.2 | 0 | 32.0% | 0 |
| ADX > 15 | 21 | +2.9% | 33.3% | 16.0 | 3 | 31.6% | 0 |
| ADX > 20 | 11 | -9.3% | 18.2% | 17.7 | 104 | 18.2% | 0 |
| ADX > 25 | 4 | -8.0% | 0.0% | 17.8 | 192 | 6.5% | 0 |
| ADX > 30 | 1 | -1.0% | 0.0% | 29.0 | 221 | 2.7% | 0 |

### STLD — 20/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +87.4% | 48.4% | 14.5 | 0 | 40.8% | 0 |
| ADX > 15 | 24 | +78.4% | 54.2% | 16.3 | 36 | 36.0% | 0 |
| ADX > 20 | 18 | +91.3% | 66.7% | 17.8 | 87 | 29.4% | 0 |
| ADX > 25 | 16 | +31.9% | 62.5% | 15.8 | 136 | 22.9% | 0 |
| ADX > 30 | 10 | -20.3% | 20.0% | 15.0 | 196 | 13.7% | 0 |

### STT — 8/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 55 | +59.5% | 45.5% | 8.9 | 0 | 45.2% | 0 |
| ADX > 15 | 50 | +39.1% | 40.0% | 8.7 | 38 | 40.2% | 0 |
| ADX > 20 | 42 | +19.2% | 40.5% | 8.6 | 87 | 33.6% | 0 |
| ADX > 25 | 28 | -10.0% | 25.0% | 8.3 | 180 | 21.1% | 0 |
| ADX > 30 | 21 | -21.8% | 14.3% | 6.1 | 249 | 12.0% | 0 |

### STX — 8/52 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 47 | +577.9% | 51.1% | 10.4 | 0 | 43.9% | 0 |
| ADX > 15 | 44 | +448.1% | 52.3% | 10.5 | 17 | 41.6% | 0 |
| ADX > 20 | 39 | +306.5% | 48.7% | 9.9 | 69 | 34.7% | 0 |
| ADX > 25 | 33 | +260.7% | 51.5% | 9.7 | 109 | 29.4% | 0 |
| ADX > 30 | 28 | +95.0% | 39.3% | 8.8 | 165 | 21.9% | 0 |

### STZ — 30/66 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 9 | +1.0% | 44.4% | 19.8 | 0 | 16.1% | 0 |
| ADX > 15 | 8 | -0.6% | 37.5% | 20.6 | 9 | 14.9% | 0 |
| ADX > 20 | 7 | -11.5% | 28.6% | 15.9 | 46 | 10.0% | 0 |
| ADX > 25 | 4 | -9.6% | 25.0% | 21.3 | 63 | 7.7% | 0 |
| ADX > 30 | 2 | -1.8% | 50.0% | 29.5 | 82 | 5.2% | 0 |

### SW — 16/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +13.1% | 40.7% | 13.4 | 0 | 32.0% | 0 |
| ADX > 15 | 23 | +13.7% | 43.5% | 14.6 | 15 | 30.1% | 0 |
| ADX > 20 | 14 | +22.3% | 42.9% | 16.6 | 85 | 20.7% | 0 |
| ADX > 25 | 10 | +14.3% | 50.0% | 18.6 | 118 | 16.4% | 0 |
| ADX > 30 | 8 | -20.2% | 12.5% | 14.3 | 167 | 9.8% | 0 |

### SWK — 18/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 32 | +51.1% | 65.6% | 12.1 | 0 | 35.0% | 0 |
| ADX > 15 | 29 | +18.7% | 58.6% | 11.0 | 45 | 29.0% | 0 |
| ADX > 20 | 21 | +2.8% | 57.1% | 10.0 | 118 | 19.3% | 0 |
| ADX > 25 | 10 | -2.3% | 60.0% | 12.9 | 175 | 11.7% | 0 |
| ADX > 30 | 5 | -15.1% | 0.0% | 10.2 | 230 | 4.4% | 0 |

### SWKS — 14/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +34.6% | 43.5% | 12.3 | 0 | 25.7% | 0 |
| ADX > 15 | 19 | +39.0% | 42.1% | 13.2 | 23 | 22.7% | 0 |
| ADX > 20 | 13 | +24.3% | 38.5% | 13.1 | 76 | 15.7% | 0 |
| ADX > 25 | 8 | +13.6% | 50.0% | 16.5 | 104 | 12.0% | 0 |
| ADX > 30 | 6 | +16.9% | 50.0% | 16.0 | 128 | 8.8% | 0 |

### SYF — 12/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 46 | +29.7% | 39.1% | 10.0 | 0 | 42.3% | 0 |
| ADX > 15 | 44 | +12.1% | 40.9% | 9.8 | 21 | 39.5% | 0 |
| ADX > 20 | 32 | +13.1% | 46.9% | 11.3 | 69 | 33.1% | 0 |
| ADX > 25 | 23 | -15.7% | 39.1% | 10.3 | 153 | 21.9% | 0 |
| ADX > 30 | 20 | -22.5% | 40.0% | 8.9 | 194 | 16.5% | 0 |

### SYK — 16/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | -2.7% | 38.1% | 12.0 | 0 | 23.4% | 0 |
| ADX > 15 | 19 | -9.8% | 26.3% | 11.9 | 19 | 20.9% | 0 |
| ADX > 20 | 12 | +6.0% | 33.3% | 15.3 | 51 | 16.6% | 0 |
| ADX > 25 | 10 | +1.7% | 30.0% | 15.3 | 72 | 13.8% | 0 |
| ADX > 30 | 6 | +7.1% | 66.7% | 17.3 | 106 | 9.3% | 0 |

### SYY — 20/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +16.7% | 28.0% | 16.6 | 0 | 38.0% | 0 |
| ADX > 15 | 24 | +17.4% | 29.2% | 17.3 | 1 | 37.9% | 0 |
| ADX > 20 | 20 | +14.0% | 30.0% | 15.7 | 71 | 28.6% | 0 |
| ADX > 25 | 12 | +12.3% | 41.7% | 19.3 | 128 | 21.0% | 0 |
| ADX > 30 | 7 | +14.7% | 57.1% | 24.9 | 170 | 15.4% | 0 |

### T — 28/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +6.8% | 30.4% | 22.6 | 0 | 49.6% | 1 |
| ADX > 15 | 19 | +10.1% | 36.8% | 24.1 | 35 | 44.0% | 1 |
| ADX > 20 | 14 | +17.0% | 42.9% | 27.2 | 88 | 36.8% | 1 |
| ADX > 25 | 13 | +9.9% | 30.8% | 23.5 | 127 | 30.2% | 1 |
| ADX > 30 | 8 | +3.3% | 37.5% | 28.3 | 190 | 21.4% | 1 |

### TAP — 8/66 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 36 | +8.1% | 38.9% | 6.9 | 0 | 22.5% | 0 |
| ADX > 15 | 33 | -14.9% | 30.3% | 6.0 | 32 | 18.2% | 0 |
| ADX > 20 | 16 | -19.9% | 25.0% | 5.3 | 112 | 7.6% | 0 |
| ADX > 25 | 8 | -15.6% | 12.5% | 4.6 | 146 | 3.1% | 0 |
| ADX > 30 | 2 | -7.8% | 0.0% | 4.5 | 162 | 0.9% | 0 |

### TDG — 12/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 43 | -7.8% | 37.2% | 9.9 | 0 | 39.0% | 0 |
| ADX > 15 | 35 | -6.3% | 45.7% | 9.8 | 61 | 30.9% | 0 |
| ADX > 20 | 24 | -1.9% | 41.7% | 9.6 | 136 | 20.9% | 0 |
| ADX > 25 | 13 | -1.1% | 38.5% | 9.9 | 206 | 11.6% | 0 |
| ADX > 30 | 7 | +5.2% | 42.9% | 12.3 | 239 | 7.2% | 0 |

### TDY — 22/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +25.7% | 32.0% | 16.3 | 0 | 37.6% | 0 |
| ADX > 15 | 24 | +16.3% | 33.3% | 15.5 | 17 | 34.6% | 0 |
| ADX > 20 | 15 | +16.6% | 33.3% | 19.9 | 62 | 27.5% | 0 |
| ADX > 25 | 10 | +12.3% | 50.0% | 25.8 | 92 | 23.5% | 0 |
| ADX > 30 | 5 | +15.6% | 80.0% | 32.4 | 158 | 14.8% | 0 |

### TECH — 8/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 38 | +18.9% | 34.2% | 7.3 | 0 | 25.0% | 0 |
| ADX > 15 | 37 | +5.7% | 32.4% | 7.3 | 5 | 24.3% | 0 |
| ADX > 20 | 33 | -4.7% | 30.3% | 6.8 | 33 | 20.3% | 0 |
| ADX > 25 | 16 | -8.8% | 31.3% | 6.7 | 115 | 9.4% | 0 |
| ADX > 30 | 10 | -1.9% | 40.0% | 7.3 | 137 | 6.5% | 0 |

### TEL — 28/50 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +15.7% | 36.0% | 17.1 | 0 | 39.1% | 0 |
| ADX > 15 | 18 | +6.5% | 27.8% | 20.8 | 39 | 33.9% | 0 |
| ADX > 20 | 5 | +40.6% | 60.0% | 57.4 | 85 | 26.2% | 0 |
| ADX > 25 | 4 | +45.0% | 75.0% | 65.5 | 101 | 24.1% | 0 |
| ADX > 30 | 4 | +27.1% | 50.0% | 59.5 | 117 | 21.9% | 0 |

### TER — 10/92 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 37 | +200.9% | 54.1% | 11.6 | 0 | 37.8% | 0 |
| ADX > 15 | 34 | +224.9% | 55.9% | 11.8 | 18 | 35.4% | 0 |
| ADX > 20 | 27 | +165.2% | 59.3% | 12.2 | 66 | 29.0% | 0 |
| ADX > 25 | 19 | +13.0% | 57.9% | 10.8 | 147 | 18.2% | 0 |
| ADX > 30 | 12 | +35.0% | 58.3% | 11.5 | 191 | 12.4% | 0 |

### TFC — 8/78 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 48 | +4.7% | 37.5% | 8.2 | 0 | 35.8% | 0 |
| ADX > 15 | 39 | +0.1% | 38.5% | 8.4 | 42 | 30.2% | 0 |
| ADX > 20 | 30 | +2.3% | 36.7% | 8.4 | 97 | 22.9% | 0 |
| ADX > 25 | 19 | +10.0% | 47.4% | 8.3 | 158 | 14.8% | 0 |
| ADX > 30 | 8 | -3.4% | 25.0% | 9.3 | 217 | 6.8% | 0 |

### TGT — 24/62 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +40.0% | 52.4% | 18.5 | 0 | 38.8% | 1 |
| ADX > 15 | 18 | +46.9% | 50.0% | 20.0 | 19 | 36.3% | 1 |
| ADX > 20 | 13 | +44.7% | 61.5% | 20.8 | 77 | 27.4% | 1 |
| ADX > 25 | 9 | +29.6% | 55.6% | 23.3 | 127 | 20.7% | 1 |
| ADX > 30 | 6 | +10.4% | 50.0% | 25.0 | 172 | 14.8% | 1 |

### TJX — 12/78 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 49 | +10.7% | 40.8% | 10.3 | 0 | 44.5% | 0 |
| ADX > 15 | 41 | +9.6% | 39.0% | 10.8 | 40 | 39.2% | 0 |
| ADX > 20 | 31 | +18.4% | 45.2% | 11.7 | 91 | 32.4% | 0 |
| ADX > 25 | 20 | +8.7% | 50.0% | 11.8 | 176 | 21.1% | 0 |
| ADX > 30 | 13 | -0.9% | 46.2% | 10.8 | 239 | 12.8% | 0 |

### TKO — 12/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +52.8% | 48.6% | 11.3 | 0 | 36.2% | 0 |
| ADX > 15 | 31 | +26.3% | 41.9% | 11.5 | 28 | 32.4% | 0 |
| ADX > 20 | 27 | -5.9% | 33.3% | 10.7 | 73 | 26.5% | 0 |
| ADX > 25 | 21 | -7.2% | 28.6% | 8.9 | 142 | 17.3% | 0 |
| ADX > 30 | 10 | +13.3% | 50.0% | 12.0 | 191 | 10.8% | 0 |

### TMO — 24/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 16 | +52.0% | 56.3% | 26.7 | 0 | 38.6% | 0 |
| ADX > 15 | 11 | +52.2% | 72.7% | 35.9 | 20 | 35.9% | 0 |
| ADX > 20 | 10 | +36.3% | 60.0% | 35.8 | 43 | 32.8% | 0 |
| ADX > 25 | 9 | +13.8% | 44.4% | 28.9 | 105 | 23.9% | 0 |
| ADX > 30 | 6 | +12.5% | 50.0% | 25.2 | 180 | 14.0% | 0 |

### TMUS — 20/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +13.5% | 31.8% | 14.3 | 0 | 28.9% | 0 |
| ADX > 15 | 20 | +17.4% | 40.0% | 15.4 | 6 | 28.1% | 0 |
| ADX > 20 | 18 | +15.3% | 38.9% | 15.9 | 20 | 26.2% | 0 |
| ADX > 25 | 12 | +15.9% | 50.0% | 19.3 | 58 | 21.1% | 0 |
| ADX > 30 | 9 | +11.6% | 55.6% | 20.3 | 91 | 16.8% | 0 |

### TPL — 26/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | +74.6% | 35.7% | 25.3 | 0 | 32.4% | 0 |
| ADX > 15 | 8 | +160.2% | 62.5% | 41.3 | 18 | 30.1% | 0 |
| ADX > 20 | 8 | +162.6% | 62.5% | 40.8 | 20 | 29.8% | 0 |
| ADX > 25 | 6 | +94.9% | 50.0% | 46.5 | 52 | 25.5% | 0 |
| ADX > 30 | 4 | +61.6% | 50.0% | 40.3 | 131 | 15.0% | 0 |

### TPR — 12/80 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 33 | +54.3% | 42.4% | 13.3 | 0 | 40.2% | 0 |
| ADX > 15 | 31 | +55.6% | 45.2% | 13.9 | 7 | 39.2% | 0 |
| ADX > 20 | 27 | +38.2% | 40.7% | 14.6 | 30 | 36.2% | 0 |
| ADX > 25 | 24 | +10.1% | 41.7% | 13.9 | 74 | 30.3% | 0 |
| ADX > 30 | 19 | +8.7% | 36.8% | 13.3 | 133 | 22.5% | 0 |

### TRGP — 8/96 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +121.2% | 42.9% | 11.9 | 0 | 44.9% | 1 |
| ADX > 15 | 39 | +152.0% | 46.2% | 12.4 | 13 | 43.2% | 1 |
| ADX > 20 | 34 | +152.1% | 50.0% | 12.7 | 48 | 38.6% | 1 |
| ADX > 25 | 28 | +103.9% | 50.0% | 12.9 | 97 | 32.3% | 0 |
| ADX > 30 | 21 | +82.4% | 52.4% | 14.2 | 140 | 26.6% | 0 |

### TRMB — 8/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 45 | +41.7% | 28.9% | 6.8 | 0 | 28.9% | 0 |
| ADX > 15 | 40 | +47.4% | 32.5% | 7.2 | 18 | 26.5% | 0 |
| ADX > 20 | 33 | +6.2% | 36.4% | 6.8 | 64 | 20.3% | 0 |
| ADX > 25 | 23 | -7.5% | 34.8% | 6.3 | 118 | 13.2% | 0 |
| ADX > 30 | 16 | -7.4% | 37.5% | 6.4 | 148 | 9.2% | 0 |

### TROW — 26/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +0.8% | 33.3% | 14.7 | 0 | 41.1% | 0 |
| ADX > 15 | 25 | +14.3% | 40.0% | 16.5 | 22 | 38.2% | 0 |
| ADX > 20 | 14 | +7.4% | 42.9% | 22.6 | 85 | 29.1% | 0 |
| ADX > 25 | 10 | +1.2% | 40.0% | 24.1 | 134 | 22.3% | 0 |
| ADX > 30 | 7 | -9.7% | 14.3% | 23.7 | 188 | 15.2% | 0 |

### TRV — 20/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +33.5% | 54.2% | 20.7 | 0 | 45.7% | 0 |
| ADX > 15 | 21 | +29.6% | 57.1% | 21.7 | 26 | 42.0% | 0 |
| ADX > 20 | 17 | +0.8% | 47.1% | 22.5 | 81 | 34.7% | 0 |
| ADX > 25 | 10 | -9.6% | 40.0% | 21.6 | 185 | 19.9% | 0 |
| ADX > 30 | 6 | +11.9% | 66.7% | 25.0 | 231 | 13.8% | 0 |

### TSCO — 14/52 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +33.3% | 55.6% | 18.3 | 0 | 30.5% | 0 |
| ADX > 15 | 17 | +29.2% | 58.8% | 18.5 | 7 | 29.0% | 0 |
| ADX > 20 | 13 | +13.4% | 69.2% | 20.2 | 41 | 24.5% | 0 |
| ADX > 25 | 9 | -0.8% | 55.6% | 23.6 | 80 | 19.3% | 0 |
| ADX > 30 | 6 | +5.5% | 50.0% | 24.2 | 126 | 13.2% | 0 |

### TSLA — 18/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +100.5% | 43.5% | 14.3 | 0 | 30.3% | 1 |
| ADX > 15 | 18 | +94.4% | 50.0% | 14.6 | 46 | 24.2% | 1 |
| ADX > 20 | 14 | +8.6% | 28.6% | 13.4 | 98 | 17.3% | 1 |
| ADX > 25 | 10 | +9.3% | 30.0% | 14.0 | 134 | 12.8% | 0 |
| ADX > 30 | 5 | +4.8% | 60.0% | 21.4 | 158 | 9.6% | 0 |

### TSN — 16/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +3.6% | 25.0% | 12.1 | 0 | 31.1% | 0 |
| ADX > 15 | 26 | +7.0% | 26.9% | 12.7 | 6 | 30.3% | 0 |
| ADX > 20 | 18 | +2.1% | 38.9% | 16.1 | 34 | 26.3% | 0 |
| ADX > 25 | 13 | -6.2% | 30.8% | 15.8 | 93 | 18.5% | 0 |
| ADX > 30 | 8 | -12.6% | 12.5% | 12.5 | 163 | 9.2% | 0 |

### TT — 22/66 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +51.9% | 56.0% | 19.6 | 0 | 44.4% | 0 |
| ADX > 15 | 19 | +39.5% | 52.6% | 22.9 | 38 | 39.4% | 0 |
| ADX > 20 | 16 | +47.6% | 56.3% | 23.6 | 76 | 34.3% | 0 |
| ADX > 25 | 11 | +38.7% | 63.6% | 30.2 | 108 | 30.1% | 0 |
| ADX > 30 | 8 | +19.1% | 62.5% | 29.8 | 166 | 21.8% | 0 |

### TTD — 8/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | -24.6% | 29.0% | 8.7 | 0 | 24.3% | 0 |
| ADX > 15 | 31 | -27.7% | 25.8% | 8.3 | 7 | 23.4% | 0 |
| ADX > 20 | 20 | -26.6% | 20.0% | 7.8 | 74 | 14.5% | 0 |
| ADX > 25 | 11 | -39.3% | 9.1% | 8.5 | 117 | 8.8% | 0 |
| ADX > 30 | 7 | -44.2% | 14.3% | 6.1 | 152 | 4.1% | 0 |

### TTWO — 26/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +16.7% | 42.9% | 16.5 | 0 | 41.0% | 0 |
| ADX > 15 | 25 | +8.1% | 40.0% | 16.9 | 24 | 37.4% | 0 |
| ADX > 20 | 14 | +2.7% | 35.7% | 20.0 | 98 | 25.4% | 0 |
| ADX > 25 | 10 | -11.5% | 30.0% | 21.8 | 130 | 19.8% | 0 |
| ADX > 30 | 6 | -1.2% | 50.0% | 26.5 | 170 | 14.5% | 0 |

### TXN — 12/46 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 35 | +45.1% | 37.1% | 9.4 | 0 | 30.3% | 0 |
| ADX > 15 | 31 | +35.0% | 38.7% | 10.3 | 8 | 29.3% | 0 |
| ADX > 20 | 26 | +37.1% | 42.3% | 10.8 | 31 | 25.9% | 0 |
| ADX > 25 | 17 | +51.2% | 64.7% | 12.2 | 83 | 19.0% | 0 |
| ADX > 30 | 12 | +15.3% | 66.7% | 12.2 | 127 | 13.2% | 0 |

### TXT — 24/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | +12.0% | 42.9% | 21.5 | 0 | 27.5% | 0 |
| ADX > 15 | 13 | +5.1% | 46.2% | 22.6 | 5 | 26.9% | 0 |
| ADX > 20 | 8 | +1.0% | 50.0% | 29.0 | 46 | 21.3% | 0 |
| ADX > 25 | 8 | -3.5% | 37.5% | 24.8 | 71 | 18.0% | 0 |
| ADX > 30 | 5 | -1.1% | 40.0% | 31.4 | 98 | 14.0% | 0 |

### TYL — 20/68 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | -4.1% | 32.0% | 11.1 | 0 | 27.5% | 1 |
| ADX > 15 | 20 | +5.5% | 40.0% | 11.9 | 30 | 23.5% | 1 |
| ADX > 20 | 12 | +7.9% | 50.0% | 15.8 | 70 | 18.2% | 1 |
| ADX > 25 | 8 | +8.2% | 50.0% | 17.0 | 108 | 13.2% | 1 |
| ADX > 30 | 6 | +3.0% | 33.3% | 18.0 | 133 | 9.8% | 1 |

### UAL — 28/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 | +121.0% | 42.9% | 23.9 | 0 | 45.2% | 0 |
| ADX > 15 | 20 | +88.7% | 40.0% | 23.2 | 17 | 42.2% | 0 |
| ADX > 20 | 13 | +105.3% | 53.8% | 29.2 | 69 | 34.6% | 0 |
| ADX > 25 | 11 | +64.2% | 45.5% | 30.5 | 101 | 30.3% | 0 |
| ADX > 30 | 9 | +41.0% | 22.2% | 24.6 | 180 | 19.8% | 0 |

### UBER — 30/84 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 20 | +1.4% | 30.0% | 14.8 | 0 | 28.2% | 1 |
| ADX > 15 | 14 | -9.0% | 35.7% | 16.9 | 42 | 22.6% | 1 |
| ADX > 20 | 6 | +22.3% | 50.0% | 26.2 | 105 | 14.5% | 0 |
| ADX > 25 | 3 | +20.8% | 66.7% | 31.0 | 152 | 8.2% | 0 |
| ADX > 30 | 2 | +17.8% | 50.0% | 40.5 | 160 | 7.2% | 0 |

### UDR — 24/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +12.3% | 39.1% | 16.2 | 0 | 33.6% | 0 |
| ADX > 15 | 16 | +11.2% | 56.3% | 20.2 | 32 | 29.4% | 0 |
| ADX > 20 | 11 | +5.7% | 54.5% | 18.7 | 111 | 18.9% | 0 |
| ADX > 25 | 7 | +0.8% | 42.9% | 18.4 | 166 | 11.6% | 0 |
| ADX > 30 | 4 | -3.1% | 25.0% | 16.5 | 209 | 5.9% | 0 |

### UHS — 26/48 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 10 | +129.5% | 80.0% | 40.3 | 0 | 36.6% | 0 |
| ADX > 15 | 10 | +130.8% | 80.0% | 40.0 | 1 | 36.4% | 0 |
| ADX > 20 | 9 | +60.2% | 77.8% | 38.1 | 33 | 30.9% | 0 |
| ADX > 25 | 7 | +52.7% | 85.7% | 41.9 | 66 | 26.5% | 0 |
| ADX > 30 | 7 | +44.3% | 71.4% | 38.4 | 84 | 24.1% | 0 |

### ULTA — 14/34 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +63.9% | 48.1% | 15.7 | 0 | 38.4% | 1 |
| ADX > 15 | 26 | +73.9% | 50.0% | 16.0 | 4 | 37.9% | 1 |
| ADX > 20 | 23 | +43.3% | 47.8% | 16.0 | 38 | 33.4% | 1 |
| ADX > 25 | 19 | +21.9% | 42.1% | 15.0 | 96 | 25.7% | 1 |
| ADX > 30 | 14 | +3.6% | 35.7% | 14.6 | 152 | 18.5% | 0 |

### UNH — 30/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 15 | +1.2% | 26.7% | 17.1 | 0 | 23.5% | 0 |
| ADX > 15 | 14 | +3.2% | 28.6% | 17.5 | 8 | 22.5% | 0 |
| ADX > 20 | 11 | +9.4% | 36.4% | 19.5 | 27 | 19.9% | 0 |
| ADX > 25 | 5 | +15.1% | 80.0% | 37.8 | 46 | 17.4% | 0 |
| ADX > 30 | 5 | +15.4% | 80.0% | 37.0 | 48 | 17.2% | 0 |

### UNP — 16/68 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | +14.5% | 50.0% | 12.0 | 0 | 28.3% | 0 |
| ADX > 15 | 24 | +16.5% | 50.0% | 12.3 | 12 | 26.7% | 0 |
| ADX > 20 | 20 | +6.7% | 45.0% | 12.1 | 43 | 22.6% | 0 |
| ADX > 25 | 14 | -4.0% | 50.0% | 10.8 | 109 | 13.8% | 0 |
| ADX > 30 | 5 | +5.9% | 80.0% | 14.6 | 161 | 6.9% | 0 |

### UPS — 28/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 10 | -3.7% | 30.0% | 16.0 | 0 | 14.5% | 0 |
| ADX > 15 | 8 | -4.8% | 25.0% | 16.5 | 20 | 11.8% | 0 |
| ADX > 20 | 3 | +15.7% | 66.7% | 34.0 | 40 | 9.2% | 0 |
| ADX > 25 | 3 | +8.5% | 66.7% | 27.0 | 54 | 7.3% | 0 |
| ADX > 30 | 2 | +11.2% | 100.0% | 35.0 | 63 | 6.1% | 0 |

### URI — 18/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 33 | +61.8% | 45.5% | 14.5 | 0 | 43.8% | 0 |
| ADX > 15 | 33 | +29.0% | 39.4% | 14.1 | 9 | 42.2% | 0 |
| ADX > 20 | 30 | +27.3% | 40.0% | 14.7 | 26 | 39.9% | 0 |
| ADX > 25 | 24 | -17.0% | 41.7% | 14.5 | 82 | 31.4% | 0 |
| ADX > 30 | 16 | -3.2% | 56.3% | 15.3 | 150 | 22.3% | 0 |

### USB — 26/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | +47.5% | 64.7% | 27.7 | 0 | 43.4% | 0 |
| ADX > 15 | 17 | +37.1% | 64.7% | 26.9 | 5 | 42.2% | 0 |
| ADX > 20 | 14 | +27.0% | 64.3% | 30.1 | 26 | 38.7% | 0 |
| ADX > 25 | 11 | +16.3% | 54.5% | 31.3 | 72 | 31.0% | 0 |
| ADX > 30 | 9 | -13.7% | 22.2% | 27.1 | 143 | 21.5% | 0 |

### V — 12/100 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 31 | +7.9% | 38.7% | 11.7 | 0 | 32.7% | 0 |
| ADX > 15 | 30 | +3.6% | 40.0% | 11.5 | 12 | 31.1% | 0 |
| ADX > 20 | 26 | -3.4% | 30.8% | 11.4 | 48 | 26.3% | 0 |
| ADX > 25 | 23 | -19.3% | 30.4% | 9.7 | 96 | 20.1% | 0 |
| ADX > 30 | 11 | -1.4% | 36.4% | 9.5 | 174 | 9.4% | 0 |

### VICI — 16/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +1.2% | 44.4% | 13.7 | 0 | 23.0% | 0 |
| ADX > 15 | 12 | +3.3% | 50.0% | 14.8 | 46 | 16.9% | 0 |
| ADX > 20 | 12 | -3.9% | 41.7% | 14.0 | 53 | 16.0% | 0 |
| ADX > 25 | 10 | -1.2% | 40.0% | 14.4 | 73 | 13.3% | 0 |
| ADX > 30 | 7 | -0.0% | 28.6% | 14.4 | 101 | 9.3% | 0 |

### VLO — 16/66 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 24 | +63.6% | 37.5% | 15.3 | 0 | 36.2% | 1 |
| ADX > 15 | 23 | +48.1% | 34.8% | 14.6 | 22 | 33.2% | 1 |
| ADX > 20 | 19 | +33.9% | 36.8% | 15.5 | 51 | 29.4% | 1 |
| ADX > 25 | 12 | +24.7% | 41.7% | 16.8 | 121 | 20.1% | 1 |
| ADX > 30 | 9 | +17.3% | 33.3% | 18.0 | 152 | 16.0% | 1 |

### VLTO — 24/86 SMA, 736 bars, 2023-09-27 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +45.9% | 52.6% | 18.2 | 0 | 32.6% | 0 |
| ADX > 15 | 16 | +41.8% | 56.3% | 20.9 | 7 | 31.7% | 0 |
| ADX > 20 | 13 | +34.9% | 61.5% | 21.8 | 41 | 27.0% | 0 |
| ADX > 25 | 8 | +11.1% | 62.5% | 22.8 | 113 | 17.3% | 0 |
| ADX > 30 | 6 | -4.0% | 16.7% | 17.8 | 168 | 9.8% | 0 |

### VMC — 28/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +8.7% | 31.6% | 17.5 | 0 | 30.7% | 0 |
| ADX > 15 | 18 | -4.5% | 33.3% | 15.2 | 41 | 25.3% | 0 |
| ADX > 20 | 12 | -3.8% | 33.3% | 19.6 | 68 | 21.7% | 0 |
| ADX > 25 | 8 | -4.4% | 25.0% | 19.9 | 121 | 14.6% | 0 |
| ADX > 30 | 6 | -9.5% | 16.7% | 18.8 | 154 | 10.2% | 0 |

### VRSK — 14/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | +6.7% | 36.4% | 12.2 | 0 | 25.0% | 0 |
| ADX > 15 | 20 | +3.8% | 40.0% | 11.8 | 22 | 22.1% | 0 |
| ADX > 20 | 15 | +9.0% | 46.7% | 11.9 | 66 | 16.2% | 0 |
| ADX > 25 | 8 | -1.4% | 50.0% | 14.6 | 109 | 10.5% | 0 |
| ADX > 30 | 6 | -8.1% | 33.3% | 16.8 | 121 | 8.9% | 0 |

### VRSN — 16/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +23.2% | 44.4% | 12.7 | 0 | 32.2% | 1 |
| ADX > 15 | 27 | +16.0% | 44.4% | 12.5 | 4 | 31.6% | 1 |
| ADX > 20 | 18 | +29.8% | 44.4% | 14.4 | 66 | 23.7% | 0 |
| ADX > 25 | 12 | +3.3% | 33.3% | 14.8 | 124 | 16.0% | 0 |
| ADX > 30 | 10 | -2.4% | 30.0% | 15.4 | 141 | 13.7% | 0 |

### VRT — 30/42 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | +425.0% | 64.7% | 34.3 | 0 | 53.7% | 0 |
| ADX > 15 | 16 | +398.7% | 68.8% | 35.1 | 3 | 51.7% | 0 |
| ADX > 20 | 10 | +302.8% | 90.0% | 49.7 | 29 | 45.7% | 0 |
| ADX > 25 | 9 | +113.7% | 77.8% | 47.8 | 77 | 39.4% | 0 |
| ADX > 30 | 7 | +58.6% | 71.4% | 43.0 | 163 | 27.9% | 0 |

### VRTX — 26/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 26 | -7.8% | 34.6% | 15.9 | 0 | 40.6% | 1 |
| ADX > 15 | 25 | -9.9% | 32.0% | 15.8 | 9 | 39.4% | 1 |
| ADX > 20 | 18 | -13.8% | 27.8% | 16.9 | 75 | 30.5% | 1 |
| ADX > 25 | 10 | +0.3% | 50.0% | 21.9 | 138 | 21.1% | 1 |
| ADX > 30 | 7 | -12.3% | 28.6% | 21.1 | 189 | 14.4% | 1 |

### VST — 30/98 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 18 | +51.7% | 33.3% | 20.4 | 0 | 33.5% | 0 |
| ADX > 15 | 12 | +76.0% | 50.0% | 28.6 | 17 | 31.3% | 0 |
| ADX > 20 | 10 | +92.1% | 60.0% | 33.3 | 23 | 30.5% | 0 |
| ADX > 25 | 8 | +80.3% | 62.5% | 33.8 | 67 | 24.6% | 0 |
| ADX > 30 | 6 | +47.5% | 66.7% | 37.2 | 98 | 20.5% | 0 |

### VTR — 8/94 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 42 | +31.3% | 50.0% | 10.6 | 0 | 41.4% | 0 |
| ADX > 15 | 42 | +26.3% | 47.6% | 10.5 | 3 | 41.0% | 0 |
| ADX > 20 | 36 | +20.9% | 50.0% | 10.5 | 46 | 35.2% | 0 |
| ADX > 25 | 32 | +18.5% | 46.9% | 10.9 | 67 | 32.4% | 0 |
| ADX > 30 | 18 | +19.7% | 50.0% | 12.2 | 157 | 20.5% | 0 |

### VTRS — 8/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 41 | +77.1% | 31.7% | 10.1 | 0 | 37.4% | 0 |
| ADX > 15 | 36 | +69.1% | 33.3% | 10.2 | 36 | 32.6% | 0 |
| ADX > 20 | 30 | +54.6% | 33.3% | 9.4 | 95 | 24.7% | 0 |
| ADX > 25 | 20 | +33.8% | 30.0% | 9.9 | 146 | 17.3% | 0 |
| ADX > 30 | 17 | +20.2% | 23.5% | 9.4 | 171 | 14.0% | 0 |

### VZ — 28/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +2.0% | 32.1% | 13.5 | 0 | 37.4% | 1 |
| ADX > 15 | 23 | -0.7% | 34.8% | 14.2 | 21 | 32.7% | 1 |
| ADX > 20 | 15 | +6.1% | 40.0% | 16.2 | 86 | 23.4% | 1 |
| ADX > 25 | 9 | +5.8% | 44.4% | 21.8 | 120 | 18.5% | 0 |
| ADX > 30 | 9 | -8.2% | 33.3% | 17.9 | 142 | 15.2% | 0 |

### WAB — 30/44 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 14 | +80.1% | 42.9% | 43.9 | 0 | 56.1% | 0 |
| ADX > 15 | 13 | +71.4% | 46.2% | 46.5 | 7 | 55.2% | 0 |
| ADX > 20 | 9 | +60.9% | 55.6% | 60.6 | 51 | 49.3% | 0 |
| ADX > 25 | 6 | +41.5% | 66.7% | 66.0 | 123 | 36.0% | 0 |
| ADX > 30 | 5 | +44.1% | 80.0% | 68.4 | 160 | 31.1% | 0 |

### WAT — 18/56 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +28.9% | 43.5% | 19.4 | 0 | 40.2% | 0 |
| ADX > 15 | 19 | +31.1% | 52.6% | 21.3 | 24 | 37.0% | 0 |
| ADX > 20 | 15 | +8.4% | 40.0% | 20.9 | 87 | 28.6% | 0 |
| ADX > 25 | 9 | -7.0% | 33.3% | 15.3 | 209 | 12.5% | 0 |
| ADX > 30 | 7 | -2.2% | 28.6% | 15.1 | 229 | 9.8% | 0 |

### WBD — 30/50 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 15 | +172.0% | 33.3% | 21.9 | 0 | 30.9% | 1 |
| ADX > 15 | 12 | +118.5% | 33.3% | 25.4 | 11 | 28.9% | 1 |
| ADX > 20 | 7 | +91.9% | 57.1% | 36.6 | 37 | 24.5% | 1 |
| ADX > 25 | 5 | +93.1% | 60.0% | 49.4 | 43 | 23.7% | 1 |
| ADX > 30 | 3 | +94.0% | 100.0% | 76.3 | 61 | 21.3% | 1 |

### WDAY — 10/36 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 30 | +57.3% | 50.0% | 8.5 | 0 | 24.1% | 1 |
| ADX > 15 | 21 | +26.4% | 52.4% | 10.4 | 29 | 20.2% | 1 |
| ADX > 20 | 17 | +2.0% | 47.1% | 9.5 | 68 | 15.0% | 1 |
| ADX > 25 | 13 | +14.1% | 38.5% | 9.0 | 101 | 10.6% | 1 |
| ADX > 30 | 11 | +23.4% | 45.5% | 8.7 | 114 | 8.9% | 1 |

### WDC — 30/40 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +775.0% | 52.6% | 35.2 | 0 | 60.6% | 0 |
| ADX > 15 | 18 | +644.7% | 50.0% | 35.9 | 16 | 58.5% | 0 |
| ADX > 20 | 10 | +674.8% | 90.0% | 56.5 | 69 | 51.1% | 0 |
| ADX > 25 | 8 | +552.1% | 75.0% | 65.6 | 98 | 47.2% | 0 |
| ADX > 30 | 8 | +336.9% | 50.0% | 60.3 | 126 | 43.5% | 0 |

### WEC — 12/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +17.7% | 42.9% | 14.6 | 0 | 37.9% | 0 |
| ADX > 15 | 23 | +11.5% | 39.1% | 14.1 | 57 | 30.3% | 0 |
| ADX > 20 | 17 | +22.8% | 47.1% | 16.8 | 83 | 26.9% | 0 |
| ADX > 25 | 13 | +8.6% | 30.8% | 15.4 | 140 | 18.6% | 0 |
| ADX > 30 | 10 | +1.9% | 30.0% | 12.9 | 189 | 12.1% | 0 |

### WELL — 12/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 49 | +71.4% | 36.7% | 12.1 | 0 | 55.3% | 1 |
| ADX > 15 | 38 | +73.3% | 44.7% | 14.3 | 35 | 50.8% | 0 |
| ADX > 20 | 31 | +55.0% | 51.6% | 14.8 | 90 | 42.8% | 0 |
| ADX > 25 | 25 | +28.3% | 44.0% | 13.6 | 172 | 31.9% | 0 |
| ADX > 30 | 16 | +32.1% | 56.3% | 13.3 | 262 | 19.9% | 0 |

### WFC — 10/74 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 45 | +10.9% | 40.0% | 9.3 | 0 | 38.4% | 1 |
| ADX > 15 | 42 | +6.9% | 42.9% | 9.6 | 17 | 36.4% | 0 |
| ADX > 20 | 36 | -3.3% | 36.1% | 8.9 | 70 | 29.4% | 0 |
| ADX > 25 | 20 | -2.2% | 35.0% | 9.2 | 165 | 16.8% | 0 |
| ADX > 30 | 12 | +3.3% | 50.0% | 8.9 | 213 | 9.8% | 0 |

### WM — 28/30 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 27 | +13.4% | 25.9% | 18.0 | 0 | 44.0% | 0 |
| ADX > 15 | 25 | +3.8% | 24.0% | 18.2 | 14 | 41.5% | 0 |
| ADX > 20 | 10 | +7.5% | 40.0% | 31.1 | 106 | 28.7% | 0 |
| ADX > 25 | 6 | -1.6% | 33.3% | 40.5 | 149 | 22.5% | 0 |
| ADX > 30 | 5 | -1.9% | 40.0% | 40.6 | 179 | 18.5% | 0 |

### WMB — 16/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +24.8% | 33.3% | 11.3 | 0 | 40.3% | 0 |
| ADX > 15 | 31 | +7.7% | 38.7% | 12.1 | 48 | 33.8% | 0 |
| ADX > 20 | 25 | +10.8% | 44.0% | 12.1 | 100 | 27.0% | 0 |
| ADX > 25 | 17 | +5.4% | 41.2% | 12.4 | 159 | 18.9% | 0 |
| ADX > 30 | 14 | -6.2% | 35.7% | 11.0 | 196 | 14.0% | 0 |

### WMT — 10/50 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +40.1% | 48.7% | 11.8 | 0 | 43.2% | 0 |
| ADX > 15 | 33 | +47.8% | 54.5% | 12.6 | 31 | 39.1% | 0 |
| ADX > 20 | 25 | +40.0% | 56.0% | 13.5 | 87 | 31.4% | 0 |
| ADX > 25 | 20 | +27.5% | 55.0% | 13.5 | 132 | 25.4% | 0 |
| ADX > 30 | 16 | +20.7% | 62.5% | 13.2 | 174 | 19.8% | 0 |

### WRB — 26/70 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 19 | +26.4% | 36.8% | 22.1 | 0 | 38.2% | 0 |
| ADX > 15 | 17 | +10.6% | 35.3% | 22.1 | 32 | 33.9% | 0 |
| ADX > 20 | 11 | +2.7% | 36.4% | 23.6 | 109 | 23.7% | 0 |
| ADX > 25 | 8 | -12.0% | 37.5% | 26.9 | 139 | 19.7% | 0 |
| ADX > 30 | 5 | +2.1% | 40.0% | 30.2 | 184 | 13.7% | 0 |

### WSM — 10/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +48.6% | 43.6% | 9.4 | 0 | 33.6% | 0 |
| ADX > 15 | 38 | +37.6% | 44.7% | 9.6 | 4 | 33.1% | 0 |
| ADX > 20 | 27 | +87.6% | 63.0% | 11.4 | 43 | 27.9% | 0 |
| ADX > 25 | 22 | +34.3% | 50.0% | 10.6 | 95 | 20.9% | 0 |
| ADX > 30 | 15 | +37.4% | 60.0% | 11.3 | 140 | 14.9% | 0 |

### WST — 28/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 25 | +1.1% | 20.0% | 18.7 | 0 | 42.4% | 0 |
| ADX > 15 | 21 | -4.3% | 23.8% | 20.5 | 16 | 39.2% | 0 |
| ADX > 20 | 11 | -7.5% | 36.4% | 25.8 | 89 | 26.1% | 0 |
| ADX > 25 | 9 | -17.5% | 44.4% | 28.4 | 104 | 23.4% | 0 |
| ADX > 30 | 4 | -12.3% | 50.0% | 39.5 | 159 | 14.5% | 0 |

### WTW — 28/38 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +61.8% | 43.5% | 21.0 | 0 | 44.3% | 0 |
| ADX > 15 | 22 | +50.0% | 45.5% | 20.6 | 20 | 41.6% | 0 |
| ADX > 20 | 12 | +16.2% | 50.0% | 27.0 | 108 | 29.9% | 0 |
| ADX > 25 | 6 | +16.7% | 66.7% | 43.3 | 152 | 24.1% | 0 |
| ADX > 30 | 6 | -0.5% | 50.0% | 37.8 | 177 | 20.7% | 0 |

### WY — 20/90 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 15 | -4.4% | 20.0% | 9.7 | 0 | 12.8% | 0 |
| ADX > 15 | 12 | -5.2% | 25.0% | 9.8 | 16 | 10.6% | 0 |
| ADX > 20 | 4 | +4.4% | 25.0% | 16.5 | 52 | 5.9% | 0 |
| ADX > 25 | 4 | +3.4% | 25.0% | 16.0 | 54 | 5.6% | 0 |
| ADX > 30 | 3 | -6.5% | 0.0% | 17.0 | 63 | 4.4% | 0 |

### WYNN — 22/80 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | +6.6% | 29.4% | 15.9 | 0 | 24.2% | 0 |
| ADX > 15 | 15 | -6.9% | 26.7% | 16.3 | 16 | 22.1% | 0 |
| ADX > 20 | 13 | -13.7% | 30.8% | 15.5 | 45 | 18.2% | 0 |
| ADX > 25 | 8 | -9.6% | 25.0% | 19.9 | 75 | 14.2% | 0 |
| ADX > 30 | 6 | -16.9% | 0.0% | 21.3 | 95 | 11.6% | 0 |

### XEL — 8/52 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 47 | +6.7% | 36.2% | 7.4 | 0 | 32.4% | 0 |
| ADX > 15 | 24 | +3.3% | 37.5% | 9.7 | 80 | 21.7% | 0 |
| ADX > 20 | 17 | +7.6% | 47.1% | 10.4 | 119 | 16.5% | 0 |
| ADX > 25 | 14 | +2.7% | 35.7% | 9.9 | 145 | 13.0% | 0 |
| ADX > 30 | 8 | +3.0% | 25.0% | 10.5 | 179 | 8.0% | 0 |

### XOM — 22/66 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 28 | +11.0% | 28.6% | 13.1 | 0 | 34.0% | 1 |
| ADX > 15 | 19 | +15.7% | 36.8% | 15.8 | 45 | 28.1% | 1 |
| ADX > 20 | 10 | +23.1% | 50.0% | 19.5 | 117 | 18.5% | 1 |
| ADX > 25 | 6 | +18.3% | 66.7% | 27.0 | 146 | 14.9% | 0 |
| ADX > 30 | 3 | +20.7% | 100.0% | 39.3 | 177 | 10.8% | 0 |

### XYL — 30/72 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 17 | +17.2% | 35.3% | 20.8 | 0 | 32.7% | 0 |
| ADX > 15 | 17 | +13.8% | 35.3% | 20.1 | 9 | 31.5% | 0 |
| ADX > 20 | 14 | +9.5% | 35.7% | 22.2 | 30 | 28.7% | 0 |
| ADX > 25 | 10 | -2.8% | 20.0% | 24.4 | 79 | 22.2% | 0 |
| ADX > 30 | 7 | -8.6% | 28.6% | 23.4 | 137 | 14.5% | 0 |

### XYZ — 30/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 23 | +24.0% | 30.4% | 17.0 | 0 | 36.0% | 0 |
| ADX > 15 | 17 | +1.9% | 29.4% | 19.1 | 38 | 30.1% | 0 |
| ADX > 20 | 10 | +2.2% | 30.0% | 24.6 | 94 | 22.7% | 0 |
| ADX > 25 | 7 | +1.7% | 28.6% | 21.9 | 159 | 14.1% | 0 |
| ADX > 30 | 3 | +2.1% | 33.3% | 27.3 | 208 | 7.6% | 0 |

### YUM — 12/32 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 33 | -2.0% | 42.4% | 10.3 | 0 | 30.5% | 1 |
| ADX > 15 | 26 | -10.6% | 34.6% | 10.8 | 43 | 24.9% | 0 |
| ADX > 20 | 19 | -14.5% | 36.8% | 12.0 | 76 | 19.9% | 0 |
| ADX > 25 | 11 | -14.0% | 27.3% | 10.4 | 139 | 10.2% | 0 |
| ADX > 30 | 6 | -9.7% | 33.3% | 9.8 | 175 | 5.5% | 0 |

### ZBH — 16/52 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 22 | -4.0% | 40.9% | 12.4 | 0 | 25.4% | 0 |
| ADX > 15 | 20 | -12.7% | 35.0% | 12.3 | 20 | 22.7% | 0 |
| ADX > 20 | 13 | -5.8% | 46.2% | 13.2 | 73 | 15.7% | 0 |
| ADX > 25 | 11 | -7.4% | 45.5% | 12.7 | 96 | 12.6% | 0 |
| ADX > 30 | 7 | -5.0% | 42.9% | 12.1 | 132 | 7.8% | 0 |

### ZBRA — 8/84 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 39 | +58.0% | 43.6% | 9.6 | 0 | 33.8% | 0 |
| ADX > 15 | 38 | +37.2% | 42.1% | 9.4 | 11 | 32.3% | 0 |
| ADX > 20 | 31 | -3.0% | 41.9% | 8.5 | 75 | 23.8% | 0 |
| ADX > 25 | 23 | -13.3% | 43.5% | 7.1 | 143 | 14.8% | 0 |
| ADX > 30 | 14 | -16.6% | 50.0% | 6.6 | 189 | 8.6% | 0 |

### ZTS — 26/58 SMA, 752 bars, 2023-09-05 → 2026-09-02

| Threshold | Trades | Return % | Win rate | Avg hold (days) | Entries blocked | Time in market | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 12 | -2.7% | 25.0% | 17.3 | 0 | 18.9% | 0 |
| ADX > 15 | 12 | -3.7% | 25.0% | 16.2 | 8 | 17.8% | 0 |
| ADX > 20 | 5 | +5.5% | 40.0% | 23.4 | 62 | 10.6% | 0 |
| ADX > 25 | 3 | +1.5% | 33.3% | 21.3 | 99 | 5.7% | 0 |
| ADX > 30 | 1 | -3.0% | 0.0% | 34.0 | 121 | 2.8% | 0 |

## Skipped symbols

| Symbol | Reason |
| --- | --- |
| BF.B | no bars in daily_stock_data |
| BK | no bars in daily_stock_data |
| BRK.B | no bars in daily_stock_data |
| CBOE | no bars in daily_stock_data |
| CTRA | no bars in daily_stock_data |
| HOLX | no bars in daily_stock_data |
| NVR | no bars in daily_stock_data |

