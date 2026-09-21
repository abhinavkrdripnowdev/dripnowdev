import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('onboarding_applications', (table) => {
    table.increments('id').unsigned().primary();
    table.specificType('user_id', 'CHAR(36)').notNullable();
    table
      .enu('role_applied', ['seller', 'delivery_partner'], {
        useNative: true,
        enumName: 'onboarding_role_enum',
      })
      .notNullable();
    table
      .enu('status', ['pending', 'under_review', 'approved', 'rejected'], {
        useNative: true,
        enumName: 'onboarding_status_enum',
      })
      .notNullable()
      .defaultTo('pending');
    table.string('business_name', 255).nullable();
    table.string('business_type', 100).nullable();
    table.text('address').nullable();
    table.specificType('documents_json', 'JSON').nullable().comment('Array of document URLs and metadata');
    table.string('rejection_reason', 500).nullable();
    table.specificType('reviewed_by', 'CHAR(36)').nullable().comment('Manager or admin UUID');
    table.timestamp('reviewed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id');
    table.index(['status'], 'idx_onboarding_status');
    table.index(['user_id'], 'idx_onboarding_user_id');
    table.index(['role_applied'], 'idx_onboarding_role');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('onboarding_applications');
}
