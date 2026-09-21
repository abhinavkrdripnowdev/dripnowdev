import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    table.specificType('id', 'TINYINT UNSIGNED').primary().notNullable();
    table.string('name', 50).notNullable().unique();
    table.string('display_name', 100).notNullable();
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Seed default roles immediately
  await knex('roles').insert([
    { id: 1, name: 'customer', display_name: 'Customer', description: 'Regular customer who can shop on the platform' },
    { id: 2, name: 'seller', display_name: 'Seller / Shopkeeper', description: 'Approved seller who can list products' },
    { id: 3, name: 'delivery_partner', display_name: 'Delivery Partner', description: 'Approved delivery partner' },
    { id: 4, name: 'manager', display_name: 'Onboarding & Operations Manager', description: 'Internal manager for onboarding and ops' },
    { id: 5, name: 'super_admin', display_name: 'Super Admin', description: 'Full platform access' },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('roles');
}
