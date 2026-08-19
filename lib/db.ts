import Database from 'better-sqlite3';

const db = new Database('./data/cache.db');

db.exec(`
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  date TEXT,
  currency TEXT,
  event TEXT,
  impact TEXT,
  actual TEXT,
  forecast TEXT,
  previous TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  headline TEXT,
  summary TEXT,
  source TEXT,
  url TEXT,
  published_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS prices (
  pair TEXT PRIMARY KEY,
  price REAL,
  prev_price REAL,
  change_pct REAL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS historical_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pair TEXT NOT NULL,
  date TEXT NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume INTEGER,
  UNIQUE(pair, date)
);

CREATE INDEX IF NOT EXISTS idx_historical_pair_date
ON historical_prices(pair, date);

CREATE TABLE IF NOT EXISTS speeches (
  id TEXT PRIMARY KEY,
  source TEXT,
  speaker TEXT,
  title TEXT,
  url TEXT,
  published_at TEXT,
  updated_at TEXT
);
`);


export default db;