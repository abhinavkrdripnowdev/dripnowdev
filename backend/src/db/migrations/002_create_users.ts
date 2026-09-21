import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.specificType('id', 'CHAR(36)').primary().notNullable().comment('UUID v4');
    table.string('full_name', 255).notNullable();
    table.string('phone', 20).unique().nullable().comment('E.164 format e.g. +919876543210');
    table.boolean('phone_verified').notNullable().defaultTo(false);
    table.string('email', 320).unique().nullable();
    table.boolean('email_verified').notNullable().defaultTo(false);
    table.string('avatar_url', 500).nullable();
    table
      .enu('status', ['active', 'suspended', 'pending_verification'], {
        useNative: true,
        enumName: 'user_status_enum',
      })
      .notNullable()
      .defaultTo('pending_verification');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['phone'], 'idx_users_phone');
    table.index(['email'], 'idx_users_email');
    table.index(['status'], 'idx_users_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
