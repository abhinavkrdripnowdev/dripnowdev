const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHmac } = require('node:crypto');
const path = require('node:path');
Object.assign(process.env, { NODE_ENV: 'test', DB_CLIENT: 'better-sqlite3', DB_FILE: ':memory:', JWT_ACCESS_SECRET: 'test-access-secret-'.repeat(4), JWT_REFRESH_SECRET: 'test-refresh-secret-'.repeat(4), SMTP_HOST: '', SMTP_PASS: '', RESEND_API_KEY: '' });
const { db } = require('../dist/config/database.js');
const auth = require('../dist/services/token.service.js');
const otp = require('../dist/services/otp.service.js');
const cart = require('../dist/modules/cart/cart.service.js');
const orders = require('../dist/modules/order/order.service.js');
const delivery = require('../dist/modules/delivery/delivery.service.js');
const { confirmCapturedPayment } = require('../dist/modules/payment/payment.routes.js');
const { verifySignature } = require('../dist/integrations/payment/razorpay.js');
const app = require('../dist/app.js').default;
let server, base, customer, seller, partner, address, product, variant, token;
async function user(role) {
  const id = randomUUID();
  await db('users').insert({ id, full_name: role, email: `${id}@example.test`, phone: `+91${Math.floor(Math.random()*1e10)}`, status: 'active', account_status: 'APPROVED', email_verified: true, phone_verified: true });
  await db('user_roles').insert({ user_id: id, role_id: role === 'customer' ? 1 : role === 'seller' ? 2 : 3 });
  return id;
}
async function request(url, method = 'GET', body, bearer = token) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}
before(async () => {
  await require('../dist/db/migrate').migrateDatabase();
  await db.raw('PRAGMA foreign_keys = ON');
  customer = await user('customer'); const sellerUser = await user('seller'); partner = await user('delivery');
  seller = randomUUID(); address = randomUUID(); product = randomUUID(); variant = randomUUID();
  await db('seller_profiles').insert({ id: seller, user_id: sellerUser, business_name: 'Test Store', status: 'approved' });
  await db('seller_locations').insert({ id: randomUUID(), seller_id: seller, address_line1: 'Pickup street', city: 'Mumbai', state: 'MH', postal_code: '400001', latitude: 19.07, longitude: 72.87 });
  await db('addresses').insert({ id: address, user_id: customer, address_line1: 'Delivery street', city: 'Mumbai', state: 'MH', postal_code: '400001', latitude: 19.08, longitude: 72.88 });
  await db('categories').insert({ id: 1, name: 'Clothes', slug: 'clothes' });
  await db('products').insert({ id: product, seller_id: seller, category_id: 1, name: 'Dress', slug: 'dress', base_price: 700 });
  await db('product_variants').insert({ id: variant, product_id: product, sku: 'TEST-SKU', size: 'M' });
  await db('inventory').insert({ id: randomUUID(), variant_id: variant, quantity: 20 });
  token = (await auth.createSession(customer, ['customer'])).accessToken;
  server = app.listen(0); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await db.destroy(); });
