import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('credentials', (table) => {
    table.increments('id').unsigned().primary();
    table.specificType('user_id', 'CHAR(36)').notNullable().unique();
    table.string('password_hash', 255).notNullable().comment('bcrypt cost factor 12');
    table.specificType('failed_attempts', 'TINYINT UNSIGNED').notNullable().defaultTo(0);
    table.timestamp('locked_until').nullable().comment('Account locked until this time after too many failures');
    table.timestamp('last_login_at').nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index(['user_id'], 'idx_credentials_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('credentials');
}
