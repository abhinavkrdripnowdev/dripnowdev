import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. seller_profiles
  await knex.schema.createTable('seller_profiles', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('user_id', 'CHAR(36)').notNullable().unique();
    table.string('business_name', 255).notNullable();
    table.string('business_type', 100).nullable();
    table.string('gstin', 50).nullable();
    table.string('pan', 50).nullable();
    table.string('bank_account_number', 100).nullable();
    table.string('bank_ifsc', 50).nullable();
    table.string('bank_name', 100).nullable();
    table
      .enu('status', ['pending', 'under_review', 'approved', 'rejected'], {
        useNative: true,
        enumName: 'seller_status_enum',
      })
      .notNullable()
      .defaultTo('pending');
    table.text('rejection_reason').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index(['user_id'], 'idx_seller_profiles_user_id');
    table.index(['status'], 'idx_seller_profiles_status');
  });

  // 2. seller_documents
  await knex.schema.createTable('seller_documents', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('seller_id', 'CHAR(36)').notNullable();
    table
      .enu('document_type', ['gst_certificate', 'pan_card', 'fssai', 'cancelled_cheque', 'other'], {
        useNative: true,
        enumName: 'seller_doc_type_enum',
      })
      .notNullable();
    table.text('document_url').notNullable();
    table
      .enu('status', ['pending', 'verified', 'rejected'], {
        useNative: true,
        enumName: 'seller_doc_status_enum',
      })
      .notNullable()
      .defaultTo('pending');
    table.string('rejection_reason', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('seller_id').references('seller_profiles.id').onDelete('CASCADE');
    table.index(['seller_id'], 'idx_seller_docs_seller_id');
  });

  // 3. seller_locations
  await knex.schema.createTable('seller_locations', (table) => {
    table.specificType('id', 'CHAR(36)').primary();
    table.specificType('seller_id', 'CHAR(36)').notNullable();
    table.string('address_line1', 255).notNullable();
    table.string('address_line2', 255).nullable();
    table.string('city', 100).notNullable();
    table.string('state', 100).notNullable();
    table.string('postal_code', 20).notNullable();
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('seller_id').references('seller_profiles.id').onDelete('CASCADE');
    table.index(['seller_id'], 'idx_seller_locations_seller_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('seller_locations');
  await knex.schema.dropTableIfExists('seller_documents');
  await knex.schema.dropTableIfExists('seller_profiles');
}
