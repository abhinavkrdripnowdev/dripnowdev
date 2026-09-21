import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const clientName = knex.client.config.client as string;
  const isSqlite = clientName.includes('sqlite');

  if (isSqlite) {
    // Drop existing table & recreate with nullable user_id, phone, email & email_otp enum
    await knex.schema.dropTableIfExists('verification_tokens');
    await knex.schema.createTable('verification_tokens', (table) => {
      table.increments('id').unsigned().primary();
      table.specificType('user_id', 'CHAR(36)').nullable();
      table.string('phone', 32).nullable();
      table.string('email', 320).nullable();
      table
        .enu('type', ['phone_otp', 'email_otp', 'email_token'], {
          useNative: true,
          enumName: 'verification_type_enum',
        })
        .notNullable();
      table.string('token', 512).notNullable().comment('Hashed OTP or email verification token');
      table.timestamp('expires_at').notNullable();
      table.boolean('used').notNullable().defaultTo(false);
      table.specificType('attempt_count', 'TINYINT UNSIGNED').notNullable().defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('user_id').references('users.id').onDelete('CASCADE');
      table.index(['user_id', 'type'], 'idx_verification_tokens_user_type');
      table.index(['phone', 'type'], 'idx_verification_tokens_phone_type');
      table.index(['email', 'type'], 'idx_verification_tokens_email_type');
      table.index(['expires_at'], 'idx_verification_tokens_expires');
    });
  } else {
    // MySQL / PostgreSQL alter table
    await knex.schema.alterTable('verification_tokens', (table) => {
      table.specificType('user_id', 'CHAR(36)').nullable().alter();
      table.string('phone', 32).nullable();
      table.string('email', 320).nullable();
    });
    await knex.raw("ALTER TABLE verification_tokens MODIFY COLUMN type ENUM('phone_otp', 'email_otp', 'email_token') NOT NULL;");
  }
}

export async function down(knex: Knex): Promise<void> {
  // No rollback needed
}