test('public catalog and private routes enforce authentication', async () => {
  assert.equal((await request('/api/v1/products', 'GET', undefined, null)).status, 200);
  assert.equal((await request('/api/v1/cart', 'GET', undefined, null)).status, 401);
  assert.equal((await request('/api/auth/google', 'POST', { email: 'victim@example.test', sub: 'forged' }, null)).status, 404);
});
test('customer cannot self-approve, assign roles, or modify seller inventory', async () => {
  assert.equal((await request('/api/v1/customer/profile', 'PUT', { status: 'active', roles: ['super_admin'] })).status, 422);
  assert.equal((await request(`/api/v1/products/variants/${variant}/inventory`, 'PUT', { quantity: 900 })).status, 403);
  assert.equal((await request('/api/v1/seller/register', 'POST', { business_name: 'Fake' })).status, 403);
});
test('refresh rotates opaque tokens and logout invalidates access tokens', async () => {
  const session = await auth.createSession(customer, ['customer']);
  const refreshed = await request('/api/auth/refresh', 'POST', { refreshToken: session.refreshToken }, null);
  assert.equal(refreshed.status, 200);
  assert.equal((await request('/api/v1/cart', 'GET', undefined, session.accessToken)).status, 401);
  assert.equal((await request('/api/auth/refresh', 'POST', { refreshToken: session.refreshToken }, null)).status, 401);
  assert.equal((await request('/api/auth/logout', 'POST', {}, refreshed.body.data.accessToken)).status, 200);
  assert.equal((await request('/api/v1/cart', 'GET', undefined, refreshed.body.data.accessToken)).status, 401);
});
test('proofs are random, purpose-bound, signed and expiring', () => {
  const proof = otp.generateVerificationProof('alice@example.test');
  assert.equal(otp.verifyProofToken('alice@example.test', proof), true);
  assert.equal(otp.verifyProofToken('bob@example.test', proof), false);
  assert.notEqual(proof, otp.generateVerificationProof('alice@example.test'));
  const payload = JSON.parse(Buffer.from(proof.split('.')[1], 'base64url'));
  assert.ok(payload.exp > payload.iat && payload.exp - payload.iat <= 900);
});
test('invalid quantities and foreign variants cannot enter cart', async () => {
  await assert.rejects(cart.addToCart(customer, { product_id: product, quantity: -1 }));
  await assert.rejects(cart.addToCart(customer, { product_id: product, variant_id: randomUUID(), quantity: 1 }));
});
test('checkout reserves inventory, is idempotent, never fabricates payment, and cancellation restores stock once', async () => {
  await cart.addToCart(customer, { product_id: product, quantity: 2 });
  const beforeStock = (await db('inventory').where({ variant_id: variant }).first()).quantity;
  const placed = await orders.checkout(customer, address, 'razorpay', 'checkout-unique-1');
  const retry = await orders.checkout(customer, address, 'razorpay', 'checkout-unique-1');
  assert.equal(placed.order_id, retry.order_id);
  const record = await db('orders').where({ id: placed.order_id }).first();
  assert.equal(record.payment_status, 'pending'); assert.equal(record.status, 'PAYMENT_PENDING');
  assert.equal((await db('inventory').where({ variant_id: variant }).first()).quantity, beforeStock - 2);
  await orders.cancelOrder(placed.order_id, customer); await orders.cancelOrder(placed.order_id, customer);
  assert.equal((await db('inventory').where({ variant_id: variant }).first()).quantity, beforeStock);
});
test('payment verification rejects tampering and duplicate captures are idempotent', async () => {
  const secret = 'webhook-secret', body = '{"test":1}';
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifySignature(body, signature, secret), true);
  assert.equal(verifySignature(body + 'x', signature, secret), false);
  assert.equal(verifySignature(body, 'bad', secret), false);
  await cart.addToCart(customer, { product_id: product, quantity: 1 });
  const placed = await orders.checkout(customer, address, 'razorpay');
  await db('payments').where({ order_id: placed.order_id }).update({ provider_order_id: 'order_test' });
  const payment = await db('payments').where({ order_id: placed.order_id }).first();
  const entity = { id: 'pay_test', order_id: 'order_test', status: 'captured', currency: 'INR', amount: payment.amount_paise };
  await assert.rejects(confirmCapturedPayment({ ...entity, amount: 1 }, 'bad-event'));
  await confirmCapturedPayment(entity, 'event1'); await confirmCapturedPayment(entity, 'event1');
  assert.equal((await db('orders').where({ id: placed.order_id }).first()).payment_status, 'paid');
  assert.equal((await db('payment_transactions').where({ id: 'event1' })).length, 1);
  await db('payments').where({ order_id: placed.order_id }).update({ status: 'refunded' });
  await confirmCapturedPayment(entity, 'event-replayed-after-refund');
  assert.equal((await db('payments').where({ order_id: placed.order_id }).first()).status, 'refunded');
  await assert.rejects(confirmCapturedPayment({ ...entity, id: 'pay_different' }, 'different-payment'));
});
test('delivery approval, assignment, COD collection and tracking privacy', async () => {
  const partnerId = randomUUID();
  await db('delivery_partner_profiles').insert({ id: partnerId, user_id: partner, vehicle_type: 'motorcycle', license_number: 'TEST', documents_json: '[]', status: 'APPROVED', available: true });
  await db('delivery_partner_locations').insert({ partner_id: partnerId, latitude: 19.07, longitude: 72.87, updated_at: new Date() });
  await cart.addToCart(customer, { product_id: product, quantity: 1 });
  const placed = await orders.checkout(customer, address, 'cod');
  await db('seller_orders').where({ parent_order_id: placed.order_id }).update({ status: 'ready_for_pickup' });
  const tasks = await delivery.availableTasks(partner); assert.equal(tasks.length, 1);
  await delivery.acceptTask(partner, tasks[0].id);
  await assert.rejects(delivery.acceptTask(partner, tasks[0].id));
  await delivery.progressTask(partner, tasks[0].id, 'PICKED_UP');
  await delivery.progressTask(partner, tasks[0].id, 'IN_TRANSIT');
  await assert.rejects(delivery.trackOrder(partner, placed.order_id));
  await assert.rejects(delivery.progressTask(partner, tasks[0].id, 'DELIVERED', 1));
  const shipment = await db('seller_orders').where({ parent_order_id: placed.order_id }).first();
  await delivery.progressTask(partner, tasks[0].id, 'DELIVERED', Math.round(Number(shipment.total_amount) * 100));
  assert.equal((await delivery.trackOrder(customer, placed.order_id))[0].latitude, null);
  assert.equal((await db('cod_records').where({ task_id: tasks[0].id })).length, 1);
});

