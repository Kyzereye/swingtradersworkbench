import { getPool } from "./db.js";
import { DOW30_SYMBOLS } from "./dow30.js";

const HISTORY_YEARS = Number(process.env.HISTORY_YEARS) || 3;

function historyStartDate(years) {
  const y = Math.max(1, Math.min(50, Math.floor(years)));
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  return d.toISOString().slice(0, 10);
}

function formatDateOnly(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

function mapBarRow(row) {
  return {
    date: formatDateOnly(row.date),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume),
  };
}

async function listSymbols() {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT symbol FROM stock_symbols ORDER BY symbol ASC`
  );
  return rows.map((r) => String(r.symbol).toUpperCase());
}

/** Active stocks/ETFs for Chart nightly scan (excludes crypto/forex). */
export async function listScannableSymbols() {
  const pool = getPool();
  try {
    const [rows] = await pool.execute(
      `
      SELECT symbol FROM stock_symbols
      WHERE is_active = 1
        AND asset_type IN ('stock', 'etf')
      ORDER BY symbol ASC
      `
    );
    return rows.map((r) => String(r.symbol).toUpperCase());
  } catch {
    return listSymbols();
  }
}

/** All active symbols (stock, ETF, forex, crypto, …) for Systems MA crossover. */
export async function listActiveSymbols() {
  const pool = getPool();
  try {
    const [rows] = await pool.execute(
      `
      SELECT symbol FROM stock_symbols
      WHERE is_active = 1
      ORDER BY symbol ASC
      `
    );
    return rows.map((r) => String(r.symbol).toUpperCase());
  } catch {
    return listSymbols();
  }
}

export async function searchSymbols(query, limit = 20) {
  const lim = Math.min(50, Math.max(1, Math.floor(limit) || 20));
  const pool = getPool();
  const q = String(query ?? "")
    .trim()
    .toUpperCase();

  if (!q) {
    const [rows] = await pool.execute(
      `SELECT symbol FROM stock_symbols ORDER BY symbol ASC LIMIT ${lim}`
    );
    return rows.map((r) => String(r.symbol).toUpperCase());
  }

  const [rows] = await pool.execute(
    `
    SELECT symbol FROM stock_symbols
    WHERE symbol LIKE ?
    ORDER BY symbol ASC
    LIMIT ${lim}
    `,
    [`${q}%`]
  );
  return rows.map((r) => String(r.symbol).toUpperCase());
}

/** Latest optimized fast/slow from symbol_daily_scan, or null if never analyzed. */
export async function loadOptimizedMaForSymbol(symbol) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT opt_fast, opt_slow
    FROM symbol_daily_scan
    WHERE symbol = ?
    ORDER BY as_of_date DESC
    LIMIT 1
    `,
    [symbol]
  );
  if (!rows.length) return null;
  const fast = Number(rows[0].opt_fast);
  const slow = Number(rows[0].opt_slow);
  if (!Number.isFinite(fast) || !Number.isFinite(slow)) return null;
  return { fast, slow };
}

/** Latest Systems MA crossover pair from system_ma_crossover_scan, or null. */
export async function loadMaCrossoverPairForSymbol(symbol) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT scan.opt_fast, scan.opt_slow
    FROM system_ma_crossover_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    WHERE s.symbol = ?
    ORDER BY scan.as_of_date DESC
    LIMIT 1
    `,
    [String(symbol).trim().toUpperCase()]
  );
  if (!rows.length) return null;
  const fast = Number(rows[0].opt_fast);
  const slow = Number(rows[0].opt_slow);
  if (!Number.isFinite(fast) || !Number.isFinite(slow)) return null;
  return { fast, slow };
}

/** Latest Triple MA periods from system_triple_ma_scan, or null. */
export async function loadTripleMaPairForSymbol(symbol) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT scan.opt_fast, scan.opt_medium, scan.opt_slow
    FROM system_triple_ma_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    WHERE s.symbol = ?
    ORDER BY scan.as_of_date DESC
    LIMIT 1
    `,
    [String(symbol).trim().toUpperCase()]
  );
  if (!rows.length) return null;
  const fast = Number(rows[0].opt_fast);
  const medium = Number(rows[0].opt_medium);
  const slow = Number(rows[0].opt_slow);
  if (
    !Number.isFinite(fast) ||
    !Number.isFinite(medium) ||
    !Number.isFinite(slow)
  ) {
    return null;
  }
  return { fast, medium, slow };
}

