import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getPool } from "./db.js";
import { incrementPageview } from "./pageviews.js";
import {
  listScanDates,
  loadScanForDate,
  loadScanForLatestDate,
  loadOptimizedMaForSymbol,
  loadTopPerformers,
  loadMaCrossoverTopPerformers,
  loadMaCrossoverYesterdaySignals,
  loadMaCrossoverPairForSymbol,
  loadMaCrossoverDowStocks,
  loadTripleMaDowStocks,
  loadTripleMaPairForSymbol,
  loadTripleMaYesterdaySignals,
  loadTripleMaTopPerformers,
  loadMacdPairForSymbol,
  loadMacdYesterdaySignals,
  loadMacdTopPerformers,
  loadMacdDowStocks,
  loadRsiPairForSymbol,
  loadRsiYesterdaySignals,
  loadRsiTopPerformers,
  loadRsiDowStocks,
  loadDonchianPairForSymbol,
  loadDonchianYesterdaySignals,
  loadDonchianTopPerformers,
  loadDonchianDowStocks,
  loadKeltnerPairForSymbol,
  loadKeltnerYesterdaySignals,
  loadKeltnerTopPerformers,
  loadKeltnerDowStocks,
  loadBollingerPairForSymbol,
  loadBollingerYesterdaySignals,
  loadBollingerTopPerformers,
  loadBollingerDowStocks,
  loadDarvasPairForSymbol,
  loadDarvasYesterdaySignals,
  loadDarvasTopPerformers,
  loadDarvasDowStocks,
  loadFibonacciPairForSymbol,
  loadFibonacciYesterdaySignals,
  loadFibonacciTopPerformers,
  loadFibonacciDowStocks,
  parseTopPerformerQuery,
  searchSymbols,
} from "./scanData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const HISTORY_YEARS = Number(process.env.HISTORY_YEARS) || 3;

function historyStartDate(years) {
  const y = Math.max(1, Math.min(50, Math.floor(years)));
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  return d.toISOString().slice(0, 10);
}

function normalizeSymbol(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase();
  if (!/^[A-Z0-9.\-^]{1,32}$/.test(s)) return null;
  return s;
}

function normalizeDate(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

const app = express();
const CORS_ORIGINS = new Set([
  FRONTEND_URL,
  FRONTEND_URL.replace("localhost", "127.0.0.1"),
]);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CORS_ORIGINS.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "dbma-trading-backend" });
});

app.post("/api/pageview", async (req, res) => {
  try {
    await incrementPageview(req.get("user-agent"));
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Pageview update failed" });
  }
});

app.get("/api/symbols", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20)
  );

  try {
    const symbols = await searchSymbols(q, limit);
    res.json({ symbols });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Symbol search failed",
    });
  }
});

app.get("/api/dashboard/top-performers", async (req, res) => {
  try {
    const filters = parseTopPerformerQuery(req.query);
    const result = await loadTopPerformers(filters);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Top performers query failed",
    });
  }
});

app.get("/api/systems/ma-crossover/top-performers", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "50"), 10) || 50)
  );
  try {
    const result = await loadMaCrossoverTopPerformers(topN);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "MA crossover top performers query failed",
    });
  }
});

app.get("/api/systems/ma-crossover/yesterday-signals", async (_req, res) => {
  try {
    const result = await loadMaCrossoverYesterdaySignals();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "MA crossover yesterday signals query failed",
    });
  }
});

app.get("/api/systems/ma-crossover/pair", async (req, res) => {
  const symbol = normalizeSymbol(
    typeof req.query.symbol === "string" ? req.query.symbol : ""
  );
  if (!symbol) {
    res.status(400).json({ error: "Query param symbol is required" });
    return;
  }
  try {
    const pair = await loadMaCrossoverPairForSymbol(symbol);
    res.json({ symbol, pair });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "MA crossover pair query failed",
    });
  }
});

app.get("/api/systems/ma-crossover/dow", async (_req, res) => {
  try {
    const result = await loadMaCrossoverDowStocks();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "MA crossover Dow stocks query failed",
    });
  }
});

