import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. categories
  await knex.schema.createTable('categories', (table) => {
    table.increments('id').unsigned().primary();
    table.integer('parent_id').unsigned().nullable();
    table.string('name', 150).notNullable();
    table.string('slug', 150).notNullable().unique();
    table.text('description').nullable();
    table.text('image_url').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('parent_id').references('categories.id').onDelete('SET NULL');
    table.index(['parent_id'], 'idx_categories_parent_id');
  });

  // 2. products
  await knex.schema.createTable('products', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('seller_id', 'CHAR(36)').notNullable();
    table.integer('category_id').unsigned().notNullable();
    table.string('name', 255).notNullable();
    table.string('slug', 255).notNullable();
    table.text('description').nullable();
    table.decimal('base_price', 10, 2).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table
      .enu('availability_status', ['in_stock', 'out_of_stock', 'discontinued'], {
        useNative: true,
        enumName: 'product_availability_enum',
      })
      .notNullable()
      .defaultTo('in_stock');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('seller_id').references('seller_profiles.id').onDelete('CASCADE');
    table.foreign('category_id').references('categories.id');
    table.index(['seller_id'], 'idx_products_seller_id');
    table.index(['category_id'], 'idx_products_category_id');
    table.index(['is_active'], 'idx_products_is_active');
  });

  // 3. product_variants
  await knex.schema.createTable('product_variants', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('product_id', 'CHAR(36)').notNullable();
    table.string('sku', 100).notNullable().unique();
    table.string('size', 50).nullable();
    table.string('color', 50).nullable();
    table.decimal('price_override', 10, 2).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('product_id').references('products.id').onDelete('CASCADE');
    table.index(['product_id'], 'idx_variants_product_id');
    table.index(['sku'], 'idx_variants_sku');
  });

  // 4. product_images
  await knex.schema.createTable('product_images', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('product_id', 'CHAR(36)').notNullable();
    table.specificType('variant_id', 'CHAR(36)').nullable();
    table.text('image_url').notNullable();
    table.boolean('is_primary').notNullable().defaultTo(false);
    table.integer('display_order').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('product_id').references('products.id').onDelete('CASCADE');
    table.foreign('variant_id').references('product_variants.id').onDelete('CASCADE');
    table.index(['product_id'], 'idx_product_images_product_id');
    table.index(['variant_id'], 'idx_product_images_variant_id');
  });

  // 5. inventory
  await knex.schema.createTable('inventory', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('variant_id', 'CHAR(36)').notNullable().unique();
    table.integer('quantity').notNullable().defaultTo(0);
    table.integer('reserved_quantity').notNullable().defaultTo(0);
    table.integer('low_stock_threshold').notNullable().defaultTo(5);
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('variant_id').references('product_variants.id').onDelete('CASCADE');
    table.index(['variant_id'], 'idx_inventory_variant_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('inventory');
  await knex.schema.dropTableIfExists('product_images');
  await knex.schema.dropTableIfExists('product_variants');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('categories');
}