/** Latest MACD periods from system_macd_scan, or null. */
export async function loadMacdPairForSymbol(symbol) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT scan.opt_fast, scan.opt_slow, scan.opt_signal
    FROM system_macd_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    WHERE s.symbol = ?
    ORDER BY scan.as_of_date DESC
    LIMIT 1
    `,
    [String(symbol).trim().toUpperCase()]
  );
  if (!rows.length) return null;
  const fast = Number(rows[0].opt_fast);
  const slow = Number(rows[0].opt_slow);
  const signal = Number(rows[0].opt_signal);
  if (
    !Number.isFinite(fast) ||
    !Number.isFinite(slow) ||
    !Number.isFinite(signal)
  ) {
    return null;
  }
  return { fast, slow, signal };
}

export async function loadBarsForSymbol(symbol) {
  const startDate = historyStartDate(HISTORY_YEARS);
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT d.date, d.open, d.high, d.low, d.close, d.volume
    FROM daily_stock_data d
    INNER JOIN stock_symbols s ON d.symbol_id = s.id
    WHERE s.symbol = ?
      AND d.date >= ?
    ORDER BY d.date ASC
    `,
    [symbol, startDate]
  );
  return rows.map(mapBarRow);
}

export async function upsertScanRow(symbol, scan) {
  const pool = getPool();
  await pool.execute(
    `
    INSERT INTO symbol_daily_scan (
      symbol, as_of_date, opt_fast, opt_slow, opt_used_default,
      opt_r3y, opt_r1y, opt_min_return, running_total, running_total_pct,
      last_signal, signal_date, bar_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      opt_fast = VALUES(opt_fast),
      opt_slow = VALUES(opt_slow),
      opt_used_default = VALUES(opt_used_default),
      opt_r3y = VALUES(opt_r3y),
      opt_r1y = VALUES(opt_r1y),
      opt_min_return = VALUES(opt_min_return),
      running_total = VALUES(running_total),
      running_total_pct = VALUES(running_total_pct),
      last_signal = VALUES(last_signal),
      signal_date = VALUES(signal_date),
      bar_count = VALUES(bar_count),
      computed_at = CURRENT_TIMESTAMP
    `,
    [
      symbol,
      scan.asOfDate,
      scan.optFast,
      scan.optSlow,
      scan.optUsedDefault ? 1 : 0,
      scan.optR3y,
      scan.optR1y,
      scan.optMinReturn,
      scan.runningTotal,
      scan.runningTotalPct,
      scan.lastSignal,
      scan.signalDate,
      scan.barCount,
    ]
  );
}

/** Symbols with fewer closed trades than this are too thin to rank. */
const MIN_TRADES_FOR_TOP = 5;

