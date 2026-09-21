import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import { checkDatabaseConnection } from './config/database';

const app = express();

// ─── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ─── General Rate Limiting ────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await checkDatabaseConnection();
    res.json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database connection failed' });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

import path from 'path';
import { db } from './config/database';

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = Number(env.PORT);

async function startServer() {
  try {
    await db.migrate.latest({
      directory: path.join(__dirname, 'db/migrations'),
    });
    console.log('✅ Database migrations up-to-date');
  } catch (err) {
    console.error('❌ Database migration error:', err);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 DripNow API running on http://localhost:${PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
  });
}

startServer();

export default app;
