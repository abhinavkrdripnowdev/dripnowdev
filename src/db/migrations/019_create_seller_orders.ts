import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. seller_orders
  await knex.schema.createTable('seller_orders', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('parent_order_id', 'CHAR(36)').nullable();
    table.specificType('seller_id', 'CHAR(36)').notNullable();
    table.specificType('customer_id', 'CHAR(36)').notNullable();
    table.decimal('subtotal', 10, 2).notNullable().defaultTo(0.00);
    table.decimal('discount_amount', 10, 2).notNullable().defaultTo(0.00);
    table.decimal('total_amount', 10, 2).notNullable().defaultTo(0.00);
    table
      .enu('status', ['new', 'accepted', 'preparing', 'ready_for_pickup', 'cancelled', 'completed'], {
        useNative: true,
        enumName: 'seller_order_status_enum',
      })
      .notNullable()
      .defaultTo('new');
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('seller_id').references('seller_profiles.id').onDelete('CASCADE');
    table.foreign('customer_id').references('users.id');
    table.index(['seller_id'], 'idx_seller_orders_seller_id');
    table.index(['customer_id'], 'idx_seller_orders_customer_id');
    table.index(['status'], 'idx_seller_orders_status');
  });

  // 2. seller_order_items
  await knex.schema.createTable('seller_order_items', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('seller_order_id', 'CHAR(36)').notNullable();
    table.specificType('product_id', 'CHAR(36)').notNullable();
    table.specificType('variant_id', 'CHAR(36)').nullable();
    table.string('product_name', 255).notNullable();
    table.string('variant_info', 255).nullable();
    table.integer('quantity').notNullable();
    table.decimal('unit_price', 10, 2).notNullable();
    table.decimal('total_price', 10, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('seller_order_id').references('seller_orders.id').onDelete('CASCADE');
    table.foreign('product_id').references('products.id');
    table.foreign('variant_id').references('product_variants.id');
    table.index(['seller_order_id'], 'idx_seller_items_order_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('seller_order_items');
  await knex.schema.dropTableIfExists('seller_orders');
}
