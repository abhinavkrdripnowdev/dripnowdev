import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('google_identities', (table) => {
    table.increments('id').unsigned().primary();
    table.specificType('user_id', 'CHAR(36)').notNullable().unique();
    table.string('google_sub', 255).notNullable().unique().comment('Google subject ID from JWT');
    table.string('google_email', 320).notNullable();
    table.string('google_name', 255).nullable();
    table.string('google_picture', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index(['google_sub'], 'idx_google_identities_sub');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('google_identities');
}
