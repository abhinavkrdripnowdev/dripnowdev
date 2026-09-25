import knex from 'knex';
import { env } from './env';

import path from 'path';
import fs from 'fs';

const isSqlite = env.DB_CLIENT === 'better-sqlite3' || env.DB_CLIENT === 'sqlite3';

if (isSqlite) {
  const dbPath = path.resolve(env.DB_FILE);
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

export const db = knex(
  isSqlite
    ? {
        client: env.DB_CLIENT,
        connection: {
          filename: env.DB_FILE === ':memory:' ? ':memory:' : path.resolve(env.DB_FILE),
        },
        useNullAsDefault: true,
        pool: { min: 1, max: 1, afterCreate: (connection: any, done: any) => { if (env.DB_CLIENT === 'better-sqlite3') { connection.pragma('foreign_keys = ON'); done(null, connection); } else connection.run('PRAGMA foreign_keys = ON', (error: any) => done(error, connection)); } },
        debug: false,
      }
    : {
        client: 'mysql2',
        connection: {
          host: env.DB_HOST,
          port: Number(env.DB_PORT),
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          database: env.DB_NAME,
          charset: 'utf8mb4',
          timezone: '+00:00',
        },
        pool: {
          min: 2,
          max: 10,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
        },
        debug: false,
      }
);

export async function checkDatabaseConnection(): Promise<void> {
  await db.raw('SELECT 1');
}
