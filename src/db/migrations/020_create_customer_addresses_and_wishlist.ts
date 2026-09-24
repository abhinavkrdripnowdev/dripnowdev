import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. addresses
  await knex.schema.createTable('addresses', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('user_id', 'CHAR(36)').notNullable();
    table.string('address_line1', 255).notNullable();
    table.string('address_line2', 255).nullable();
    table.string('landmark', 255).nullable();
    table.string('city', 100).notNullable();
    table.string('state', 100).notNullable();
    table.string('postal_code', 20).notNullable();
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
    table
      .enu('type', ['home', 'work', 'other'], {
        useNative: true,
        enumName: 'address_type_enum',
      })
      .notNullable()
      .defaultTo('home');
    table.boolean('is_default').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index(['user_id'], 'idx_addresses_user_id');
  });

  // 2. wishlists
  await knex.schema.createTable('wishlists', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('user_id', 'CHAR(36)').notNullable();
    table.specificType('product_id', 'CHAR(36)').notNullable();
    table.specificType('variant_id', 'CHAR(36)').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('product_id').references('products.id').onDelete('CASCADE');
    table.foreign('variant_id').references('product_variants.id').onDelete('CASCADE');
    table.index(['user_id'], 'idx_wishlists_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('wishlists');
  await knex.schema.dropTableIfExists('addresses');
}