async function resolveSymbolId(symbol) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id FROM stock_symbols WHERE symbol = ?`,
    [symbol]
  );
  if (!rows.length) return null;
  return Number(rows[0].id);
}

export async function upsertMaCrossoverScanRow(symbol, scan) {
  const symbolId = await resolveSymbolId(symbol);
  if (symbolId == null) {
    throw new Error(`Unknown symbol: ${symbol}`);
  }
  const pool = getPool();
  await pool.execute(
    `
    INSERT INTO system_ma_crossover_scan (
      symbol_id, as_of_date, opt_fast, opt_slow, opt_used_default,
      running_total, running_total_pct, trade_count,
      last_signal, signal_date, signal_close, bar_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      opt_fast = VALUES(opt_fast),
      opt_slow = VALUES(opt_slow),
      opt_used_default = VALUES(opt_used_default),
      running_total = VALUES(running_total),
      running_total_pct = VALUES(running_total_pct),
      trade_count = VALUES(trade_count),
      last_signal = VALUES(last_signal),
      signal_date = VALUES(signal_date),
      signal_close = VALUES(signal_close),
      bar_count = VALUES(bar_count),
      computed_at = CURRENT_TIMESTAMP
    `,
    [
      symbolId,
      scan.asOfDate,
      scan.optFast,
      scan.optSlow,
      scan.optUsedDefault ? 1 : 0,
      scan.runningTotal,
      scan.runningTotalPct,
      scan.tradeCount,
      scan.lastSignal,
      scan.signalDate,
      scan.signalClose,
      scan.barCount,
    ]
  );
}

export async function upsertTripleMaScanRow(symbol, scan) {
  const symbolId = await resolveSymbolId(symbol);
  if (symbolId == null) {
    throw new Error(`Unknown symbol: ${symbol}`);
  }
  const pool = getPool();
  await pool.execute(
    `
    INSERT INTO system_triple_ma_scan (
      symbol_id, as_of_date, opt_fast, opt_medium, opt_slow, opt_used_default,
      running_total, running_total_pct, trade_count,
      last_signal, signal_date, signal_close, bar_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      opt_fast = VALUES(opt_fast),
      opt_medium = VALUES(opt_medium),
      opt_slow = VALUES(opt_slow),
      opt_used_default = VALUES(opt_used_default),
      running_total = VALUES(running_total),
      running_total_pct = VALUES(running_total_pct),
      trade_count = VALUES(trade_count),
      last_signal = VALUES(last_signal),
      signal_date = VALUES(signal_date),
      signal_close = VALUES(signal_close),
      bar_count = VALUES(bar_count),
      computed_at = CURRENT_TIMESTAMP
    `,
    [
      symbolId,
      scan.asOfDate,
      scan.optFast,
      scan.optMedium,
      scan.optSlow,
      scan.optUsedDefault ? 1 : 0,
      scan.runningTotal,
      scan.runningTotalPct,
      scan.tradeCount,
      scan.lastSignal,
      scan.signalDate,
      scan.signalClose,
      scan.barCount,
    ]
  );
}

/**
 * Upsert one MACD optimize/scan row (system_macd_scan).
 */
export async function upsertMacdScanRow(symbol, scan) {
  const symbolId = await resolveSymbolId(symbol);
  if (symbolId == null) {
    throw new Error(`Unknown symbol: ${symbol}`);
  }
  const pool = getPool();
  await pool.execute(
    `
    INSERT INTO system_macd_scan (
      symbol_id, as_of_date, opt_fast, opt_slow, opt_signal, opt_used_default,
      running_total, running_total_pct, trade_count,
      last_signal, signal_date, signal_close, bar_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      opt_fast = VALUES(opt_fast),
      opt_slow = VALUES(opt_slow),
      opt_signal = VALUES(opt_signal),
      opt_used_default = VALUES(opt_used_default),
      running_total = VALUES(running_total),
      running_total_pct = VALUES(running_total_pct),
      trade_count = VALUES(trade_count),
      last_signal = VALUES(last_signal),
      signal_date = VALUES(signal_date),
      signal_close = VALUES(signal_close),
      bar_count = VALUES(bar_count),
      computed_at = CURRENT_TIMESTAMP
    `,
    [
      symbolId,
      scan.asOfDate,
      scan.optFast,
      scan.optSlow,
      scan.optSignal,
      scan.optUsedDefault ? 1 : 0,
      scan.runningTotal,
      scan.runningTotalPct,
      scan.tradeCount,
      scan.lastSignal,
      scan.signalDate,
      scan.signalClose,
      scan.barCount,
    ]
  );
}

/**
 * Entry/exit signals on each symbol's last trading session (all asset types).
 * Session date is that symbol's latest bar / scan as_of_date.
 */
export async function loadMaCrossoverYesterdaySignals() {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT
      s.symbol,
      s.company_name,
      s.asset_type,
      scan.last_signal,
      scan.signal_date,
      scan.signal_close,
      scan.opt_fast,
      scan.opt_slow,
      scan.as_of_date,
      scan.computed_at
    FROM system_ma_crossover_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    INNER JOIN (
      SELECT symbol_id, MAX(as_of_date) AS as_of_date
      FROM system_ma_crossover_scan
      GROUP BY symbol_id
    ) latest
      ON latest.symbol_id = scan.symbol_id
     AND latest.as_of_date = scan.as_of_date
    WHERE scan.last_signal IN ('entry', 'exit')
    ORDER BY scan.signal_date DESC, s.symbol ASC
    `
  );

  if (!rows.length) {
    return { signals: [], computedAt: null };
  }

  return {
    computedAt: rows[0].computed_at ?? null,
    signals: rows.map((row) => ({
      symbol: String(row.symbol).toUpperCase(),
      companyName: row.company_name
        ? String(row.company_name).trim() || null
        : null,
      assetType: row.asset_type ? String(row.asset_type) : null,
      signal: String(row.last_signal),
      signalDate: formatDateOnly(row.signal_date),
      price:
        row.signal_close != null ? Number(row.signal_close) : null,
      optFast: Number(row.opt_fast),
      optSlow: Number(row.opt_slow),
    })),
  };
}

/**
 * Dow 30: latest MA crossover scan row each (~2y running P/L metrics).
 * Always returns all 30 tickers; missing scans have null totals.
 */
export async function loadMaCrossoverDowStocks() {
  const pool = getPool();
  const placeholders = DOW30_SYMBOLS.map(() => "?").join(",");
  const [rows] = await pool.execute(
    `
    SELECT
      s.symbol,
      s.company_name,
      scan.opt_fast,
      scan.opt_slow,
      scan.running_total,
      scan.running_total_pct,
      scan.as_of_date,
      scan.computed_at
    FROM system_ma_crossover_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    INNER JOIN (
      SELECT symbol_id, MAX(as_of_date) AS as_of_date
      FROM system_ma_crossover_scan
      GROUP BY symbol_id
    ) latest
      ON latest.symbol_id = scan.symbol_id
     AND latest.as_of_date = scan.as_of_date
    WHERE s.symbol IN (${placeholders})
    `,
    DOW30_SYMBOLS
  );

  const bySymbol = new Map();
  for (const row of rows) {
    bySymbol.set(String(row.symbol).toUpperCase(), {
      symbol: String(row.symbol).toUpperCase(),
      companyName: row.company_name
        ? String(row.company_name).trim() || null
        : null,
      optFast: Number(row.opt_fast),
      optSlow: Number(row.opt_slow),
      runningTotal:
        row.running_total != null ? Number(row.running_total) : null,
      runningTotalPct:
        row.running_total_pct != null ? Number(row.running_total_pct) : null,
    });
  }

  const stocks = DOW30_SYMBOLS.map(
    (symbol) =>
      bySymbol.get(symbol) ?? {
        symbol,
        companyName: null,
        optFast: null,
        optSlow: null,
        runningTotal: null,
        runningTotalPct: null,
      }
  );

  return {
    computedAt: rows[0]?.computed_at ?? null,
    stocks,
  };
}

const TRIPLE_MA_DEFAULT = { fast: 10, medium: 20, slow: 50 };

/**
 * Entry/exit signals on each symbol's last trading session (Triple MA).
 * Session date is that symbol's latest bar / scan as_of_date.
 */
export async function loadTripleMaYesterdaySignals() {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT
      s.symbol,
      s.company_name,
      s.asset_type,
      scan.last_signal,
      scan.signal_date,
      scan.signal_close,
      scan.opt_fast,
      scan.opt_medium,
      scan.opt_slow,
      scan.as_of_date,
      scan.computed_at
    FROM system_triple_ma_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    INNER JOIN (
      SELECT symbol_id, MAX(as_of_date) AS as_of_date
      FROM system_triple_ma_scan
      GROUP BY symbol_id
    ) latest
      ON latest.symbol_id = scan.symbol_id
     AND latest.as_of_date = scan.as_of_date
    WHERE scan.last_signal IN ('entry', 'exit')
    ORDER BY scan.signal_date DESC, s.symbol ASC
    `
  );

  if (!rows.length) {
    return { signals: [], computedAt: null };
  }

  return {
    computedAt: rows[0].computed_at ?? null,
    signals: rows.map((row) => ({
      symbol: String(row.symbol).toUpperCase(),
      companyName: row.company_name
        ? String(row.company_name).trim() || null
        : null,
      assetType: row.asset_type ? String(row.asset_type) : null,
      signal: String(row.last_signal),
      signalDate: formatDateOnly(row.signal_date),
      price:
        row.signal_close != null ? Number(row.signal_close) : null,
      optFast: Number(row.opt_fast),
      optMedium: Number(row.opt_medium),
      optSlow: Number(row.opt_slow),
    })),
  };
}

/**
 * Entry/exit signals on each symbol's last trading session (MACD).
 * Session date is that symbol's latest bar / scan as_of_date.
 */
export async function loadMacdYesterdaySignals() {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT
      s.symbol,
      s.company_name,
      s.asset_type,
      scan.last_signal,
      scan.signal_date,
      scan.signal_close,
      scan.opt_fast,
      scan.opt_slow,
      scan.opt_signal,
      scan.as_of_date,
      scan.computed_at
    FROM system_macd_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    INNER JOIN (
      SELECT symbol_id, MAX(as_of_date) AS as_of_date
      FROM system_macd_scan
      GROUP BY symbol_id
    ) latest
      ON latest.symbol_id = scan.symbol_id
     AND latest.as_of_date = scan.as_of_date
    WHERE scan.last_signal IN ('entry', 'exit')
    ORDER BY scan.signal_date DESC, s.symbol ASC
    `
  );

  if (!rows.length) {
    return { signals: [], computedAt: null };
  }

  return {
    computedAt: rows[0].computed_at ?? null,
    signals: rows.map((row) => ({
      symbol: String(row.symbol).toUpperCase(),
      companyName: row.company_name
        ? String(row.company_name).trim() || null
        : null,
      assetType: row.asset_type ? String(row.asset_type) : null,
      signal: String(row.last_signal),
      signalDate: formatDateOnly(row.signal_date),
      price:
        row.signal_close != null ? Number(row.signal_close) : null,
      optFast: Number(row.opt_fast),
      optSlow: Number(row.opt_slow),
      optSignal: Number(row.opt_signal),
    })),
  };
}

