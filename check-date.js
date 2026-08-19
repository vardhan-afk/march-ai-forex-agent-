const Database = require('better-sqlite3');
const db = new Database('data/cache.db');
const rows = db.prepare('SELECT date FROM calendar_events LIMIT 3').all();
console.log(rows);
