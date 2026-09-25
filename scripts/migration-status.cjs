const { db } = require('../dist/config/database');
db('knex_migrations').select('name', 'migration_time').then(rows => console.table(rows)).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.destroy());