/**
 * Dow 30: latest Triple MA scan row each (~2y running P/L).
 */
export async function loadTripleMaDowStocks() {
  const pool = getPool();
  const placeholders = DOW30_SYMBOLS.map(() => "?").join(",");
  const [rows] = await pool.execute(
    `
    SELECT
      s.symbol,
      s.company_name,
      scan.opt_fast,
      scan.opt_medium,
      scan.opt_slow,
      scan.running_total,
      scan.running_total_pct,
      scan.computed_at
    FROM system_triple_ma_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    INNER JOIN (
      SELECT symbol_id, MAX(as_of_date) AS as_of_date
      FROM system_triple_ma_scan
      GROUP BY symbol_id
    ) latest
      ON latest.symbol_id = scan.symbol_id
     AND latest.as_of_date = scan.as_of_date
    WHERE s.symbol IN (${placeholders})
    `,
    DOW30_SYMBOLS
  );

  const bySymbol = new Map();
  for (const row of rows) {
    bySymbol.set(String(row.symbol).toUpperCase(), {
      symbol: String(row.symbol).toUpperCase(),
      companyName: row.company_name
        ? String(row.company_name).trim() || null
        : null,
      optFast: Number(row.opt_fast),
      optMedium: Number(row.opt_medium),
      optSlow: Number(row.opt_slow),
      runningTotal:
        row.running_total != null ? Number(row.running_total) : null,
      runningTotalPct:
        row.running_total_pct != null ? Number(row.running_total_pct) : null,
    });
  }

  const { fast, medium, slow } = TRIPLE_MA_DEFAULT;
  const stocks = DOW30_SYMBOLS.map(
    (symbol) =>
      bySymbol.get(symbol) ?? {
        symbol,
        companyName: null,
        optFast: fast,
        optMedium: medium,
        optSlow: slow,
        runningTotal: null,
        runningTotalPct: null,
      }
  );

  return {
    computedAt: rows[0]?.computed_at ?? null,
    stocks,
  };
}

