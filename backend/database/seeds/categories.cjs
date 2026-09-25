// Idempotent catalog seed. No default passwords or privileged accounts.
const { db } = require('../../dist/config/database');
(async () => {
  for (const name of ['Fashion', 'Footwear', 'Accessories', 'Electronics', 'Home']) {
    await db('categories').insert({ name, slug: name.toLowerCase() }).onConflict('slug').ignore();
  }
  console.log('Categories seeded');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.destroy());
