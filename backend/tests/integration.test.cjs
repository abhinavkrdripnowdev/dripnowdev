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
  await cart.addToCart(customer, { product_id: product, variant_id: variant, quantity: 1 });
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

test('financial journals balance and ordinary admins cannot perform financial operations', async () => {
  const admin = await user('customer'), superOne = await user('customer'), superTwo = await user('customer');
  await db('user_roles').insert([{ user_id: admin, role_id: 4 }, { user_id: superOne, role_id: 5 }, { user_id: superTwo, role_id: 5 }]);
  const adminToken = (await auth.createSession(admin, ['admin'])).accessToken;
  const firstToken = (await auth.createSession(superOne, ['super_admin'])).accessToken;
  const secondToken = (await auth.createSession(superTwo, ['super_admin'])).accessToken;
  assert.equal((await request('/api/v1/finance/payouts', 'POST', { beneficiary_type: 'SELLER', beneficiary_id: seller, settlement_ids: [] }, adminToken)).status, 403);
  const cod = await db('cod_records').first();
  assert.equal((await request(`/api/v1/admin/delivery/cod/${cod.id}/reconcile`, 'POST', { reference: 'CASH-TEST' }, adminToken)).status, 403);
  const settlement = await db('settlements').where({ seller_id: seller, status: 'ELIGIBLE' }).first();
  assert.ok(settlement, 'maintenance should create seller settlement after return window');
  const created = await request('/api/v1/finance/payouts', 'POST', { beneficiary_type: 'SELLER', beneficiary_id: seller, settlement_ids: [settlement.id] }, firstToken);
  assert.equal(created.status, 200);
  const payoutId = created.body.data.id;
  assert.equal((await request(`/api/v1/finance/payouts/${payoutId}/approve`, 'POST', {}, firstToken)).status, 403);
  assert.equal((await request(`/api/v1/finance/payouts/${payoutId}/approve`, 'POST', {}, secondToken)).status, 200);
  assert.equal((await request(`/api/v1/finance/payouts/${payoutId}/execute`, 'POST', { manual_reference: 'BANK-TRANSFER-1' }, firstToken)).status, 403);
  assert.equal((await request(`/api/v1/finance/payouts/${payoutId}/execute`, 'POST', { manual_reference: 'BANK-TRANSFER-1' }, secondToken)).status, 200);
  assert.equal((await db('settlements').where({ id: settlement.id }).first()).status, 'PAID');
  const transactions = await db('financial_transactions');
  assert.ok(transactions.some(t => t.type === 'CUSTOMER_PAYMENT'));
  assert.ok(transactions.some(t => t.type === 'DELIVERY_EARNING'));
  assert.ok(transactions.some(t => t.type === 'SELLER_PAYABLE'));
  assert.ok(transactions.some(t => t.type === 'PAYOUT'));
  for (const transaction of transactions) {
    const entries = await db('ledger_entries').where({ transaction_id: transaction.id });
    const debit = entries.filter(e => e.direction === 'DEBIT').reduce((s, e) => s + Number(e.amount_paise), 0);
    const credit = entries.filter(e => e.direction === 'CREDIT').reduce((s, e) => s + Number(e.amount_paise), 0);
    assert.equal(debit, credit); assert.ok(debit > 0);
  }
});

