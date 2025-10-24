-- ECHO Arena D1 Database Schema
-- Tables: users, matches, bots, orders, balances, burns, winners

-- Users table: stores unique wallet addresses
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_users_address ON users(address);

-- Matches table: 24h trading battles
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_ts INTEGER NOT NULL,
  end_ts INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'settled')) DEFAULT 'pending',
  result_hash TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_start_ts ON matches(start_ts);

-- Bots table: user-created trading bots with prompts
CREATE TABLE IF NOT EXISTS bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  owner_address TEXT NOT NULL COLLATE NOCASE,
  prompt_raw TEXT NOT NULL,
  prompt_dsl TEXT NOT NULL, -- JSON string
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE INDEX idx_bots_match_id ON bots(match_id);
CREATE INDEX idx_bots_owner_address ON bots(owner_address);
CREATE UNIQUE INDEX idx_bots_match_owner ON bots(match_id, owner_address);

-- Orders table: simulated trades executed by bots
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id INTEGER NOT NULL,
  ts INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
  qty REAL NOT NULL,
  fill_price REAL NOT NULL,
  fee REAL NOT NULL,
  slippage_bps REAL NOT NULL,
  FOREIGN KEY (bot_id) REFERENCES bots(id)
);

CREATE INDEX idx_orders_bot_id ON orders(bot_id);
CREATE INDEX idx_orders_ts ON orders(ts);

-- Balances table: snapshot of bot balances over time
CREATE TABLE IF NOT EXISTS balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id INTEGER NOT NULL,
  ts INTEGER NOT NULL,
  bnb_balance REAL NOT NULL,
  positions TEXT NOT NULL, -- JSON string: [{symbol, qty, avgPrice}]
  pnl_realized REAL NOT NULL DEFAULT 0,
  pnl_unrealized REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (bot_id) REFERENCES bots(id)
);

CREATE INDEX idx_balances_bot_id ON balances(bot_id);
CREATE INDEX idx_balances_ts ON balances(ts);

-- Burns table: verified $ECHO token burns for bot entry
CREATE TABLE IF NOT EXISTS burns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_address TEXT NOT NULL COLLATE NOCASE,
  tx_hash TEXT NOT NULL UNIQUE COLLATE NOCASE,
  amount_echo REAL NOT NULL,
  amount_bnb_equiv REAL NOT NULL,
  ts INTEGER NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN (0, 1))
);

CREATE INDEX idx_burns_owner_address ON burns(owner_address);
CREATE INDEX idx_burns_tx_hash ON burns(tx_hash);
CREATE INDEX idx_burns_verified ON burns(verified);

-- Winners table: match results and prizes
CREATE TABLE IF NOT EXISTS winners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  bot_id INTEGER NOT NULL,
  owner_address TEXT NOT NULL COLLATE NOCASE,
  start_balance REAL NOT NULL,
  end_balance REAL NOT NULL,
  pct_gain REAL NOT NULL,
  prize_bnb REAL NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0 CHECK(paid IN (0, 1)),
  paid_tx TEXT,
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (bot_id) REFERENCES bots(id)
);

CREATE INDEX idx_winners_match_id ON winners(match_id);
CREATE INDEX idx_winners_owner_address ON winners(owner_address);
CREATE INDEX idx_winners_paid ON winners(paid);