const MACD_DEFAULT = { fast: 12, slow: 26, signal: 9 };

/**
 * Dow 30: latest MACD scan row each (~2y running P/L).
 */
export async function loadMacdDowStocks() {
  const pool = getPool();
  const placeholders = DOW30_SYMBOLS.map(() => "?").join(",");
  const [rows] = await pool.execute(
    `
    SELECT
      s.symbol,
      s.company_name,
      scan.opt_fast,
      scan.opt_slow,
      scan.opt_signal,
      scan.running_total,
      scan.running_total_pct,
      scan.computed_at
    FROM system_macd_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    INNER JOIN (
      SELECT symbol_id, MAX(as_of_date) AS as_of_date
      FROM system_macd_scan
      GROUP BY symbol_id
    ) latest
      ON latest.symbol_id = scan.symbol_id
     AND latest.as_of_date = scan.as_of_date
    WHERE s.symbol IN (${placeholders})
    `,
    DOW30_SYMBOLS
  );

  const bySymbol = new Map();
  for (const row of rows) {
    bySymbol.set(String(row.symbol).toUpperCase(), {
      symbol: String(row.symbol).toUpperCase(),
      companyName: row.company_name
        ? String(row.company_name).trim() || null
        : null,
      optFast: Number(row.opt_fast),
      optSlow: Number(row.opt_slow),
      optSignal: Number(row.opt_signal),
      runningTotal:
        row.running_total != null ? Number(row.running_total) : null,
      runningTotalPct:
        row.running_total_pct != null ? Number(row.running_total_pct) : null,
    });
  }

  const { fast, slow, signal } = MACD_DEFAULT;
  const stocks = DOW30_SYMBOLS.map(
    (symbol) =>
      bySymbol.get(symbol) ?? {
        symbol,
        companyName: null,
        optFast: fast,
        optSlow: slow,
        optSignal: signal,
        runningTotal: null,
        runningTotalPct: null,
      }
  );

  return {
    computedAt: rows[0]?.computed_at ?? null,
    stocks,
  };
}

