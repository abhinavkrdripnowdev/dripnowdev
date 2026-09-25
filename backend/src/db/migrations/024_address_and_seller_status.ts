import { Knex } from 'knex';
export async function up(k: Knex): Promise<void> {
  await k.schema.alterTable('addresses', t => t.timestamp('deleted_at').nullable());
  await k.schema.alterTable('seller_profiles', t => t.string('status', 30).notNullable().defaultTo('pending').alter());
  await k.schema.alterTable('seller_locations', t => {
    t.boolean('active').notNullable().defaultTo(true);
    t.specificType('address_id', 'CHAR(36)').nullable().references('addresses.id');
  });
}
export async function down(k: Knex): Promise<void> {
  await k.schema.alterTable('seller_locations', t => { t.dropForeign('address_id'); t.dropColumns('active', 'address_id'); });
  await k.schema.alterTable('addresses', t => t.dropColumn('deleted_at'));
}
