import { Knex } from 'knex';
export async function up(k: Knex): Promise<void> {
  await k.schema.createTable('consumed_proofs', t => { t.string('token_hash', 64).primary(); t.timestamp('consumed_at').notNullable(); });
  await k.schema.alterTable('users', t => { t.string('account_status', 20).notNullable().defaultTo('PENDING'); });
  await k('users').where({ status: 'active' }).update({ account_status: 'APPROVED' });
  await k.schema.alterTable('orders', t => {
    t.string('checkout_key', 100).nullable(); t.text('address_snapshot').nullable();
    t.timestamp('return_window_ends_at').nullable(); t.unique(['customer_id', 'checkout_key']);
  });
  await k.schema.createTable('payments', t => {
    t.string('id', 36).primary(); t.specificType('order_id', 'CHAR(36)').notNullable().unique().references('orders.id');
    t.string('provider_order_id', 100).nullable().unique(); t.string('provider_payment_id', 100).nullable().unique();
    t.integer('amount_paise').notNullable(); t.string('currency', 3).defaultTo('INR');
    t.string('status', 30).notNullable().defaultTo('pending'); t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.createTable('payment_transactions', t => {
    t.string('id', 64).primary(); t.string('payment_id', 36).nullable().references('payments.id');
    t.string('event', 100).notNullable(); t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.createTable('delivery_partner_profiles', t => {
    t.string('id', 36).primary(); t.specificType('user_id', 'CHAR(36)').notNullable().unique().references('users.id');
    t.string('vehicle_type', 50).notNullable(); t.string('license_number', 100).notNullable();
    t.text('documents_json').notNullable(); t.string('status', 20).defaultTo('PENDING');
    t.text('review_reason').nullable(); t.boolean('available').notNullable().defaultTo(false);
    t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.createTable('delivery_partner_locations', t => {
    t.string('partner_id', 36).primary().references('delivery_partner_profiles.id');
    t.decimal('latitude', 10, 8).notNullable(); t.decimal('longitude', 11, 8).notNullable(); t.timestamp('updated_at').notNullable();
  });
  await k.schema.createTable('delivery_tasks', t => {
    t.string('id', 36).primary(); t.specificType('seller_order_id', 'CHAR(36)').notNullable().unique().references('seller_orders.id');
    t.string('partner_id', 36).nullable().references('delivery_partner_profiles.id');
    t.string('status', 30).defaultTo('AVAILABLE'); t.integer('earning_paise').notNullable();
    t.timestamp('delivered_at').nullable(); t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.createTable('delivery_assignments', t => {
    t.string('id', 36).primary(); t.string('task_id', 36).notNullable().references('delivery_tasks.id');
    t.string('partner_id', 36).notNullable().references('delivery_partner_profiles.id');
    t.string('status', 30).defaultTo('OFFERED'); t.timestamp('created_at').defaultTo(k.fn.now()); t.unique(['task_id', 'partner_id']);
  });
  await k.schema.createTable('cod_records', t => {
    t.string('id', 36).primary(); t.string('task_id', 36).notNullable().unique().references('delivery_tasks.id');
    t.string('partner_id', 36).notNullable().references('delivery_partner_profiles.id');
    t.integer('amount_paise').notNullable(); t.string('status', 30).defaultTo('COLLECTED'); t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.createTable('cod_reconciliations', t => {
    t.string('id', 36).primary(); t.string('cod_record_id', 36).notNullable().unique().references('cod_records.id');
    t.specificType('admin_id', 'CHAR(36)').notNullable().references('users.id'); t.string('reference', 255).notNullable(); t.timestamp('created_at').defaultTo(k.fn.now());
  });
}
export async function down(k: Knex): Promise<void> {
  for (const table of ['cod_reconciliations', 'cod_records', 'delivery_assignments', 'delivery_tasks', 'delivery_partner_locations', 'delivery_partner_profiles', 'payment_transactions', 'payments', 'consumed_proofs']) await k.schema.dropTableIfExists(table);
  await k.schema.alterTable('orders', t => { t.dropUnique(['customer_id', 'checkout_key']); t.dropColumns('checkout_key', 'address_snapshot', 'return_window_ends_at'); });
  await k.schema.alterTable('users', t => t.dropColumn('account_status'));
}
