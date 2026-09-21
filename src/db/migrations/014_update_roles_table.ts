import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const rolesToEnsure = [
    { id: 1, name: 'customer', display_name: 'Customer', description: 'Regular customer shopping on the platform' },
    { id: 2, name: 'seller', display_name: 'Shopkeeper / Seller', description: 'Approved shopkeeper who lists products' },
    { id: 3, name: 'delivery_partner', display_name: 'Delivery Partner', description: 'Approved logistics delivery partner' },
    { id: 4, name: 'manager', display_name: 'Admin', description: 'Internal operations admin' },
    { id: 5, name: 'super_admin', display_name: 'Super Admin', description: 'Full system super admin' },
  ];

  for (const r of rolesToEnsure) {
    const existing = await knex('roles').where({ id: r.id }).first();
    if (!existing) {
      await knex('roles').insert(r);
    } else {
      await knex('roles').where({ id: r.id }).update({
        name: r.name,
        display_name: r.display_name,
        description: r.description,
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // No rollback needed
}