/**
 * Top stock/ETF by latest Triple MA scan score (last ~2y 1-share P/L %).
 * One row per symbol (its newest as_of_date).
 */
export async function loadTripleMaTopPerformers(topN = 50) {
  const lim = Math.min(100, Math.max(1, Math.floor(topN) || 50));
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT
      s.symbol,
      s.company_name,
      scan.opt_fast,
      scan.opt_medium,
      scan.opt_slow,
      scan.running_total,
      scan.running_total_pct,
      scan.trade_count,
      scan.as_of_date,
      scan.computed_at
    FROM system_triple_ma_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    INNER JOIN (
      SELECT symbol_id, MAX(as_of_date) AS as_of_date
      FROM system_triple_ma_scan
      GROUP BY symbol_id
    ) latest
      ON latest.symbol_id = scan.symbol_id
     AND latest.as_of_date = scan.as_of_date
    WHERE s.asset_type IN ('stock', 'etf')
      AND scan.trade_count >= ${MIN_TRADES_FOR_TOP}
    ORDER BY scan.running_total_pct IS NULL ASC,
             scan.running_total_pct DESC
    LIMIT ${lim}
    `
  );

  if (!rows.length) {
    return { asOfDate: null, computedAt: null, top: [] };
  }

  return {
    asOfDate: null,
    computedAt: rows[0].computed_at ?? null,
    top: rows.map((row) => ({
      symbol: String(row.symbol).toUpperCase(),
      companyName: row.company_name
        ? String(row.company_name).trim() || null
        : null,
      optFast: Number(row.opt_fast),
      optMedium: Number(row.opt_medium),
      optSlow: Number(row.opt_slow),
      runningTotal: Number(row.running_total),
      runningTotalPct:
        row.running_total_pct != null ? Number(row.running_total_pct) : null,
      tradeCount: Number(row.trade_count),
    })),
  };
}

/**
 * Top stock/ETF by latest scan score (last ~2y 1-share P/L %).
 * One row per symbol (its newest as_of_date); calendar day is not a filter.
 */
export async function loadMaCrossoverTopPerformers(topN = 50) {
  const lim = Math.min(100, Math.max(1, Math.floor(topN) || 50));
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT
      s.symbol,
      s.company_name,
      scan.opt_fast,
      scan.opt_slow,
      scan.running_total,
      scan.running_total_pct,
      scan.trade_count,
      scan.as_of_date,
      scan.computed_at
    FROM system_ma_crossover_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    INNER JOIN (
      SELECT symbol_id, MAX(as_of_date) AS as_of_date
      FROM system_ma_crossover_scan
      GROUP BY symbol_id
    ) latest
      ON latest.symbol_id = scan.symbol_id
     AND latest.as_of_date = scan.as_of_date
    WHERE s.asset_type IN ('stock', 'etf')
      AND scan.trade_count >= ${MIN_TRADES_FOR_TOP}
    ORDER BY scan.running_total_pct IS NULL ASC,
             scan.running_total_pct DESC
    LIMIT ${lim}
    `
  );

  if (!rows.length) {
    return { asOfDate: null, computedAt: null, top: [] };
  }

  return {
    asOfDate: null,
    computedAt: rows[0].computed_at ?? null,
    top: rows.map((row) => ({
      symbol: String(row.symbol).toUpperCase(),
      companyName: row.company_name
        ? String(row.company_name).trim() || null
        : null,
      optFast: Number(row.opt_fast),
      optSlow: Number(row.opt_slow),
      runningTotal: Number(row.running_total),
      runningTotalPct:
        row.running_total_pct != null ? Number(row.running_total_pct) : null,
      tradeCount: Number(row.trade_count),
    })),
  };
}