test('customer, seller and delivery registration require both OTP proofs and grant only intended roles', async () => {
  const service = require('../dist/modules/auth/auth.service');
  for (const [index, method, role] of [[0, 'registerCustomer', 'customer'], [1, 'registerSeller', 'seller'], [2, 'registerDeliveryPartner', 'delivery_partner']]) {
    const email = `registration${index}@example.test`, phone = `+91900000000${index}`;
    const emailOtp = await otp.sendPreRegEmailOtp(email), phoneOtp = await otp.sendPreRegPhoneOtp(phone);
    const emailProof = await otp.verifyPreRegEmailOtp(email, emailOtp), phoneProof = await otp.verifyPreRegPhoneOtp(phone, phoneOtp);
    assert.equal((await otp.verifyPreRegPhoneOtp(phone, phoneOtp)).valid, false);
    const input = { username: `registered${index}`, full_name: 'Test Person', email, phone, password: 'TestPassword123!', email_token: emailProof.verificationToken, phone_token: phoneProof.verificationToken, business_name: 'Test Business' };
    await assert.rejects(service[method]({ ...input, phone_token: 'forged' }));
    const result = await service[method](input);
    assert.deepEqual(result.user.roles, [role]);
    assert.ok(result.user.phone_verified && result.user.email_verified);
    assert.equal(result.user.status, 'active');
    assert.equal((await db('consumed_proofs').where({ token_hash: require('../dist/utils/crypto').sha256Hash(input.phone_token) })).length, 1);
  }
});
test('password reset proof is single-use and revokes sessions', async () => {
  const service = require('../dist/modules/auth/auth.service');
  const account = await db('users').where({ email: 'registration0@example.test' }).first();
  const session = await auth.createSession(account.id, ['customer']);
  const proof = otp.generateVerificationProof(`reset:${account.id}`);
  await service.resetPasswordWithToken(account.email, proof, 'ChangedPassword123!');
  await assert.rejects(service.resetPasswordWithToken(account.email, proof, 'AnotherPassword123!'));
  assert.equal((await request('/api/v1/cart', 'GET', undefined, session.accessToken)).status, 401);
  const login = await service.loginWithEmail({ email: account.email, password: 'ChangedPassword123!' });
  assert.ok(login.accessToken);
});
test('a seller cannot mutate another seller product, image, variant or inventory', async () => {
  const stranger = await user('seller'), strangerId = randomUUID();
  await db('seller_profiles').insert({ id: strangerId, user_id: stranger, business_name: 'Other Store', status: 'approved' });
  const bearer = (await auth.createSession(stranger, ['seller'])).accessToken;
  assert.equal((await request(`/api/v1/products/${product}/variants`, 'POST', { sku: 'FOREIGN' }, bearer)).status, 404);
  assert.equal((await request(`/api/v1/products/${product}/images`, 'POST', { image_url: 'https://example.test/image.png' }, bearer)).status, 404);
  assert.equal((await request(`/api/v1/products/variants/${variant}/inventory`, 'PUT', { quantity: 500 }, bearer)).status, 404);
});
test('quotes do not reserve stock and seller discounts are server calculated', async () => {
  const offerId = randomUUID();
  await db('seller_offers').insert({ id: offerId, seller_id: seller, title: 'Automatic 10%', offer_type: 'percentage', discount_value: 10, min_order_value: 0 });
  await cart.addToCart(customer, { product_id: product, quantity: 1 });
  const stock = (await db('inventory').where({ variant_id: variant }).first()).quantity;
  const quote = await orders.checkout(customer, address, 'cod', undefined, true);
  assert.equal(quote.discount_amount, 70);
  assert.equal((await db('inventory').where({ variant_id: variant }).first()).quantity, stock);
  assert.equal((await cart.getCart(customer)).grouped_items[0].items.length, 1);
  await cart.clearCart(customer); await db('seller_offers').where({ id: offerId }).delete();
});
test('two distinct admin approvals are required and account suspension revokes access', async () => {
  const first = await user('customer'), second = await user('customer'), target = await user('customer');
  for (const id of [first, second]) await db('user_roles').insert({ user_id: id, role_id: 4 });
  const firstToken = (await auth.createSession(first, ['admin'])).accessToken;
  const secondToken = (await auth.createSession(second, ['admin'])).accessToken;
  const nomination = await request('/api/v1/admin/admin-requests', 'POST', { user_id: target }, firstToken);
  assert.equal(nomination.status, 200);
  const approvalUrl = `/api/v1/admin/admin-requests/${nomination.body.data.id}/approve`;
  await request(approvalUrl, 'POST', {}, firstToken); await request(approvalUrl, 'POST', {}, firstToken);
  assert.equal(await db('user_roles').where({ user_id: target, role_id: 4 }).first(), undefined);
  assert.equal((await request(approvalUrl, 'POST', {}, secondToken)).status, 200);
  assert.ok(await db('user_roles').where({ user_id: target, role_id: 4 }).first());
  const victim = await user('customer'), session = await auth.createSession(victim, ['customer']);
  assert.equal((await request(`/api/v1/admin/users/${victim}/status`, 'PATCH', { status: 'BLOCKED', reason: 'Fraud review' }, firstToken)).status, 200);
  assert.equal((await request('/api/v1/cart', 'GET', undefined, session.accessToken)).status, 401);
  await assert.rejects(auth.createSession(victim, ['customer']));
});
test('parallel refresh and checkout attempts have one winner and never oversell', async () => {
  const session = await auth.createSession(customer, ['customer']);
  const results = await Promise.allSettled([auth.rotateRefreshToken(session.refreshToken, customer, ['customer']), auth.rotateRefreshToken(session.refreshToken, customer, ['customer'])]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const previous = (await db('inventory').where({ variant_id: variant }).first()).quantity;
  await cart.addToCart(customer, { product_id: product, quantity: 1 });
  const checkouts = await Promise.allSettled([orders.checkout(customer, address, 'cod'), orders.checkout(customer, address, 'cod')]);
  assert.equal(checkouts.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await db('inventory').where({ variant_id: variant }).first()).quantity, previous - 1);
});
test('return window closes and requests are restricted to order owners', async () => {
  const delivered = await db('orders').where({ customer_id: customer, status: '3_HOUR_RETURN_WINDOW' }).first();
  assert.ok(delivered);
  const outsider = await user('customer'), otherToken = (await auth.createSession(outsider, ['customer'])).accessToken;
  assert.equal((await request(`/api/v1/orders/${delivered.id}/requests`, 'POST', { kind: 'RETURN', reason: 'Wrong item delivered' }, otherToken)).status, 404);
  await db('orders').where({ id: delivered.id }).update({ return_window_ends_at: new Date(Date.now() - 1000) });
  assert.equal((await request(`/api/v1/orders/${delivered.id}/requests`, 'POST', { kind: 'RETURN', reason: 'Wrong item delivered' })).status, 409);
  await require('../dist/jobs/maintenance').maintenance();
  assert.equal((await db('orders').where({ id: delivered.id }).first()).status, 'COMPLETED');
});