test('size exchange reserves replacement stock and completes only after pickup', async () => {
  const replacement = randomUUID();
  await db('product_variants').insert({ id: replacement, product_id: product, sku: 'TEST-XL', size: 'XL', is_active: true });
  await db('inventory').insert({ id: randomUUID(), variant_id: replacement, quantity: 3 });
  await cart.addToCart(customer, { product_id: product, variant_id: variant, quantity: 1 });
  const placed = await orders.checkout(customer, address, 'cod');
  await db('orders').where({ id: placed.order_id }).update({ status: '3_HOUR_RETURN_WINDOW', return_window_ends_at: new Date(Date.now() + 3600000) });
  const item = await db('seller_order_items as i').join('seller_orders as s', 's.id', 'i.seller_order_id').where('s.parent_order_id', placed.order_id).select('i.*').first();
  const requested = await request(`/api/v1/orders/${placed.order_id}/requests`, 'POST', { kind: 'EXCHANGE', reason: 'Need a larger size', order_item_id: item.id, requested_variant_id: replacement, quantity: 1 });
  assert.equal(requested.status, 200);
  const admin = await db('users as u').join('user_roles as ur', 'ur.user_id', 'u.id').where('ur.role_id', 4).select('u.id').first();
  const adminToken = (await auth.createSession(admin.id, ['admin'])).accessToken;
  assert.equal((await request(`/api/v1/admin/order-requests/${requested.body.data.id}`, 'PATCH', { action: 'APPROVE', note: 'Replacement stock confirmed' }, adminToken)).status, 200);
  assert.equal((await db('inventory').where({ variant_id: replacement }).first()).quantity, 2);
  assert.equal((await request(`/api/v1/admin/order-requests/${requested.body.data.id}/fulfillment`, 'PATCH', { action: 'EXCHANGE_COMPLETED', note: 'Tried to skip pickup' }, adminToken)).status, 409);
  await db('delivery_partner_locations').update({ updated_at: new Date() });
  let reverse = await delivery.availableReverseTasks(partner); assert.equal(reverse.length, 1);
  await delivery.acceptReverseTask(partner, reverse[0].id); await delivery.progressReverseTask(partner, reverse[0].id, 'PICKED_UP'); await delivery.progressReverseTask(partner, reverse[0].id, 'IN_TRANSIT'); await delivery.progressReverseTask(partner, reverse[0].id, 'DELIVERED');
  assert.equal((await request(`/api/v1/admin/order-requests/${requested.body.data.id}/fulfillment`, 'PATCH', { action: 'PICKUP_COMPLETED', note: 'Pickup evidence recorded' }, adminToken)).status, 200);
  await db('delivery_partner_locations').update({ updated_at: new Date() });
  reverse = await delivery.availableReverseTasks(partner); assert.equal(reverse.length, 1);
  await delivery.acceptReverseTask(partner, reverse[0].id); await delivery.progressReverseTask(partner, reverse[0].id, 'PICKED_UP'); await delivery.progressReverseTask(partner, reverse[0].id, 'IN_TRANSIT'); await delivery.progressReverseTask(partner, reverse[0].id, 'DELIVERED');
  assert.equal((await request(`/api/v1/admin/order-requests/${requested.body.data.id}/fulfillment`, 'PATCH', { action: 'EXCHANGE_COMPLETED', note: 'Replacement delivered' }, adminToken)).status, 200);
  assert.equal((await db('inventory').where({ variant_id: variant }).first()).quantity > 0, true);
});

test('product moderation, notification ownership, validation and CORS are enforced', async () => {
  const admin = await db('users as u').join('user_roles as ur', 'ur.user_id', 'u.id').where('ur.role_id', 4).select('u.id').first();
  const adminToken = (await auth.createSession(admin.id, ['admin'])).accessToken;
  assert.equal((await request(`/api/v1/admin/products/${product}/moderation`, 'PATCH', { status: 'SUSPENDED', note: 'Policy test' }, adminToken)).status, 200);
  const catalog = await request('/api/v1/products', 'GET', undefined, null);
  assert.equal(catalog.body.data.some(p => p.id === product), false);
  assert.equal((await request('/api/v1/admin/users/not-a-uuid/status', 'PATCH', { status: 'BLOCKED', reason: "x' OR 1=1 --" }, adminToken)).status, 422);
  const mine = await request('/api/v1/notifications'); assert.equal(mine.status, 200); assert.ok(mine.body.data.every(n => n.user_id === customer));
  const cors = await fetch(base + '/api/v1/products', { headers: { Origin: 'https://evil.example' } });
  assert.notEqual(cors.headers.get('access-control-allow-origin'), 'https://evil.example');
});

