import { Knex } from 'knex';

export async function up(k: Knex): Promise<void> {
  await k.schema.createTable('financial_accounts', t => {
    t.string('id', 36).primary();
    t.string('owner_type', 30).notNullable();
    t.string('owner_id', 36).notNullable().defaultTo('PLATFORM');
    t.string('account_type', 40).notNullable();
    t.string('currency', 3).notNullable().defaultTo('INR');
    t.string('status', 20).notNullable().defaultTo('ACTIVE');
    t.timestamp('created_at').defaultTo(k.fn.now());
    t.unique(['owner_type', 'owner_id', 'account_type', 'currency']);
  });
  await k.schema.createTable('financial_transactions', t => {
    t.string('id', 36).primary(); t.string('type', 40).notNullable();
    t.string('reference_type', 40).notNullable(); t.string('reference_id', 100).notNullable();
    t.bigInteger('amount_paise').notNullable(); t.string('currency', 3).notNullable().defaultTo('INR');
    t.string('status', 20).notNullable().defaultTo('POSTED'); t.string('idempotency_key', 180).notNullable().unique();
    t.text('metadata').nullable(); t.timestamp('created_at').defaultTo(k.fn.now());
    t.index(['reference_type', 'reference_id']); t.index(['status', 'created_at']);
  });
  await k.schema.createTable('ledger_entries', t => {
    t.string('id', 36).primary(); t.string('transaction_id', 36).notNullable().references('financial_transactions.id');
    t.string('account_id', 36).notNullable().references('financial_accounts.id'); t.string('direction', 6).notNullable();
    t.bigInteger('amount_paise').notNullable(); t.timestamp('created_at').defaultTo(k.fn.now());
    t.unique(['transaction_id', 'account_id', 'direction']); t.index(['account_id', 'created_at']);
  });
  await k.schema.createTable('delivery_earning_rules', t => {
    t.string('id', 36).primary(); t.decimal('base_distance_km', 8, 3).notNullable(); t.bigInteger('base_amount_paise').notNullable();
    t.decimal('additional_distance_unit_km', 8, 3).notNullable(); t.bigInteger('additional_amount_paise').notNullable();
    t.bigInteger('multi_seller_addition_paise').notNullable().defaultTo(0); t.boolean('active').notNullable().defaultTo(true);
    t.timestamp('effective_from').notNullable().defaultTo(k.fn.now()); t.timestamp('created_at').defaultTo(k.fn.now());
    t.index(['active', 'effective_from']);
  });
  await k('delivery_earning_rules').insert({ id: '00000000-0000-0000-0000-000000000001', base_distance_km: 1, base_amount_paise: 2000, additional_distance_unit_km: 1, additional_amount_paise: 500, multi_seller_addition_paise: 1000 });
  await k.schema.alterTable('delivery_tasks', t => { t.decimal('distance_km', 10, 3).nullable(); t.bigInteger('multi_seller_bonus_paise').notNullable().defaultTo(0); });
  await k.schema.createTable('settlements', t => {
    t.string('id', 36).primary(); t.string('seller_order_id', 36).notNullable().unique().references('seller_orders.id');
    t.string('seller_id', 36).notNullable().references('seller_profiles.id'); t.bigInteger('gross_paise').notNullable();
    t.bigInteger('deductions_paise').notNullable().defaultTo(0); t.bigInteger('payable_paise').notNullable();
    t.string('status', 30).notNullable().defaultTo('ELIGIBLE'); t.timestamp('eligible_at').notNullable();
    t.string('payout_id', 36).nullable(); t.timestamp('created_at').defaultTo(k.fn.now());
    t.index(['seller_id', 'status']);
  });
  await k.schema.createTable('payouts', t => {
    t.string('id', 36).primary(); t.string('beneficiary_type', 30).notNullable(); t.string('beneficiary_id', 36).notNullable();
    t.bigInteger('amount_paise').notNullable(); t.string('currency', 3).notNullable().defaultTo('INR');
    t.string('status', 30).notNullable().defaultTo('PENDING_APPROVAL'); t.string('provider_reference', 150).nullable().unique();
    t.specificType('initiated_by', 'CHAR(36)').notNullable().references('users.id');
    t.specificType('executed_by', 'CHAR(36)').nullable().references('users.id');
    t.text('failure_reason').nullable(); t.timestamp('created_at').defaultTo(k.fn.now()); t.timestamp('completed_at').nullable();
    t.index(['beneficiary_type', 'beneficiary_id', 'status']);
  });
  await k.schema.createTable('payout_approvals', t => {
    t.string('payout_id', 36).notNullable().references('payouts.id'); t.specificType('super_admin_id', 'CHAR(36)').notNullable().references('users.id');
    t.string('decision', 20).notNullable(); t.text('note').nullable(); t.timestamp('created_at').defaultTo(k.fn.now());
    t.primary(['payout_id', 'super_admin_id']);
  });
  await k.schema.createTable('refunds', t => {
    t.string('id', 36).primary(); t.string('order_request_id', 36).notNullable().unique().references('order_requests.id');
    t.specificType('order_id', 'CHAR(36)').notNullable().references('orders.id'); t.bigInteger('amount_paise').notNullable();
    t.string('status', 30).notNullable().defaultTo('REQUESTED'); t.string('provider_reference', 150).nullable();
    t.text('failure_reason').nullable(); t.timestamp('created_at').defaultTo(k.fn.now()); t.timestamp('completed_at').nullable();
    t.index(['status', 'created_at']);
  });
  await k.schema.createTable('return_requests', t => {
    t.string('id', 36).primary().references('order_requests.id'); t.string('pickup_status', 30).notNullable().defaultTo('NOT_SCHEDULED');
    t.string('inspection_status', 30).notNullable().defaultTo('PENDING'); t.text('inspection_note').nullable();
  });
  await k.schema.createTable('exchange_requests', t => {
    t.string('id', 36).primary().references('order_requests.id'); t.string('order_item_id', 36).nullable().references('seller_order_items.id');
    t.string('requested_variant_id', 36).nullable().references('product_variants.id'); t.integer('quantity').notNullable().defaultTo(1);
    t.string('pickup_status', 30).notNullable().defaultTo('NOT_SCHEDULED'); t.string('replacement_status', 30).notNullable().defaultTo('PENDING');
  });
  await k.schema.createTable('notifications', t => {
    t.string('id', 36).primary(); t.specificType('user_id', 'CHAR(36)').notNullable().references('users.id').onDelete('CASCADE');
    t.string('event_type', 60).notNullable(); t.string('title', 180).notNullable(); t.text('message').notNullable();
    t.text('data').nullable(); t.boolean('is_read').notNullable().defaultTo(false); t.timestamp('read_at').nullable();
    t.string('email_status', 20).notNullable().defaultTo('SKIPPED'); t.string('sms_status', 20).notNullable().defaultTo('SKIPPED');
    t.string('push_status', 20).notNullable().defaultTo('SKIPPED'); t.integer('attempts').notNullable().defaultTo(0);
    t.timestamp('next_attempt_at').nullable(); t.timestamp('created_at').defaultTo(k.fn.now()); t.index(['user_id', 'is_read']);
  });
  await k.schema.createTable('notification_devices', t => {
    t.string('id', 36).primary(); t.specificType('user_id', 'CHAR(36)').notNullable().references('users.id').onDelete('CASCADE');
    t.string('provider', 30).notNullable(); t.string('token', 500).notNullable().unique(); t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.createTable('platform_offers', t => {
    t.string('id', 36).primary(); t.string('name', 180).notNullable(); t.string('code', 50).nullable().unique();
    t.string('offer_type', 20).notNullable(); t.decimal('discount_value', 10, 2).notNullable(); t.decimal('min_order_value', 10, 2).notNullable().defaultTo(0);
    t.decimal('max_discount', 10, 2).nullable(); t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('start_date').nullable(); t.timestamp('end_date').nullable(); t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.alterTable('orders', t => t.decimal('platform_discount', 10, 2).notNullable().defaultTo(0));
  await k.schema.alterTable('products', t => { t.string('moderation_status', 20).notNullable().defaultTo('APPROVED'); t.text('moderation_note').nullable(); });
}

export async function down(k: Knex): Promise<void> {
  await k.schema.alterTable('products', t => t.dropColumns('moderation_status', 'moderation_note'));
  await k.schema.alterTable('orders', t => t.dropColumn('platform_discount'));
  for (const table of ['platform_offers','notification_devices','notifications','exchange_requests','return_requests','refunds','payout_approvals','payouts','settlements']) await k.schema.dropTableIfExists(table);
  await k.schema.alterTable('delivery_tasks', t => t.dropColumns('distance_km', 'multi_seller_bonus_paise'));
  for (const table of ['delivery_earning_rules','ledger_entries','financial_transactions','financial_accounts']) await k.schema.dropTableIfExists(table);
}
