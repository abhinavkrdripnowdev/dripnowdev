import { type Knex } from 'knex';
import path from 'path';
import { env } from '../config/env';

const isSqlite = env.DB_CLIENT === 'better-sqlite3' || env.DB_CLIENT === 'sqlite3';

const config: { [key: string]: Knex.Config } = {
  development: isSqlite
    ? {
        client: env.DB_CLIENT,
        connection: {
          filename: path.resolve(env.DB_FILE),
        },
        useNullAsDefault: true,
        migrations: {
          directory: path.join(__dirname, 'migrations'),
          extension: 'ts',
        },
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
        },
        migrations: {
          directory: path.join(__dirname, 'migrations'),
          extension: 'ts',
        },
        seeds: {
          directory: path.join(__dirname, 'seeds'),
          extension: 'ts',
        },
      },
  production: {
    client: 'mysql2',
    connection: {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      charset: 'utf8mb4',
      ssl: { rejectUnauthorized: true },
    },
    migrations: {
      directory: path.join(__dirname, '../src/db/migrations'),
    },
    pool: { min: 2, max: 10 },
  },
};

export default config;
