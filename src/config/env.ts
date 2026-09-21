import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  DB_CLIENT: z.enum(['better-sqlite3', 'sqlite3', 'mysql2']).default('mysql2'),
  DB_FILE: z.string().default('./data/dripnow.sqlite'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('3306'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default('root'),
  DB_NAME: z.string().default('dripnow_db'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('DripNow <noreply@dripnow.com>'),

  OTP_EXPIRES_IN_MINUTES: z.string().default('10'),
  OTP_MAX_ATTEMPTS: z.string().default('5'),
  RESET_TOKEN_EXPIRES_IN_MINUTES: z.string().default('15'),
  SMS_PROVIDER: z.enum(['mock', 'msg91', 'twilio']).default('mock'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
