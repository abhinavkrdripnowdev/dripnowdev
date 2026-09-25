import { Knex } from 'knex';
export async function up(k: Knex): Promise<void> {
  await k('roles').where({ id: 4 }).update({ name: 'admin', display_name: 'Admin' });
  await k.schema.createTable('admin_creation_requests', t => {
    t.string('id', 36).primary(); t.specificType('target_user_id', 'CHAR(36)').notNullable().references('users.id');
    t.specificType('requested_by', 'CHAR(36)').notNullable().references('users.id');
    t.string('status', 20).notNullable().defaultTo('PENDING'); t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.createTable('admin_creation_approvals', t => {
    t.string('request_id', 36).notNullable().references('admin_creation_requests.id');
    t.specificType('admin_id', 'CHAR(36)').notNullable().references('users.id');
    t.primary(['request_id', 'admin_id']); t.timestamp('created_at').defaultTo(k.fn.now());
  });
  await k.schema.createTable('order_requests', t => {
    t.string('id', 36).primary(); t.specificType('order_id', 'CHAR(36)').notNullable().references('orders.id');
    t.string('kind', 20).notNullable(); t.text('reason').notNullable(); t.string('status', 30).defaultTo('REQUESTED');
    t.text('review_note').nullable(); t.string('refund_id', 100).nullable(); t.timestamp('created_at').defaultTo(k.fn.now());
  });
  // Compatibility views expose the requested names without duplicating source data.
  await k.schema.createView('refresh_tokens', v => v.as(k('sessions').select('*')));
  await k.schema.createView('order_items', v => v.as(k('seller_order_items').select('*')));
}
export async function down(k: Knex): Promise<void> {
  await k.schema.dropViewIfExists('order_items'); await k.schema.dropViewIfExists('refresh_tokens');
  await k.schema.dropTable('order_requests'); await k.schema.dropTable('admin_creation_approvals'); await k.schema.dropTable('admin_creation_requests');
  await k('roles').where({ id: 4 }).update({ name: 'manager' });
}