app.get("/api/systems/triple-ma/dow", async (_req, res) => {
  try {
    const result = await loadTripleMaDowStocks();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Triple MA Dow stocks query failed",
    });
  }
});

app.get("/api/systems/triple-ma/yesterday-signals", async (_req, res) => {
  try {
    const result = await loadTripleMaYesterdaySignals();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Triple MA yesterday signals query failed",
    });
  }
});

app.get("/api/systems/triple-ma/pair", async (req, res) => {
  const symbol = normalizeSymbol(
    typeof req.query.symbol === "string" ? req.query.symbol : ""
  );
  if (!symbol) {
    res.status(400).json({ error: "Query param symbol is required" });
    return;
  }
  try {
    const pair = await loadTripleMaPairForSymbol(symbol);
    res.json({ symbol, pair });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Triple MA pair query failed",
    });
  }
});

app.get("/api/systems/triple-ma/top-performers", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "50"), 10) || 50)
  );
  try {
    const result = await loadTripleMaTopPerformers(topN);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Triple MA top performers query failed",
    });
  }
});

app.get("/api/systems/macd/pair", async (req, res) => {
  const symbol = normalizeSymbol(
    typeof req.query.symbol === "string" ? req.query.symbol : ""
  );
  if (!symbol) {
    res.status(400).json({ error: "Query param symbol is required" });
    return;
  }
  try {
    const pair = await loadMacdPairForSymbol(symbol);
    res.json({ symbol, pair });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "MACD pair query failed",
    });
  }
});

app.get("/api/systems/macd/yesterday-signals", async (_req, res) => {
  try {
    const result = await loadMacdYesterdaySignals();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "MACD yesterday signals query failed",
    });
  }
});

app.get("/api/systems/macd/top-performers", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "50"), 10) || 50)
  );
  try {
    const result = await loadMacdTopPerformers(topN);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "MACD top performers query failed",
    });
  }
});

app.get("/api/systems/macd/dow", async (_req, res) => {
  try {
    const result = await loadMacdDowStocks();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "MACD Dow stocks query failed",
    });
  }
});

app.get("/api/systems/rsi/pair", async (req, res) => {
  const symbol = normalizeSymbol(
    typeof req.query.symbol === "string" ? req.query.symbol : ""
  );
  if (!symbol) {
    res.status(400).json({ error: "Query param symbol is required" });
    return;
  }
  try {
    const pair = await loadRsiPairForSymbol(symbol);
    res.json({ symbol, pair });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "RSI pair query failed",
    });
  }
});

app.get("/api/systems/rsi/yesterday-signals", async (_req, res) => {
  try {
    const result = await loadRsiYesterdaySignals();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "RSI yesterday signals query failed",
    });
  }
});

app.get("/api/systems/rsi/top-performers", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "50"), 10) || 50)
  );
  try {
    const result = await loadRsiTopPerformers(topN);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "RSI top performers query failed",
    });
  }
});

app.get("/api/systems/rsi/dow", async (_req, res) => {
  try {
    const result = await loadRsiDowStocks();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "RSI Dow stocks query failed",
    });
  }
});

app.get("/api/systems/donchian/pair", async (req, res) => {
  const symbol = normalizeSymbol(
    typeof req.query.symbol === "string" ? req.query.symbol : ""
  );
  if (!symbol) {
    res.status(400).json({ error: "Query param symbol is required" });
    return;
  }
  try {
    const pair = await loadDonchianPairForSymbol(symbol);
    res.json({ symbol, pair });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Donchian pair query failed",
    });
  }
});

app.get("/api/systems/donchian/yesterday-signals", async (_req, res) => {
  try {
    const result = await loadDonchianYesterdaySignals();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Donchian yesterday signals query failed",
    });
  }
});

app.get("/api/systems/donchian/top-performers", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "50"), 10) || 50)
  );
  try {
    const result = await loadDonchianTopPerformers(topN);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Donchian top performers query failed",
    });
  }
});

