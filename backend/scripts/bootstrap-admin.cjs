// Operator-only bootstrap: promote an existing verified account. Never exposes an HTTP registration endpoint.
const { db } = require('../dist/config/database');
(async () => {
  const emails = (process.env.BOOTSTRAP_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  if (emails.length !== 2 || new Set(emails).size !== 2) throw new Error('Set BOOTSTRAP_ADMIN_EMAILS to two distinct verified accounts, separated by a comma');
  await db.transaction(async trx => {
    await trx('roles').where({ id: 5 }).forUpdate().first();
    if (await trx('user_roles').whereIn('role_id', [4, 5]).first()) throw new Error('Bootstrap is disabled once an admin exists. Use the two-admin approval workflow.');
    for (const [index, email] of emails.entries()) {
      const user = await trx('users').where({ email, status: 'active', email_verified: true, phone_verified: true }).first();
      if (!user) throw new Error('Verified active account not found');
      await trx('user_roles').insert({ user_id: user.id, role_id: index === 0 ? 5 : 4 });
      await trx('audit_logs').insert({ user_id: user.id, action: 'OPERATOR_BOOTSTRAP_ADMIN' });
      await trx('sessions').where({ user_id: user.id }).update({ revoked: true });
    }
  });
  console.log('Initial super admin promoted. Sign in again.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.destroy());
