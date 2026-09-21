import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_roles', (table) => {
    table.specificType('user_id', 'CHAR(36)').notNullable();
    table.specificType('role_id', 'TINYINT UNSIGNED').notNullable();
    table.specificType('granted_by', 'CHAR(36)').nullable().comment('NULL = self-registration, else admin UUID');
    table.timestamp('granted_at').defaultTo(knex.fn.now());

    table.primary(['user_id', 'role_id']);
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('role_id').references('roles.id');
    table.index(['user_id'], 'idx_user_roles_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_roles');
}
