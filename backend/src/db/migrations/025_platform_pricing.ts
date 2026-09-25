import { Knex } from 'knex';
export async function up(k: Knex): Promise<void> {
  await k.schema.createTable('platform_settings', t => { t.string('key', 100).primary(); t.decimal('value', 12, 4).notNullable(); });
  await k('platform_settings').insert([
    { key: 'delivery_base_paise', value: 4000 }, { key: 'delivery_per_km_paise', value: 1000 }, { key: 'delivery_free_km', value: 2 },
    { key: 'partner_base_paise', value: 3000 }, { key: 'partner_per_km_paise', value: 800 }, { key: 'matching_radius_km', value: 5 },
    { key: 'tax_basis_points', value: 0 }, { key: 'platform_fee_paise', value: 0 },
  ]);
  await k.schema.alterTable('orders', t => { t.decimal('tax_amount', 10, 2).notNullable().defaultTo(0); t.decimal('platform_fee', 10, 2).notNullable().defaultTo(0); });
}
export async function down(k: Knex): Promise<void> {
  await k.schema.alterTable('orders', t => t.dropColumns('tax_amount', 'platform_fee')); await k.schema.dropTable('platform_settings');
}
