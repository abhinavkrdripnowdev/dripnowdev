import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. seller_offers
  await knex.schema.createTable('seller_offers', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('seller_id', 'CHAR(36)').notNullable();
    table.string('title', 255).notNullable();
    table.string('code', 50).nullable();
    table
      .enu('offer_type', ['percentage', 'flat', 'special_price'], {
        useNative: true,
        enumName: 'seller_offer_type_enum',
      })
      .notNullable();
    table.decimal('discount_value', 10, 2).notNullable();
    table.decimal('min_order_value', 10, 2).notNullable().defaultTo(0.00);
    table.timestamp('start_date').nullable();
    table.timestamp('end_date').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('seller_id').references('seller_profiles.id').onDelete('CASCADE');
    table.index(['seller_id'], 'idx_seller_offers_seller_id');
    table.index(['code'], 'idx_seller_offers_code');
  });

  // 2. combo_offers
  await knex.schema.createTable('combo_offers', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('seller_id', 'CHAR(36)').notNullable();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.decimal('combo_price', 10, 2).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('seller_id').references('seller_profiles.id').onDelete('CASCADE');
    table.index(['seller_id'], 'idx_combo_offers_seller_id');
  });

  // 3. combo_offer_items
  await knex.schema.createTable('combo_offer_items', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('combo_offer_id', 'CHAR(36)').notNullable();
    table.specificType('product_id', 'CHAR(36)').notNullable();
    table.specificType('variant_id', 'CHAR(36)').nullable();

    table.foreign('combo_offer_id').references('combo_offers.id').onDelete('CASCADE');
    table.foreign('product_id').references('products.id').onDelete('CASCADE');
    table.foreign('variant_id').references('product_variants.id').onDelete('CASCADE');
    table.index(['combo_offer_id'], 'idx_combo_items_offer_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('combo_offer_items');
  await knex.schema.dropTableIfExists('combo_offers');
  await knex.schema.dropTableIfExists('seller_offers');
}
