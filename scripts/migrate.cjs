const { db } = require('../dist/config/database');
const { migrateDatabase } = require('../dist/db/migrate');
migrateDatabase().then(() => console.log('Database migrations complete')).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.destroy());