test('multi-seller checkout, delivery, return pickup and COD refund reconcile end to end', async () => {
  await cart.clearCart(customer);
  const sellers = [], variants = [];
  for (let i = 0; i < 2; i++) {
    const sellerUser = await user('seller'), sellerId = randomUUID(), productId = randomUUID(), variantId = randomUUID();
    await db('seller_profiles').insert({ id: sellerId, user_id: sellerUser, business_name: `Multi Store ${i}`, status: 'approved' });
    await db('seller_locations').insert({ id: randomUUID(), seller_id: sellerId, address_line1: `Pickup ${i}`, city: 'Mumbai', state: 'MH', postal_code: '400001', latitude: 19.07 + i * .01, longitude: 72.87 + i * .01, active: true });
    await db('products').insert({ id: productId, seller_id: sellerId, category_id: 1, name: `Multi product ${i}`, slug: `multi-product-${i}`, base_price: 500 + i * 100, moderation_status: 'APPROVED' });
    await db('product_variants').insert({ id: variantId, product_id: productId, sku: `MULTI-${i}`, is_active: true });
    await db('inventory').insert({ id: randomUUID(), variant_id: variantId, quantity: 10 });
    sellers.push(sellerId); variants.push({ productId, variantId });
    await cart.addToCart(customer, { product_id: productId, variant_id: variantId, quantity: 1 });
  }
  await db('platform_offers').insert({ id: randomUUID(), name: 'Multi checkout saving', code: 'MULTI10', offer_type: 'flat', discount_value: 10, min_order_value: 0 });
  const quote = await orders.checkout(customer, address, 'cod', undefined, true, 'MULTI10');
  assert.equal(quote.platform_discount, 10);
  assert.ok(quote.delivery_fee > 0 && quote.delivery_fee < 80, 'customer receives one route fee, not one fee per seller');
  const placed = await orders.checkout(customer, address, 'cod', undefined, false, 'MULTI10');
  const shipments = await db('seller_orders').where({ parent_order_id: placed.order_id });
  assert.equal(shipments.length, 2);
  assert.equal(Math.round(shipments.reduce((sum, s) => sum + Number(s.total_amount), 0) * 100), Math.round(placed.final_amount * 100));
  await db('seller_orders').where({ parent_order_id: placed.order_id }).update({ status: 'ready_for_pickup' });
  for (let i = 0; i < 2; i++) {
    await db('delivery_partner_locations').update({ updated_at: new Date(), latitude: 19.07, longitude: 72.87 });
    const available = await delivery.availableTasks(partner); assert.ok(available.length >= 1); assert.equal(Number(available[0].multi_seller_bonus_paise), 1000);
    const task = available[0]; await delivery.acceptTask(partner, task.id); await delivery.progressTask(partner, task.id, 'PICKED_UP'); await delivery.progressTask(partner, task.id, 'IN_TRANSIT');
    const shipment = await db('seller_orders').where({ id: task.seller_order_id }).first(); await delivery.progressTask(partner, task.id, 'DELIVERED', Math.round(Number(shipment.total_amount) * 100));
  }
  const order = await db('orders').where({ id: placed.order_id }).first(); assert.equal(order.status, '3_HOUR_RETURN_WINDOW');
  const requested = await request(`/api/v1/orders/${placed.order_id}/requests`, 'POST', { kind: 'RETURN', reason: 'Both products arrived damaged' }); assert.equal(requested.status, 200);
  const admin = await db('users as u').join('user_roles as ur', 'ur.user_id', 'u.id').where('ur.role_id', 4).select('u.id').first(); const adminToken = (await auth.createSession(admin.id, ['admin'])).accessToken;
  assert.equal((await request(`/api/v1/admin/order-requests/${requested.body.data.id}`, 'PATCH', { action: 'APPROVE', note: 'Damage evidence accepted' }, adminToken)).status, 200);
  for (let i = 0; i < 2; i++) {
    await db('delivery_partner_locations').update({ updated_at: new Date(), latitude: 19.08, longitude: 72.88 });
    const available = await delivery.availableReverseTasks(partner); assert.ok(available.length >= 1); const task = available[0]; await delivery.acceptReverseTask(partner, task.id); await delivery.progressReverseTask(partner, task.id, 'PICKED_UP'); await delivery.progressReverseTask(partner, task.id, 'IN_TRANSIT'); await delivery.progressReverseTask(partner, task.id, 'DELIVERED');
  }
  assert.equal((await request(`/api/v1/admin/order-requests/${requested.body.data.id}/fulfillment`, 'PATCH', { action: 'PICKUP_COMPLETED', note: 'Returned to both sellers' }, adminToken)).status, 200);
  assert.equal((await request(`/api/v1/admin/order-requests/${requested.body.data.id}/fulfillment`, 'PATCH', { action: 'INSPECTION_PASSED', note: 'Damage confirmed at inspection' }, adminToken)).status, 200);
  assert.equal((await request(`/api/v1/admin/order-requests/${requested.body.data.id}/refund`, 'POST', { reference: 'COD-REFUND-1' }, adminToken)).status, 403);
  const superAdmin = await db('users as u').join('user_roles as ur', 'ur.user_id', 'u.id').where('ur.role_id', 5).select('u.id').first(); const superToken = (await auth.createSession(superAdmin.id, ['super_admin'])).accessToken;
  assert.equal((await request(`/api/v1/admin/order-requests/${requested.body.data.id}/refund`, 'POST', { reference: 'COD-REFUND-1' }, superToken)).status, 200);
  assert.equal((await db('refunds').where({ order_request_id: requested.body.data.id }).first()).status, 'COMPLETED');
  assert.ok(await db('financial_transactions').where({ idempotency_key: `refund:${requested.body.data.id}` }).first());
});