/**
 * Top stock/ETF by latest MACD scan score (last ~2y 1-share P/L %).
 * One row per symbol (its newest as_of_date).
 */
export async function loadMacdTopPerformers(topN = 50) {
  const lim = Math.min(100, Math.max(1, Math.floor(topN) || 50));
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT
      s.symbol,
      s.company_name,
      scan.opt_fast,
      scan.opt_slow,
      scan.opt_signal,
      scan.running_total,
      scan.running_total_pct,
      scan.trade_count,
      scan.as_of_date,
      scan.computed_at
    FROM system_macd_scan scan
    INNER JOIN stock_symbols s ON s.id = scan.symbol_id
    INNER JOIN (
      SELECT symbol_id, MAX(as_of_date) AS as_of_date
      FROM system_macd_scan
      GROUP BY symbol_id
    ) latest
      ON latest.symbol_id = scan.symbol_id
     AND latest.as_of_date = scan.as_of_date
    WHERE s.asset_type IN ('stock', 'etf')
      AND scan.trade_count >= ${MIN_TRADES_FOR_TOP}
    ORDER BY scan.running_total_pct IS NULL ASC,
             scan.running_total_pct DESC
    LIMIT ${lim}
    `
  );

  if (!rows.length) {
    return { asOfDate: null, computedAt: null, top: [] };
  }

  return {
    asOfDate: null,
    computedAt: rows[0].computed_at ?? null,
    top: rows.map((row) => ({
      symbol: String(row.symbol).toUpperCase(),
      companyName: row.company_name
        ? String(row.company_name).trim() || null
        : null,
      optFast: Number(row.opt_fast),
      optSlow: Number(row.opt_slow),
      optSignal: Number(row.opt_signal),
      runningTotal: Number(row.running_total),
      runningTotalPct:
        row.running_total_pct != null ? Number(row.running_total_pct) : null,
      tradeCount: Number(row.trade_count),
    })),
  };
}

async function getLatestScanMeta() {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT as_of_date AS asOfDate, MAX(computed_at) AS computedAt, COUNT(*) AS n
    FROM symbol_daily_scan
    GROUP BY as_of_date
    ORDER BY n DESC, as_of_date DESC
    LIMIT 1
    `
  );
  if (!rows.length) return null;
  return {
    asOfDate: formatDateOnly(rows[0].asOfDate),
    computedAt: rows[0].computedAt,
  };
}

function mapScanRow(row) {
  return {
    symbol: row.symbol,
    companyName: row.company_name
      ? String(row.company_name).trim() || null
      : null,
    assetType: row.asset_type ? String(row.asset_type) : "stock",
    price: row.last_close != null ? Number(row.last_close) : null,
    asOfDate: formatDateOnly(row.as_of_date),
    optFast: Number(row.opt_fast),
    optSlow: Number(row.opt_slow),
    optUsedDefault: Boolean(row.opt_used_default),
    optR3y: row.opt_r3y != null ? Number(row.opt_r3y) : null,
    optR1y: row.opt_r1y != null ? Number(row.opt_r1y) : null,
    optMinReturn: row.opt_min_return != null ? Number(row.opt_min_return) : null,
    runningTotal: Number(row.running_total),
    runningTotalPct:
      row.running_total_pct != null ? Number(row.running_total_pct) : null,
    lastSignal: row.last_signal,
    signalDate: formatDateOnly(row.signal_date),
    barCount: Number(row.bar_count),
  };
}

