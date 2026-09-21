import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.specificType('user_id', 'CHAR(36)').nullable().comment('NULL for anonymous/unauthenticated events');
    table.string('action', 100).notNullable().comment('e.g. login_success, otp_sent, password_reset_requested');
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.specificType('metadata', 'JSON').nullable().comment('Additional context (role, device, reason, etc.)');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id'], 'idx_audit_logs_user_id');
    table.index(['action'], 'idx_audit_logs_action');
    table.index(['created_at'], 'idx_audit_logs_created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
}