app.get("/api/systems/donchian/dow", async (_req, res) => {
  try {
    const result = await loadDonchianDowStocks();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Donchian Dow stocks query failed",
    });
  }
});

app.get("/api/systems/keltner/pair", async (req, res) => {
  const symbol = normalizeSymbol(
    typeof req.query.symbol === "string" ? req.query.symbol : ""
  );
  if (!symbol) {
    res.status(400).json({ error: "Query param symbol is required" });
    return;
  }
  try {
    const pair = await loadKeltnerPairForSymbol(symbol);
    res.json({ symbol, pair });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Keltner pair query failed",
    });
  }
});

app.get("/api/systems/keltner/yesterday-signals", async (_req, res) => {
  try {
    const result = await loadKeltnerYesterdaySignals();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Keltner yesterday signals query failed",
    });
  }
});

app.get("/api/systems/keltner/top-performers", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "50"), 10) || 50)
  );
  try {
    const result = await loadKeltnerTopPerformers(topN);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Keltner top performers query failed",
    });
  }
});

app.get("/api/systems/keltner/dow", async (_req, res) => {
  try {
    const result = await loadKeltnerDowStocks();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Keltner Dow stocks query failed",
    });
  }
});

app.get("/api/systems/bollinger-squeeze/pair", async (req, res) => {
  const symbol = normalizeSymbol(
    typeof req.query.symbol === "string" ? req.query.symbol : ""
  );
  if (!symbol) {
    res.status(400).json({ error: "Query param symbol is required" });
    return;
  }
  try {
    const pair = await loadBollingerPairForSymbol(symbol);
    res.json({ symbol, pair });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Bollinger pair query failed",
    });
  }
});

app.get("/api/systems/bollinger-squeeze/yesterday-signals", async (_req, res) => {
  try {
    const result = await loadBollingerYesterdaySignals();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Bollinger yesterday signals query failed",
    });
  }
});

app.get("/api/systems/bollinger-squeeze/top-performers", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "50"), 10) || 50)
  );
  try {
    const result = await loadBollingerTopPerformers(topN);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Bollinger top performers query failed",
    });
  }
});

app.get("/api/systems/bollinger-squeeze/dow", async (_req, res) => {
  try {
    const result = await loadBollingerDowStocks();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Bollinger Dow stocks query failed",
    });
  }
});

app.get("/api/systems/darvas/pair", async (req, res) => {
  const symbol = normalizeSymbol(
    typeof req.query.symbol === "string" ? req.query.symbol : ""
  );
  if (!symbol) {
    res.status(400).json({ error: "Query param symbol is required" });
    return;
  }
  try {
    const pair = await loadDarvasPairForSymbol(symbol);
    res.json({ symbol, pair });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Darvas pair query failed",
    });
  }
});

app.get("/api/systems/darvas/yesterday-signals", async (_req, res) => {
  try {
    const result = await loadDarvasYesterdaySignals();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Darvas yesterday signals query failed",
    });
  }
});

app.get("/api/systems/darvas/top-performers", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "50"), 10) || 50)
  );
  try {
    const result = await loadDarvasTopPerformers(topN);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Darvas top performers query failed",
    });
  }
});

app.get("/api/systems/darvas/dow", async (_req, res) => {
  try {
    const result = await loadDarvasDowStocks();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Darvas Dow stocks query failed",
    });
  }
});

app.get("/api/systems/fibonacci/pair", async (req, res) => {
  const symbol = normalizeSymbol(
    typeof req.query.symbol === "string" ? req.query.symbol : ""
  );
  if (!symbol) {
    res.status(400).json({ error: "Query param symbol is required" });
    return;
  }
  try {
    const pair = await loadFibonacciPairForSymbol(symbol);
    res.json({ symbol, pair });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Fibonacci pair query failed",
    });
  }
});

