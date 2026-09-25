import { db } from '../config/database';
import fs from 'fs/promises';
import path from 'path';
// Stable historical .ts names work for both source development and compiled production.
export async function migrateDatabase() {
  const directory = path.join(__dirname, 'migrations');
  const extension = path.extname(__filename);
  return db.migrate.latest({ migrationSource: {
    getMigrations: async () => (await fs.readdir(directory)).filter(name => name.endsWith(extension) && !name.endsWith('.d.ts')).sort(),
    getMigrationName: (name: string) => name.replace(/\.js$/, '.ts'),
    getMigration: (name: string) => Promise.resolve(require(path.join(directory, name))),
  } });
}
