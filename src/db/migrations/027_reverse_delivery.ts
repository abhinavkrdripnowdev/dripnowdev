import { Knex } from 'knex';
export async function up(k: Knex): Promise<void> {
  await k.schema.createTable('reverse_delivery_tasks', t => {
    t.string('id', 36).primary(); t.string('order_request_id', 36).notNullable().references('order_requests.id');
    t.string('seller_id', 36).notNullable().references('seller_profiles.id'); t.string('partner_id', 36).nullable().references('delivery_partner_profiles.id');
    t.string('kind', 30).notNullable(); t.string('status', 30).notNullable().defaultTo('AVAILABLE'); t.bigInteger('earning_paise').notNullable();
    t.decimal('distance_km', 10, 3).notNullable(); t.decimal('pickup_latitude', 10, 8).notNullable(); t.decimal('pickup_longitude', 11, 8).notNullable();
    t.decimal('drop_latitude', 10, 8).notNullable(); t.decimal('drop_longitude', 11, 8).notNullable();
    t.timestamp('delivered_at').nullable(); t.timestamp('created_at').defaultTo(k.fn.now());
    t.unique(['order_request_id', 'kind', 'seller_id']); t.index(['status', 'created_at']);
  });
}
export async function down(k: Knex): Promise<void> { await k.schema.dropTableIfExists('reverse_delivery_tasks'); }
