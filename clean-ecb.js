const Database = require('better-sqlite3');
const db = new Database('data/cache.db');
const result = db.prepare("DELETE FROM speeches WHERE source = 'ECB' AND url NOT LIKE '%/press/key/%'").run();
console.log('Deleted', result.changes, 'non-speech ECB rows');