app.get("/api/systems/fibonacci/yesterday-signals", async (_req, res) => {
  try {
    const result = await loadFibonacciYesterdaySignals();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Fibonacci yesterday signals query failed",
    });
  }
});

app.get("/api/systems/fibonacci/top-performers", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "50"), 10) || 50)
  );
  try {
    const result = await loadFibonacciTopPerformers(topN);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Fibonacci top performers query failed",
    });
  }
});

app.get("/api/systems/fibonacci/dow", async (_req, res) => {
  try {
    const result = await loadFibonacciDowStocks();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Fibonacci Dow stocks query failed",
    });
  }
});

app.get("/api/scanner", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "25"), 10) || 25)
  );

  try {
    const { meta, rows } = await loadScanForLatestDate();
    if (!meta) {
      res.json({
        asOfDate: null,
        computedAt: null,
        total: 0,
        entries: [],
        exits: [],
        top: [],
      });
      return;
    }

    const entries = rows.filter((r) => r.lastSignal === "entry");
    const exits = rows.filter((r) => r.lastSignal === "exit");
    const byPnl = [...rows].sort((a, b) => b.runningTotal - a.runningTotal);

    res.json({
      asOfDate: meta.asOfDate,
      computedAt: meta.computedAt,
      total: rows.length,
      entries,
      exits,
      top: byPnl.slice(0, topN),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Scanner query failed",
    });
  }
});

app.get("/api/scanner/day", async (req, res) => {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.top ?? "25"), 10) || 25)
  );

  try {
    const availableDates = await listScanDates();
    if (!availableDates.length) {
      res.json({
        date: null,
        availableDates: [],
        computedAt: null,
        total: 0,
        entries: [],
        exits: [],
        inPosition: [],
        top: [],
      });
      return;
    }

    const requested = normalizeDate(
      typeof req.query.date === "string" ? req.query.date : ""
    );
    const date = requested ?? availableDates[0];

    if (requested && !availableDates.includes(requested)) {
      res.json({
        date: requested,
        hasScan: false,
        availableDates,
        computedAt: null,
        total: 0,
        entries: [],
        exits: [],
        inPosition: [],
        top: [],
      });
      return;
    }

    const scan = await loadScanForDate(date, { topN });
    res.json({
      date: scan.asOfDate,
      hasScan: true,
      availableDates,
      computedAt: scan.computedAt,
      total: scan.total,
      entries: scan.entries,
      exits: scan.exits,
      inPosition: scan.inPosition,
      top: scan.top,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Daily scanner query failed",
    });
  }
});

app.get("/api/daily-stock-data", async (req, res) => {
  const symbol = normalizeSymbol(req.query.symbol);
  if (!symbol) {
    res.status(400).json({ error: "Invalid or missing symbol" });
    return;
  }

  const startDate = historyStartDate(HISTORY_YEARS);
  const pool = getPool();

  try {
    const [rows] = await pool.execute(
      `
      SELECT d.date, d.open, d.high, d.low, d.close, d.volume, s.company_name
      FROM daily_stock_data d
      INNER JOIN stock_symbols s ON d.symbol_id = s.id
      WHERE s.symbol = ?
        AND d.date >= ?
      ORDER BY d.date ASC
      `,
      [symbol, startDate]
    );

    if (!rows.length) {
      res.status(404).json({ error: `No data for ${symbol}` });
      return;
    }

    const data = rows
      .map((row) => ({
        date:
          row.date instanceof Date
            ? row.date.toISOString().slice(0, 10)
            : String(row.date).slice(0, 10),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      }));

    const optimizedMa = await loadOptimizedMaForSymbol(symbol);

    res.json({
      symbol,
      companyName: String(rows[0].company_name ?? "").trim() || null,
      historyYears: HISTORY_YEARS,
      fromDate: data[0].date,
      toDate: data[data.length - 1].date,
      count: data.length,
      data,
      optimizedMa,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Database query failed",
      symbol,
    });
  }
});

app.listen(PORT, () => {
  console.log(`DBMA backend listening on http://localhost:${PORT}`);
});
