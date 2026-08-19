const Database = require('better-sqlite3');
const db = new Database('data/cache.db');

const total = db.prepare('SELECT COUNT(*) as c FROM calendar_events').get();
console.log('Total rows in calendar_events table:', total.c);

const future = db.prepare("SELECT COUNT(*) as c FROM calendar_events WHERE date > datetime('now')").get();
console.log('Rows with a future date:', future.c);

const latest = db.prepare('SELECT date, event FROM calendar_events ORDER BY date DESC LIMIT 5').all();
console.log('Most recent 5 rows by date:');
console.log(latest);