test('database constraints reject orphans and transactions roll back completely', async () => {
  await assert.rejects(db('ledger_entries').insert({ id: randomUUID(), transaction_id: randomUUID(), account_id: randomUUID(), direction: 'DEBIT', amount_paise: 1 }));
  const marker = randomUUID();
  await assert.rejects(db.transaction(async trx => { await trx('financial_accounts').insert({ id: marker, owner_type: 'PLATFORM', owner_id: marker, account_type: 'ROLLBACK_TEST' }); throw new Error('rollback'); }));
  assert.equal(await db('financial_accounts').where({ id: marker }).first(), undefined);
  const orphanItems = await db('seller_order_items as i').leftJoin('seller_orders as s', 's.id', 'i.seller_order_id').whereNull('s.id').count({ count: '*' }).first();
  assert.equal(Number(orphanItems.count), 0);
});

test('invalid and expired JWTs fail and login brute force is rate limited', async () => {
  assert.equal((await request('/api/v1/cart', 'GET', undefined, 'not-a-jwt')).status, 401);
  const jwt = require('jsonwebtoken');
  const session = await auth.createSession(customer, ['customer']);
  const expired = jwt.sign({ sub: customer, roles: ['customer'], sessionId: session.sessionId }, process.env.JWT_ACCESS_SECRET, { expiresIn: -1, issuer: 'dripnow', audience: 'dripnow-client' });
  assert.equal((await request('/api/v1/cart', 'GET', undefined, expired)).status, 401);
  const attempts = [];
  for (let i = 0; i < 22; i++) attempts.push(await request('/api/auth/login/email', 'POST', { email: `missing${i}@example.test`, password: 'WrongPassword123!' }, null));
  assert.ok(attempts.some(result => result.status === 429));
});
