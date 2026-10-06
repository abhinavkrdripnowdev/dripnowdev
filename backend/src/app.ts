import { migrateDatabase } from './db/migrate';
import { orderRequestRoutes, adminOrderRequestRoutes } from './modules/order/order.requests';
import adminSecurityRoutes from './modules/admin/admin.security.routes';
import { maintenance } from './jobs/maintenance';
import express from 'express';
import paymentRoutes, { paymentWebhook } from './modules/payment/payment.routes';
import deliveryRoutes, { deliveryAdminRoutes } from './modules/delivery/delivery.routes';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customer/customer.routes';
import mapsRoutes from './modules/maps/maps.routes';
import sellerRoutes from './modules/seller/seller.routes';
import adminSellerRoutes from './modules/admin/admin.seller.routes';
import productRoutes from './modules/product/product.routes';
import sellerOrderRoutes from './modules/seller_order/seller_order.routes';
import offerRoutes from './modules/offer/offer.routes';
import cartRoutes from './modules/cart/cart.routes';
import orderRoutes from './modules/order/order.routes';
import financeRoutes from './modules/finance/finance.routes';
import notificationRoutes from './modules/notification/notification.routes';
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
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), paymentWebhook);
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
app.use('/api/v1/customer', customerRoutes);
app.use('/api/v1/maps', mapsRoutes);
app.use('/api/v1/seller/orders', sellerOrderRoutes);
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/admin/sellers', adminSellerRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRequestRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/admin/delivery', deliveryAdminRoutes);
app.use('/api/v1/admin/order-requests', adminOrderRequestRoutes);
app.use('/api/v1/admin', adminSecurityRoutes);

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
    await migrateDatabase();
    console.log('✅ Database migrations up-to-date');
  } catch (err) {
    console.error('Database migration error:', err);
    await db.destroy();
    process.exitCode = 1;
    return;
  }

  let maintenanceRunning = false;
  const timer = setInterval(() => { if (maintenanceRunning) return; maintenanceRunning = true; maintenance().catch(error => console.error('Maintenance failed', error)).finally(() => { maintenanceRunning = false; }); }, 60000);
  timer.unref();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 DripNow API running on http://localhost:${PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Last Reload Time: ${new Date().toISOString()}\n`);
  });
  const shutdown = () => { clearInterval(timer); server.close(() => { void db.destroy(); }); };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}

if (require.main === module) startServer();

export default app;
