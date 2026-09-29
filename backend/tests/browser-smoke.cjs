// Optional full browser smoke test. Set PLAYWRIGHT_MODULE to your Playwright package path.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
Object.assign(process.env, { NODE_ENV: 'test', DB_CLIENT: 'better-sqlite3', DB_FILE: ':memory:', JWT_ACCESS_SECRET: 'browser-test-access-'.repeat(4), JWT_REFRESH_SECRET: 'browser-test-refresh-'.repeat(4), SMTP_HOST: '', SMTP_PASS: '', RESEND_API_KEY: '' });
const { db } = require('../dist/config/database');
const { migrateDatabase } = require('../dist/db/migrate');
const { generateVerificationProof } = require('../dist/services/otp.service');
const { createSession } = require('../dist/services/token.service');
const { registerCustomer } = require('../dist/modules/auth/auth.service');
const { createProduct } = require('../dist/modules/product/product.service');
const api = require('../dist/app').default;
const express = require('express');
let server, browser;
(async () => {
  await migrateDatabase();
  const customer = await registerCustomer({ username: 'browser_customer', full_name: 'Browser Customer', email: 'browser@example.test', phone: '+919999999991', password: 'BrowserPassword123!', email_token: generateVerificationProof('browser@example.test'), phone_token: generateVerificationProof('+919999999991') });
  const sellerUser = randomUUID(), seller = randomUUID();
  await db('users').insert({ id: sellerUser, full_name: 'Browser Seller', status: 'active', account_status: 'APPROVED', email_verified: true, phone_verified: true });
  await db('user_roles').insert({ user_id: sellerUser, role_id: 2 });
  await db('seller_profiles').insert({ id: seller, user_id: sellerUser, business_name: 'Browser Store', status: 'approved' });
  const sellerTokens = await createSession(sellerUser, ['seller']);
  const sellerAuth = {
    user: {
      id: sellerUser,
      username: 'browser_seller',
      full_name: 'Browser Seller',
      email: 'seller@example.test',
      phone: '+919999999992',
      avatar_url: null,
      status: 'active',
      account_status: 'APPROVED',
      phone_verified: true,
      email_verified: true,
      roles: ['seller'],
    },
    accessToken: sellerTokens.accessToken,
  };
  const deliveryUser = randomUUID(), deliveryPartner = randomUUID();
  await db('users').insert({ id: deliveryUser, full_name: 'Browser Rider', email: 'rider@example.test', phone: '+919999999993', status: 'active', account_status: 'APPROVED', email_verified: true, phone_verified: true });
  await db('user_roles').insert({ user_id: deliveryUser, role_id: 3 });
  await db('delivery_partner_profiles').insert({ id: deliveryPartner, user_id: deliveryUser, vehicle_type: 'motorcycle', license_number: 'MH01BROWSER', documents_json: JSON.stringify(['https://example.test/license.pdf']), status: 'APPROVED', available: true });
  await db('delivery_partner_locations').insert({ partner_id: deliveryPartner, latitude: 19.071, longitude: 72.871, updated_at: new Date() });
  const deliveryTokens = await createSession(deliveryUser, ['delivery_partner']);
  const deliveryAuth = { user: { id: deliveryUser, username: 'browser_rider', full_name: 'Browser Rider', email: 'rider@example.test', phone: '+919999999993', avatar_url: null, status: 'active', account_status: 'APPROVED', phone_verified: true, email_verified: true, roles: ['delivery_partner'] }, accessToken: deliveryTokens.accessToken };
  const managerUser = randomUUID();
  await db('users').insert({ id: managerUser, full_name: 'Browser Operations', email: 'operations@example.test', phone: '+919999999994', status: 'active', account_status: 'APPROVED', email_verified: true, phone_verified: true });
  await db('user_roles').insert({ user_id: managerUser, role_id: 4 });
  const managerTokens = await createSession(managerUser, ['manager']);
  const managerAuth = { user: { id: managerUser, username: 'browser_operations', full_name: 'Browser Operations', email: 'operations@example.test', phone: '+919999999994', avatar_url: null, status: 'active', account_status: 'APPROVED', phone_verified: true, email_verified: true, roles: ['manager'] }, accessToken: managerTokens.accessToken };
  await db('seller_locations').insert({ id: randomUUID(), seller_id: seller, address_line1: 'Pickup street', city: 'Mumbai', state: 'MH', postal_code: '400001', latitude: 19.07, longitude: 72.87 });
  await db('categories').insert({ id: 1, name: 'Fashion', slug: 'fashion' });
  const browserProduct = await createProduct(seller, { name: 'Browser Test Dress', category_id: 1, base_price: 700, description: 'A test product for the browser checkout scenario.', variants: [{ sku: 'BROWSER-SKU', size: 'M', color: 'Blue', initial_quantity: 10 }], images: [{ image_url: '/favicon.svg' }] });
  await db('products').where({ id: browserProduct.id }).update({ moderation_status: 'APPROVED' });
  await db('addresses').insert({ id: randomUUID(), user_id: customer.user.id, address_line1: 'Browser delivery address', city: 'Mumbai', state: 'MH', postal_code: '400001', latitude: 19.08, longitude: 72.88, is_default: true });
  const app = express(); app.use((req,res,next) => req.path.startsWith('/api/') ? api(req,res,next) : next());
  const root = path.resolve(__dirname, '../../frontend/dist'); app.use(express.static(root)); app.get('/{*path}', (_req,res) => res.sendFile(path.join(root, 'index.html')));
  server = app.listen(0); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(base); await page.getByRole('button', { name: 'Browser Test Dress', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Add to Cart', exact: true }).first().click();
  await page.getByRole('status').filter({ hasText: 'Added to your guest cart' }).waitFor();
  await page.evaluate(({ user, accessToken }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('dripnow-auth', JSON.stringify({ state: { user, isAuthenticated: true }, version: 0 }));
  }, customer);
  await page.goto(base + '/dashboard');
  await page.getByRole('button', { name: 'Browser Test Dress', exact: true }).waitFor();
  // Wait for the persisted guest cart to be merged, then open it.
  await page.waitForFunction(() => sessionStorage.getItem('guestCart') === '[]');
  await page.locator('#open-cart-btn').click();
  await page.getByRole('button', { name: 'Review total', exact: true }).click();
  await page.getByRole('button', { name: /Place Order \(₹/ }).and(page.locator(':enabled')).waitFor();
  assert.equal(await page.getByRole('button', { name: /Place Order \(₹/ }).isEnabled(), true);
  const artifacts = path.join(__dirname, 'artifacts'); fs.mkdirSync(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, 'checkout.png'), fullPage: true });
  await page.getByRole('button', { name: /Place Order \(₹/ }).click();
  await page.getByText('PAYMENT_CONFIRMED', { exact: true }).waitFor();
  assert.equal((await db('orders').where({ customer_id: customer.user.id })).length, 1);
  await db('seller_orders').where({ customer_id: customer.user.id }).update({ status: 'ready_for_pickup' });
  assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(artifacts, 'orders.png'), fullPage: true });
  await page.evaluate(({ user, accessToken }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('dripnow-auth', JSON.stringify({ state: { user, isAuthenticated: true }, version: 0 }));
  }, sellerAuth);
  await page.goto(base + '/seller/dashboard');
  await page.locator('.dash-sidebar__nav-item').filter({ hasText: 'Products' }).click();
  await page.getByRole('heading', { name: 'Products & inventory' }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'seller-products.png'), fullPage: true });
  await page.locator('.dash-sidebar__nav-item').filter({ hasText: 'Offers' }).click();
  await page.getByRole('heading', { name: 'Offers & coupons' }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'seller-offers.png'), fullPage: true });
  await page.locator('.dash-sidebar__nav-item').filter({ hasText: 'Profile & Documents' }).click();
  await page.getByRole('heading', { name: 'Business profile' }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'seller-profile.png'), fullPage: true });
  await page.evaluate(({ user, accessToken }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('dripnow-auth', JSON.stringify({ state: { user, isAuthenticated: true }, version: 0 }));
  }, deliveryAuth);
  await page.goto(base + '/delivery/dashboard');
  await page.getByRole('heading', { name: 'Ready for the road?' }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'delivery-overview.png'), fullPage: true });
  await page.locator('.dash-sidebar__nav-item').filter({ hasText: 'Open Orders' }).click();
  await page.getByRole('heading', { name: 'Open orders' }).waitFor();
  await page.getByRole('button', { name: /Accept delivery/ }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'delivery-open-orders.png'), fullPage: true });
  await page.getByRole('button', { name: /Accept delivery/ }).click();
  await page.getByRole('status').filter({ hasText: 'Delivery accepted' }).waitFor();
  await page.locator('.dash-sidebar__nav-item').filter({ hasText: 'Active Delivery' }).click();
  await page.getByRole('heading', { name: 'Active delivery' }).waitFor();
  await page.getByRole('button', { name: 'Confirm pickup' }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'delivery-active.png'), fullPage: true });
  await page.locator('.dash-sidebar__nav-item').filter({ hasText: 'Delivery History' }).click();
  await page.getByRole('heading', { name: 'Delivery history' }).waitFor();
  await page.locator('.dash-sidebar__nav-item').filter({ hasText: 'Earnings' }).click();
  await page.getByRole('heading', { name: 'Earnings', exact: true }).waitFor();
  await page.locator('.dash-sidebar__nav-item').filter({ hasText: 'Profile & Vehicle' }).click();
  await page.getByRole('heading', { name: 'Profile & vehicle' }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'delivery-profile.png'), fullPage: true });
  await page.evaluate(({ user, accessToken }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('dripnow-auth', JSON.stringify({ state: { user, isAuthenticated: true }, version: 0 }));
  }, managerAuth);
  await page.goto(base + '/manager/dashboard');
  await page.getByRole('heading', { name: 'Platform overview' }).waitFor();
  await page.screenshot({ path: path.join(artifacts, 'manager-overview.png'), fullPage: true });
  const managerSections = [
    ['Finance', 'Finance control center', 'manager-finance.png'],
    ['Reports', 'Operational reports', 'manager-reports.png'],
    ['Seller Approvals', 'Seller management', 'manager-sellers.png'],
    ['Delivery Partners', 'Delivery partners & COD', 'manager-delivery.png'],
    ['Users', 'Users & admin access', 'manager-users.png'],
    ['Orders', 'Orders, returns & refunds', 'manager-orders.png'],
    ['Products', 'Product moderation', 'manager-products.png'],
    ['Audit Logs', 'Audit activity', 'manager-audit.png'],
  ];
  for (const [nav, heading, screenshot] of managerSections) {
    await page.locator('.dash-sidebar__nav-item').filter({ hasText: nav }).click();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    await page.screenshot({ path: path.join(artifacts, screenshot), fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log('Browser smoke passed: customer checkout, seller workspace, delivery workflow, and every manager operations section; no page errors.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); await db.destroy(); });
