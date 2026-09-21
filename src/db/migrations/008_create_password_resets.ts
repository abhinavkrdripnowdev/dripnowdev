import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('password_resets', (table) => {
    table.increments('id').unsigned().primary();
    table.specificType('user_id', 'CHAR(36)').notNullable();
    table.string('token', 512).notNullable().unique().comment('Hashed 32-byte secure random token');
    table.timestamp('expires_at').notNullable().comment('15 minutes from creation');
    table.boolean('used').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index(['user_id'], 'idx_password_resets_user_id');
    table.index(['token'], 'idx_password_resets_token');
    table.index(['expires_at'], 'idx_password_resets_expires');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_resets');
}
