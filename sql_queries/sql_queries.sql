USE `StockPxLabs`;

-- Disable foreign key checks so tables can be dropped in any order
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS symbol_daily_scan, user_trades, user_usage, user_preferences, 
stock_performance_metrics, trading_signals, daily_stock_data, users, stock_symbols, 
roles, system_ma_crossover_scan, system_triple_ma_scan, system_macd_scan, system_rsi_scan, 
system_donchian_scan, system_keltner_scan, system_bollinger_scan, system_darvas_scan,
system_fibonacci_scan;

SET FOREIGN_KEY_CHECKS = 1;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default roles (ignore if they already exist)
INSERT IGNORE INTO roles (role_name, display_name, description) VALUES
('free', 'Free Tier', 'Basic access with limited features'),
('pro', 'Pro', 'Full access to all trading analysis features'),
('enterprise', 'Enterprise', 'Advanced features with priority support'),
('admin', 'Admin', 'Full system administration access');

-- Symbol list (stocks, ETFs, crypto, forex). Stocks/ETFs: npm run get-symbols.
-- Forex/crypto: sql_queries/forex_and_crypto_symbols.sql. Optional stocks: combined_stocks.sql.
CREATE TABLE IF NOT EXISTS stock_symbols (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(32) NOT NULL,
    company_name VARCHAR(255),
    asset_type ENUM('stock', 'etf', 'crypto', 'forex') NOT NULL DEFAULT 'stock',
    exchange VARCHAR(32) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_symbol (symbol),
    INDEX idx_symbol (symbol),
    INDEX idx_asset_type (asset_type),
    INDEX idx_exchange (exchange),
    INDEX idx_is_active (is_active),
    INDEX idx_active_asset (is_active, asset_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table (depends on roles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255) NULL,
    verification_token_expires TIMESTAMP NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_email (email),
    INDEX idx_active (is_active),
    INDEX idx_role_id (role_id),
    INDEX idx_verification_token (verification_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_preferences table (depends on users)
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    default_days INT DEFAULT 365,
    default_atr_period INT DEFAULT 14,
    default_fast_ma INT DEFAULT 21,
    default_slow_ma INT DEFAULT 50,
    default_ma_type VARCHAR(10) DEFAULT 'ema',
    default_initial_capital DECIMAL(15,2) DEFAULT 100000.00,
    mean_reversion_threshold DECIMAL(5,2) DEFAULT 10.0,
    position_sizing_long DECIMAL(5,2) DEFAULT 5.0,
    position_sizing_short DECIMAL(5,2) DEFAULT 3.0,
    atr_multiplier_long DECIMAL(3,1) DEFAULT 2.0,
    atr_multiplier_short DECIMAL(3,1) DEFAULT 1.5,
    trades_columns JSON,
    favorite_stocks JSON DEFAULT NULL,
    discovery_min_win_rate DECIMAL(5,2) DEFAULT 50.0,
    discovery_min_return DECIMAL(5,2) DEFAULT 5.0,
    discovery_min_sharpe DECIMAL(5,2) DEFAULT 0.20,
    discovery_min_trades INT DEFAULT 3,
    discovery_max_stocks INT DEFAULT 15,
    subscription_tier VARCHAR(20) DEFAULT 'basic',
    trial_ends_at DATETIME NULL,
    subscription_status ENUM('trial', 'active', 'cancelled', 'expired') DEFAULT 'trial',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_subscription_tier (subscription_tier),
    INDEX idx_subscription_status (subscription_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create daily_stock_data table (depends on stock_symbols)
CREATE TABLE IF NOT EXISTS daily_stock_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol_id INT NOT NULL,
    date DATE NOT NULL,
    open DECIMAL(10,2),
    high DECIMAL(10,2),
    low DECIMAL(10,2),
    close DECIMAL(10,2),
    volume BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY unique_symbol_date (symbol_id, date),
    INDEX idx_symbol_id (symbol_id),
    INDEX idx_date (date),
    INDEX idx_symbol_date (symbol_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create stock_performance_metrics table (depends on stock_symbols)
CREATE TABLE IF NOT EXISTS stock_performance_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol_id INT NOT NULL,
    analysis_date DATE NOT NULL,
    time_period VARCHAR(10) NOT NULL DEFAULT 'ALL',
    strategy_mode VARCHAR(10) NOT NULL DEFAULT 'long',
    total_return_pct DECIMAL(8,2),
    total_pnl DECIMAL(15,2),
    win_rate DECIMAL(5,2),
    total_trades INT,
    long_trades INT DEFAULT 0,
    short_trades INT DEFAULT 0,
    sharpe_ratio DECIMAL(8,2),
    analysis_params JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY unique_symbol_analysis (symbol_id, analysis_date, time_period, strategy_mode),
    INDEX idx_symbol_analysis_date (symbol_id, analysis_date),
    INDEX idx_analysis_date (analysis_date),
    INDEX idx_time_period (time_period),
    INDEX idx_strategy_mode (strategy_mode),
    INDEX idx_total_return (total_return_pct),
    INDEX idx_sharpe_ratio (sharpe_ratio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_usage table for tracking monthly quotas (depends on users)
CREATE TABLE IF NOT EXISTS user_usage (
    user_id INT NOT NULL,
    month DATE NOT NULL,
    trades_count INT DEFAULT 0,
    ema_analyses_count INT DEFAULT 0,
    ma_optimizations_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_month (month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_trades table (depends on users)
CREATE TABLE IF NOT EXISTS user_trades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    symbol VARCHAR(32) NOT NULL,
    position_type ENUM('long', 'short') DEFAULT 'long',
    entry_date DATE NOT NULL,
    entry_price DECIMAL(10,2) NOT NULL,
    shares INT NOT NULL,
    exit_date DATE NULL,
    exit_price DECIMAL(10,2) NULL,
    stop_loss DECIMAL(10,2) NULL,
    target_price DECIMAL(10,2) NULL,
    trade_notes TEXT NULL,
    status ENUM('open', 'closed') DEFAULT 'open',
    pnl DECIMAL(15,2) NULL,
    pnl_percent DECIMAL(8,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_symbol (symbol),
    INDEX idx_status (status),
    INDEX idx_position_type (position_type),
    INDEX idx_entry_date (entry_date),
    INDEX idx_user_symbol (user_id, symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create trading_signals table for storing daily alerts
CREATE TABLE IF NOT EXISTS trading_signals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol_id INT NOT NULL,
    signal_type ENUM('entry', 'exit', 'mean_reversion') NOT NULL,
    signal_direction ENUM('long', 'short') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    ma21_value DECIMAL(10,2),
    ma50_value DECIMAL(10,2),
    deviation_percent DECIMAL(5,2),
    signal_date DATE NOT NULL,
    signal_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY unique_signal (symbol_id, signal_type, signal_direction, signal_date),
    INDEX idx_symbol_signal_date (symbol_id, signal_date),
    INDEX idx_signal_type (signal_type),
    INDEX idx_signal_date (signal_date),
    INDEX idx_signal_direction (signal_direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-symbol analysis results (npm run analyze-symbols → feeds /api/scanner UI)
CREATE TABLE IF NOT EXISTS symbol_daily_scan (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol VARCHAR(32) NOT NULL,
    as_of_date DATE NOT NULL,
    opt_fast INT UNSIGNED NOT NULL,
    opt_slow INT UNSIGNED NOT NULL,
    opt_used_default TINYINT(1) NOT NULL DEFAULT 0,
    opt_r3y DECIMAL(10, 4) NULL,
    opt_r1y DECIMAL(10, 4) NULL,
    opt_min_return DECIMAL(10, 4) NULL,
    running_total DECIMAL(12, 4) NOT NULL,
    running_total_pct DECIMAL(10, 4) NULL,
    last_signal ENUM('entry', 'exit', 'open', 'none') NOT NULL DEFAULT 'none',
    signal_date DATE NULL,
    bar_count INT UNSIGNED NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_symbol_asof (symbol, as_of_date),
    KEY idx_asof_signal (as_of_date, last_signal),
    KEY idx_asof_running (as_of_date, running_total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-symbol MA crossover optimize results (Systems tab top performers)

CREATE TABLE IF NOT EXISTS system_ma_crossover_scan (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol_id INT NOT NULL,
    as_of_date DATE NOT NULL,
    opt_fast INT UNSIGNED NOT NULL,
    opt_slow INT UNSIGNED NOT NULL,
    opt_used_default TINYINT(1) NOT NULL DEFAULT 0,
    running_total DECIMAL(12, 4) NOT NULL,
    running_total_pct DECIMAL(14, 4) NULL,
    trade_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_signal ENUM('entry', 'exit', 'open', 'none') NOT NULL DEFAULT 'none',
    signal_date DATE NULL,
    signal_close DECIMAL(12, 4) NULL,
    bar_count INT UNSIGNED NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY uk_symbol_asof (symbol_id, as_of_date),
    KEY idx_asof_pct (as_of_date, running_total_pct),
    KEY idx_asof_signal (as_of_date, last_signal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-symbol Triple MA alignment optimize results

CREATE TABLE IF NOT EXISTS system_triple_ma_scan (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol_id INT NOT NULL,
    as_of_date DATE NOT NULL,
    opt_fast INT UNSIGNED NOT NULL,
    opt_medium INT UNSIGNED NOT NULL,
    opt_slow INT UNSIGNED NOT NULL,
    opt_used_default TINYINT(1) NOT NULL DEFAULT 0,
    running_total DECIMAL(12, 4) NOT NULL,
    running_total_pct DECIMAL(14, 4) NULL,
    trade_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_signal ENUM('entry', 'exit', 'open', 'none') NOT NULL DEFAULT 'none',
    signal_date DATE NULL,
    signal_close DECIMAL(12, 4) NULL,
    bar_count INT UNSIGNED NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY uk_symbol_asof (symbol_id, as_of_date),
    KEY idx_asof_pct (as_of_date, running_total_pct),
    KEY idx_asof_signal (as_of_date, last_signal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_macd_scan (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol_id INT NOT NULL,
    as_of_date DATE NOT NULL,
    opt_fast INT UNSIGNED NOT NULL,
    opt_slow INT UNSIGNED NOT NULL,
    opt_signal INT UNSIGNED NOT NULL,
    opt_used_default TINYINT(1) NOT NULL DEFAULT 0,
    running_total DECIMAL(12, 4) NOT NULL,
    running_total_pct DECIMAL(14, 4) NULL,
    trade_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_signal ENUM('entry', 'exit', 'open', 'none') NOT NULL DEFAULT 'none',
    signal_date DATE NULL,
    signal_close DECIMAL(12, 4) NULL,
    bar_count INT UNSIGNED NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY uk_symbol_asof (symbol_id, as_of_date),
    KEY idx_asof_pct (as_of_date, running_total_pct),
    KEY idx_asof_signal (as_of_date, last_signal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-symbol RSI mean-reversion optimize results

CREATE TABLE IF NOT EXISTS system_rsi_scan (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol_id INT NOT NULL,
    as_of_date DATE NOT NULL,
    opt_period INT UNSIGNED NOT NULL,
    opt_oversold INT UNSIGNED NOT NULL,
    opt_overbought INT UNSIGNED NOT NULL,
    opt_used_default TINYINT(1) NOT NULL DEFAULT 0,
    running_total DECIMAL(12, 4) NOT NULL,
    running_total_pct DECIMAL(14, 4) NULL,
    trade_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_signal ENUM('entry', 'exit', 'open', 'none') NOT NULL DEFAULT 'none',
    signal_date DATE NULL,
    signal_close DECIMAL(12, 4) NULL,
    bar_count INT UNSIGNED NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY uk_symbol_asof (symbol_id, as_of_date),
    KEY idx_asof_pct (as_of_date, running_total_pct),
    KEY idx_asof_signal (as_of_date, last_signal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-symbol Donchian (Turtle-style) breakout optimize results

CREATE TABLE IF NOT EXISTS system_donchian_scan (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol_id INT NOT NULL,
    as_of_date DATE NOT NULL,
    opt_entry_period INT UNSIGNED NOT NULL,
    opt_exit_period INT UNSIGNED NOT NULL,
    opt_used_default TINYINT(1) NOT NULL DEFAULT 0,
    running_total DECIMAL(12, 4) NOT NULL,
    running_total_pct DECIMAL(14, 4) NULL,
    trade_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_signal ENUM('entry', 'exit', 'open', 'none') NOT NULL DEFAULT 'none',
    signal_date DATE NULL,
    signal_close DECIMAL(12, 4) NULL,
    bar_count INT UNSIGNED NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY uk_symbol_asof (symbol_id, as_of_date),
    KEY idx_asof_pct (as_of_date, running_total_pct),
    KEY idx_asof_signal (as_of_date, last_signal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-symbol Keltner Channel trend optimize results

CREATE TABLE IF NOT EXISTS system_keltner_scan (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol_id INT NOT NULL,
    as_of_date DATE NOT NULL,
    opt_ema_period INT UNSIGNED NOT NULL,
    opt_atr_period INT UNSIGNED NOT NULL,
    opt_atr_mult DECIMAL(6, 2) NOT NULL,
    opt_used_default TINYINT(1) NOT NULL DEFAULT 0,
    running_total DECIMAL(12, 4) NOT NULL,
    running_total_pct DECIMAL(14, 4) NULL,
    trade_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_signal ENUM('entry', 'exit', 'open', 'none') NOT NULL DEFAULT 'none',
    signal_date DATE NULL,
    signal_close DECIMAL(12, 4) NULL,
    bar_count INT UNSIGNED NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY uk_symbol_asof (symbol_id, as_of_date),
    KEY idx_asof_pct (as_of_date, running_total_pct),
    KEY idx_asof_signal (as_of_date, last_signal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-symbol Bollinger squeeze & reversion optimize results

CREATE TABLE IF NOT EXISTS system_bollinger_scan (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol_id INT NOT NULL,
    as_of_date DATE NOT NULL,
    opt_period INT UNSIGNED NOT NULL,
    opt_std_mult DECIMAL(6, 2) NOT NULL,
    opt_atr_period INT UNSIGNED NOT NULL,
    opt_atr_mult DECIMAL(6, 2) NOT NULL,
    opt_used_default TINYINT(1) NOT NULL DEFAULT 0,
    running_total DECIMAL(12, 4) NOT NULL,
    running_total_pct DECIMAL(14, 4) NULL,
    trade_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_signal ENUM('entry', 'exit', 'open', 'none') NOT NULL DEFAULT 'none',
    signal_date DATE NULL,
    signal_close DECIMAL(12, 4) NULL,
    bar_count INT UNSIGNED NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY uk_symbol_asof (symbol_id, as_of_date),
    KEY idx_asof_pct (as_of_date, running_total_pct),
    KEY idx_asof_signal (as_of_date, last_signal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-symbol Darvas box optimize results

CREATE TABLE IF NOT EXISTS system_darvas_scan (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol_id INT NOT NULL,
    as_of_date DATE NOT NULL,
    opt_high_lookback INT UNSIGNED NOT NULL,
    opt_box_build INT UNSIGNED NOT NULL,
    opt_ma_filter TINYINT(1) NOT NULL DEFAULT 0,
    opt_ma_period INT UNSIGNED NOT NULL DEFAULT 200,
    opt_ma_type ENUM('sma', 'ema') NOT NULL DEFAULT 'sma',
    opt_used_default TINYINT(1) NOT NULL DEFAULT 0,
    running_total DECIMAL(12, 4) NOT NULL,
    running_total_pct DECIMAL(14, 4) NULL,
    trade_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_signal ENUM('entry', 'exit', 'open', 'none') NOT NULL DEFAULT 'none',
    signal_date DATE NULL,
    signal_close DECIMAL(12, 4) NULL,
    bar_count INT UNSIGNED NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY uk_symbol_asof (symbol_id, as_of_date),
    KEY idx_asof_pct (as_of_date, running_total_pct),
    KEY idx_asof_signal (as_of_date, last_signal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-symbol Fibonacci retracement/extension optimize results

CREATE TABLE IF NOT EXISTS system_fibonacci_scan (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    symbol_id INT NOT NULL,
    as_of_date DATE NOT NULL,
    opt_swing_n INT UNSIGNED NOT NULL,
    opt_entry_level DECIMAL(6, 4) NOT NULL,
    opt_extension_target DECIMAL(6, 4) NOT NULL,
    opt_used_default TINYINT(1) NOT NULL DEFAULT 0,
    running_total DECIMAL(12, 4) NOT NULL,
    running_total_pct DECIMAL(14, 4) NULL,
    trade_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_signal ENUM('entry', 'exit', 'open', 'none') NOT NULL DEFAULT 'none',
    signal_date DATE NULL,
    signal_close DECIMAL(12, 4) NULL,
    bar_count INT UNSIGNED NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (symbol_id) REFERENCES stock_symbols(id) ON DELETE CASCADE,
    UNIQUE KEY uk_symbol_asof (symbol_id, as_of_date),
    KEY idx_asof_pct (as_of_date, running_total_pct),
    KEY idx_asof_signal (as_of_date, last_signal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

