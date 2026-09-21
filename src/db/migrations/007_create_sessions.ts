import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sessions', (table) => {
    table.increments('id').unsigned().primary();
    table.specificType('user_id', 'CHAR(36)').notNullable();
    table.string('refresh_token', 512).notNullable().unique().comment('Hashed refresh token');
    table.string('device_info', 255).nullable();
    table.string('ip_address', 45).nullable().comment('Supports IPv6');
    table.timestamp('expires_at').notNullable();
    table.boolean('revoked').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index(['user_id'], 'idx_sessions_user_id');
    table.index(['refresh_token'], 'idx_sessions_refresh_token');
    table.index(['expires_at'], 'idx_sessions_expires');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
}
