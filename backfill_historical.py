"""
backfill_historical.py
One-time script to backfill 10 years of daily OHLC data
into the historical_prices table in cache.db.

Run manually: python backfill_historical.py
Requires: pip install yfinance --break-system-packages
"""

import sqlite3
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta

DB_PATH = "./data/cache.db"  # matches the path used in lib/db.ts

# Map your app's pair names -> Yahoo Finance tickers
PAIR_TICKERS = {
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "USDJPY=X",
    "AUDUSD": "AUDUSD=X",
    "USDCAD": "USDCAD=X",
    "NZDUSD": "NZDUSD=X",
    "USDCHF": "USDCHF=X",
    "XAUUSD": "GC=F",  # Gold futures, since XAUUSD=X is unreliable on Yahoo
}

YEARS_BACK = 10


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
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
        )
    """)
    return conn


def backfill_pair(conn, pair_name, ticker_symbol):
    print(f"Fetching {pair_name} ({ticker_symbol})...")

    end = datetime.now()
    start = end - timedelta(days=365 * YEARS_BACK)

    try:
        data = yf.download(
            ticker_symbol,
            start=start.strftime("%Y-%m-%d"),
            end=end.strftime("%Y-%m-%d"),
            interval="1d",
            progress=False,
            auto_adjust=True,
        )
    except Exception as e:
        print(f"  ERROR fetching {pair_name}: {e}")
        return 0

    if data.empty:
        print(f"  WARNING: no data returned for {pair_name}")
        return 0

    # Newer yfinance returns MultiIndex columns even for a single ticker — flatten them
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    print(f"  DEBUG columns: {list(data.columns)}")
    print(f"  DEBUG shape: {data.shape}")

    rows = []
    for date, row in data.iterrows():
        date_str = date.strftime("%Y-%m-%d")
        try:
            rows.append((
                pair_name,
                date_str,
                float(row["Open"]),
                float(row["High"]),
                float(row["Low"]),
                float(row["Close"]),
                int(row["Volume"]) if "Volume" in row and row["Volume"] == row["Volume"] else None,
            ))
        except (ValueError, TypeError):
            continue  # skip malformed rows (NaNs etc.)

    conn.executemany("""
        INSERT OR REPLACE INTO historical_prices
        (pair, date, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, rows)
    conn.commit()

    print(f"  Inserted/updated {len(rows)} rows for {pair_name}")
    return len(rows)


def main():
    conn = get_connection()
    total = 0

    for pair_name, ticker_symbol in PAIR_TICKERS.items():
        total += backfill_pair(conn, pair_name, ticker_symbol)

    conn.close()
    print(f"\nDone. {total} total rows backfilled across {len(PAIR_TICKERS)} pairs.")


if __name__ == "__main__":
    main()