const SCAN_ROW_SELECT = `
  SELECT scan.symbol, scan.as_of_date, scan.opt_fast, scan.opt_slow,
         scan.opt_used_default, scan.opt_r3y, scan.opt_r1y, scan.opt_min_return,
         scan.running_total, scan.running_total_pct,
         scan.last_signal, scan.signal_date, scan.bar_count,
         ss.company_name, ss.asset_type, d.close AS last_close
  FROM symbol_daily_scan scan
  LEFT JOIN stock_symbols ss ON ss.symbol = scan.symbol
  LEFT JOIN daily_stock_data d ON d.symbol_id = ss.id AND d.date = scan.as_of_date
`;

function applyScanFilters(
  rows,
  { priceMin = null, priceMax = null, assetTypes = null } = {}
) {
  return rows.filter((row) => {
    if (assetTypes != null && !assetTypes.includes(row.assetType)) {
      return false;
    }
    if (priceMin != null && (row.price == null || row.price < priceMin)) {
      return false;
    }
    if (priceMax != null && (row.price == null || row.price > priceMax)) {
      return false;
    }
    return true;
  });
}

export function parseTopPerformerQuery(query) {
  const topN = Math.min(
    100,
    Math.max(1, Number.parseInt(String(query.top ?? "25"), 10) || 25)
  );
  const priceMinRaw = query.priceMin;
  const priceMaxRaw = query.priceMax;
  const priceMin =
    priceMinRaw !== undefined && priceMinRaw !== ""
      ? Number(priceMinRaw)
      : null;
  const priceMax =
    priceMaxRaw !== undefined && priceMaxRaw !== ""
      ? Number(priceMaxRaw)
      : null;
  const assetTypes =
    query.assetTypes !== undefined
      ? String(query.assetTypes)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

  return {
    topN,
    priceMin: Number.isFinite(priceMin) ? priceMin : null,
    priceMax: Number.isFinite(priceMax) ? priceMax : null,
    assetTypes,
  };
}

export async function loadTopPerformers(filters) {
  const { meta, rows } = await loadScanForLatestDate();
  if (!meta) {
    return { asOfDate: null, computedAt: null, top: [] };
  }

  const filtered = applyScanFilters(rows, filters);
  const byPnlPct = [...filtered].sort((a, b) => {
    const av = a.runningTotalPct;
    const bv = b.runningTotalPct;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });

  return {
    asOfDate: meta.asOfDate,
    computedAt: meta.computedAt,
    top: byPnlPct.slice(0, filters.topN),
  };
}

export async function loadScanForLatestDate() {
  const meta = await getLatestScanMeta();
  if (!meta) return { meta: null, rows: [] };

  const pool = getPool();
  const [rows] = await pool.execute(
    `
    ${SCAN_ROW_SELECT}
    WHERE scan.as_of_date = ?
    ORDER BY scan.symbol ASC
    `,
    [meta.asOfDate]
  );

  return { meta, rows: rows.map(mapScanRow) };
}

export async function listScanDates(limit = 500) {
  const lim = Math.min(2000, Math.max(1, Math.floor(limit) || 500));
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT DISTINCT as_of_date
    FROM symbol_daily_scan
    ORDER BY as_of_date DESC
    LIMIT ${lim}
    `
  );
  return rows.map((r) => formatDateOnly(r.as_of_date));
}

export async function loadScanForDate(asOfDate, { topN = 25 } = {}) {
  const lim = Math.min(100, Math.max(1, Math.floor(topN) || 25));
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    ${SCAN_ROW_SELECT}
    WHERE scan.as_of_date = ?
    ORDER BY scan.symbol ASC
    `,
    [asOfDate]
  );

  const mapped = rows.map(mapScanRow);
  const entries = mapped.filter((r) => r.lastSignal === "entry");
  const exits = mapped.filter((r) => r.lastSignal === "exit");
  const inPosition = mapped.filter((r) => r.lastSignal === "open");
  const byPnl = [...mapped].sort((a, b) => b.runningTotal - a.runningTotal);

  const [metaRows] = await pool.execute(
    `
    SELECT MAX(computed_at) AS computedAt
    FROM symbol_daily_scan
    WHERE as_of_date = ?
    `,
    [asOfDate]
  );

  return {
    asOfDate,
    computedAt: metaRows[0]?.computedAt ?? null,
    total: mapped.length,
    entries,
    exits,
    inPosition,
    top: byPnl.slice(0, lim),
  };
}
