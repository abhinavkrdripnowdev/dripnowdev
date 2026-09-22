import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create permissions table
  await knex.schema.createTable('permissions', (table) => {
    table.increments('id').unsigned().primary();
    table.string('name', 100).notNullable().unique();
    table.string('description', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 2. Create role_permissions junction table
  await knex.schema.createTable('role_permissions', (table) => {
    table.specificType('role_id', 'TINYINT UNSIGNED').notNullable();
    table.integer('permission_id').unsigned().notNullable();

    table.primary(['role_id', 'permission_id']);
    table.foreign('role_id').references('roles.id').onDelete('CASCADE');
    table.foreign('permission_id').references('permissions.id').onDelete('CASCADE');
  });

  // 3. Create security_events table
  await knex.schema.createTable('security_events', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.specificType('user_id', 'CHAR(36)').nullable().comment('NULL for unauthenticated or system security events');
    table.string('event_type', 100).notNullable().comment('e.g. admin_registration_attempt, brute_force_detected, account_locked');
    table.enu('severity', ['info', 'warning', 'critical']).notNullable().defaultTo('info');
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.specificType('details', 'JSON').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id'], 'idx_security_events_user_id');
    table.index(['event_type'], 'idx_security_events_type');
    table.index(['severity'], 'idx_security_events_severity');
    table.index(['created_at'], 'idx_security_events_created_at');
  });

  // 4. Seed default permissions
  const permissions = [
    { id: 1, name: 'browse:products', description: 'Browse product catalog and view details' },
    { id: 2, name: 'place:orders', description: 'Manage cart and place customer orders' },
    { id: 3, name: 'seller:manage_products', description: 'Create and manage seller product catalog and inventory' },
    { id: 4, name: 'seller:manage_orders', description: 'View, accept, and prepare seller order items' },
    { id: 5, name: 'delivery:accept_tasks', description: 'Accept and complete delivery tasks' },
    { id: 6, name: 'admin:manage_users', description: 'Admin management of platform users and accounts' },
    { id: 7, name: 'admin:approve_onboarding', description: 'Review and approve seller and delivery onboarding applications' },
    { id: 8, name: 'super_admin:financial_payouts', description: 'Execute seller settlements and delivery partner payouts' },
  ];

  await knex('permissions').insert(permissions);

  // 5. Seed default role permissions
  const rolePermissions = [
    // Customer (role_id 1)
    { role_id: 1, permission_id: 1 },
    { role_id: 1, permission_id: 2 },

    // Seller (role_id 2)
    { role_id: 2, permission_id: 1 },
    { role_id: 2, permission_id: 2 },
    { role_id: 2, permission_id: 3 },
    { role_id: 2, permission_id: 4 },

    // Delivery Partner (role_id 3)
    { role_id: 3, permission_id: 5 },

    // Admin / Manager (role_id 4)
    { role_id: 4, permission_id: 1 },
    { role_id: 4, permission_id: 3 },
    { role_id: 4, permission_id: 4 },
    { role_id: 4, permission_id: 6 },
    { role_id: 4, permission_id: 7 },

    // Super Admin (role_id 5) - All permissions
    { role_id: 5, permission_id: 1 },
    { role_id: 5, permission_id: 2 },
    { role_id: 5, permission_id: 3 },
    { role_id: 5, permission_id: 4 },
    { role_id: 5, permission_id: 5 },
    { role_id: 5, permission_id: 6 },
    { role_id: 5, permission_id: 7 },
    { role_id: 5, permission_id: 8 },
  ];

  await knex('role_permissions').insert(rolePermissions);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('security_events');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
}
