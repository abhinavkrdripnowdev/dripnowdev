import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. carts
  await knex.schema.createTable('carts', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('user_id', 'CHAR(36)').notNullable().unique();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
  });

  // 2. cart_items
  await knex.schema.createTable('cart_items', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('cart_id', 'CHAR(36)').notNullable();
    table.specificType('product_id', 'CHAR(36)').notNullable();
    table.specificType('variant_id', 'CHAR(36)').nullable();
    table.specificType('seller_id', 'CHAR(36)').notNullable(); // Important for multi-seller checkout
    table.integer('quantity').notNullable().defaultTo(1);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('cart_id').references('carts.id').onDelete('CASCADE');
    table.foreign('product_id').references('products.id');
    table.foreign('seller_id').references('seller_profiles.id');
    table.index(['cart_id'], 'idx_cart_items_cart_id');
  });

  // 3. orders (Parent Order)
  await knex.schema.createTable('orders', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('customer_id', 'CHAR(36)').notNullable();
    table.specificType('address_id', 'CHAR(36)').notNullable();
    table.decimal('total_amount', 10, 2).notNullable().defaultTo(0.00);
    table.decimal('delivery_fee', 10, 2).notNullable().defaultTo(0.00);
    table.decimal('discount_amount', 10, 2).notNullable().defaultTo(0.00);
    table.decimal('final_amount', 10, 2).notNullable().defaultTo(0.00);
    table.string('payment_method', 50).notNullable(); // e.g., 'cod', 'card', 'upi'
    table.string('payment_status', 50).notNullable().defaultTo('pending'); // 'pending', 'paid', 'failed'
    table.string('status', 50).notNullable().defaultTo('ORDER_CREATED');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('customer_id').references('users.id');
    table.foreign('address_id').references('addresses.id');
    table.index(['customer_id'], 'idx_orders_customer_id');
  });

  // Alter seller_orders table to add missing statuses or fields if needed
  // Since we already have seller_orders, we will just use string statuses 
  // or handle the lifecycle in the application layer.
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('cart_items');
  await knex.schema.dropTableIfExists('carts');
}
