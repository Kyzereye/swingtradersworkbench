/** Catalog for the Systems tab — from docs/tech-systems.md (The combined). */

export const SYSTEM_SECTIONS = [
  {
    id: "trend-following",
    title: "Trend-following",
    systems: [
      {
        id: "ma-crossover",
        name: "Moving average crossover",
        blurb: "Fast MA crosses slow MA (or price vs MA) for entries/exits.",
      },
      {
        id: "triple-ma",
        name: "Triple Moving Average Alignment",
        blurb: "Long only when fast > medium > slow (full stack).",
      },
      {
        id: "donchian",
        name: "Donchian Breakout (Turtle)",
        blurb: "Buy N-day high break, sell N-day low break.",
      },
      {
        id: "darvas",
        name: "Darvas Box",
        blurb: "Box from new highs; buy break of top, trail stop up on later box floors.",
      },
      {
        id: "keltner",
        name: "Keltner Channel Trend",
        blurb: "ATR envelope around EMA; long on close above upper band.",
      },
      {
        id: "ichimoku",
        name: "Ichimoku Kinko Hyo",
        blurb: "Cloud + Tenkan/Kijun; trade cloud exits with line confirmation.",
      },
    ],
  },
  {
    id: "mean-reversion",
    title: "Mean-reversion & volatility",
    systems: [
      {
        id: "bollinger-squeeze",
        name: "Bollinger Band Squeeze & Reversion",
        blurb: "Trade squeeze breakouts; exit toward middle band.",
      },
      {
        id: "rsi",
        name: "RSI mean reversion / failure swing",
        blurb: "Fade extremes, or trade RSI failure-swing reversals.",
      },
      {
        id: "vwap-reversion",
        name: "VWAP Reversion",
        blurb: "Fade large stretches from VWAP back to VWAP.",
      },
      {
        id: "macd",
        name: "MACD system",
        blurb: "Signal-line cross, zero-line cross, histogram turns.",
      },
    ],
  },
  {
    id: "price-action",
    title: "Price action & structure",
    systems: [
      {
        id: "support-resistance",
        name: "Support / resistance & swing structure",
        blurb: "Higher highs/lows, breaks and retests.",
      },
      {
        id: "smc",
        name: "Market Structure / Smart Money Concepts (SMC)",
        blurb: "Liquidity sweeps, ChoCH, FVGs / order blocks.",
      },
      {
        id: "wyckoff",
        name: "Wyckoff Accumulation / Distribution",
        blurb: "Spring, sign of strength, phase mapping.",
      },
      {
        id: "candlestick-reversal",
        name: "Japanese Candlestick Reversal",
        blurb: "Multi-bar patterns at major support/resistance.",
      },
      {
        id: "thestrat",
        name: "TheStrat multi-timeframe",
        blurb: "Candle types 1/2/3 with multi-timeframe continuity setups.",
      },
      {
        id: "fibonacci",
        name: "Fibonacci retracement / extension",
        blurb: "Pullback entries and targets in a trend.",
      },
      {
        id: "harmonic",
        name: "Gartley / Harmonic Pattern",
        blurb: "Fibonacci geometry (Gartley, Bat, Butterfly, Crab) at PRZ.",
      },
      {
        id: "elliott",
        name: "Elliott Wave",
        blurb: "Impulse/corrective wave counts for direction and targets.",
      },
      {
        id: "point-figure",
        name: "Point & figure",
        blurb: "Box/reversal columns, breaks and count targets.",
      },
    ],
  },
  {
    id: "range-breakout",
    title: "Range, breakout & other",
    systems: [
      {
        id: "orb",
        name: "Opening Range Breakout (ORB)",
        blurb: "Break first 15–30 min high/low, often with volume.",
      },
      {
        id: "volume-profile",
        name: "Volume Profile POC",
        blurb: "Trade around POC / through low-volume nodes.",
      },
      {
        id: "mtf-alignment",
        name: "Multi-timeframe trend alignment",
        blurb: "Higher-TF trend filter + lower-TF entry.",
      },
      {
        id: "seasonality",
        name: "Seasonality / calendar",
        blurb: "Month, turn-of-month, earnings/window timing.",
      },
    ],
  },
];
