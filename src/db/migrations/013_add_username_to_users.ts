import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'username');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.string('username', 50).unique().nullable().comment('Unique User ID / Handle chosen by user during registration');
      table.index(['username'], 'idx_users_username');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'username');
  if (hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.dropIndex(['username'], 'idx_users_username');
      table.dropColumn('username');
    });
  }
}
