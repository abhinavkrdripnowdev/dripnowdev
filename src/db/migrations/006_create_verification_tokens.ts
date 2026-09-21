import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('verification_tokens', (table) => {
    table.increments('id').unsigned().primary();
    table.specificType('user_id', 'CHAR(36)').notNullable();
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
    table.index(['expires_at'], 'idx_verification_tokens_expires');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('verification_tokens');
}
