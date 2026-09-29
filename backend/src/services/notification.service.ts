import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import { db } from '../config/database';
import axios from 'axios';
import { sendNotificationEmail } from './email.service';
import { sendSmsMessage } from '../integrations/sms/send';

export async function notify(userId: string, eventType: string, title: string, message: string, data?: unknown, trx: Knex.Transaction | typeof db = db) {
  const user = await trx('users').where({ id: userId }).first();
  if (!user) return;
  const hasDevice = Boolean(await trx('notification_devices').where({ user_id: userId }).first());
  await trx('notifications').insert({ id: randomUUID(), user_id: userId, event_type: eventType, title, message, data: data ? JSON.stringify(data) : null,
    email_status: user.email ? 'PENDING' : 'SKIPPED', sms_status: user.phone ? 'PENDING' : 'SKIPPED', push_status: hasDevice ? 'PENDING' : 'SKIPPED', next_attempt_at: new Date() });
}

export async function processNotificationOutbox(limit = 50) {
  const rows = await db('notifications as n').join('users as u', 'u.id', 'n.user_id').where('n.attempts', '<', 5).where('n.next_attempt_at', '<=', new Date())
    .where(q => q.where('n.email_status', 'PENDING').orWhere('n.sms_status', 'PENDING').orWhere('n.push_status', 'PENDING'))
    .select('n.*', 'u.email as recipient_email', 'u.phone as recipient_phone').limit(limit);
  for (const row of rows) {
    const update: Record<string, unknown> = { attempts: row.attempts + 1, next_attempt_at: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** row.attempts)) };
    try { if (row.email_status === 'PENDING' && row.recipient_email) { await sendNotificationEmail(row.recipient_email, row.title, row.message); update.email_status = 'SENT'; } } catch { update.email_status = row.attempts >= 4 ? 'FAILED' : 'PENDING'; }
    try { if (row.sms_status === 'PENDING' && row.recipient_phone) { await sendSmsMessage(row.recipient_phone, `${row.title}: ${row.message}`.slice(0, 500)); update.sms_status = 'SENT'; } } catch { update.sms_status = row.attempts >= 4 ? 'FAILED' : 'PENDING'; }
    if (row.push_status === 'PENDING') {
      const devices = await db('notification_devices').where({ user_id: row.user_id });
      const url = process.env.PUSH_API_URL, key = process.env.PUSH_API_KEY;
      if (!devices.length) update.push_status = 'SKIPPED';
      else if (!url || !key) update.push_status = row.attempts >= 4 ? 'FAILED' : 'PENDING';
      else try { await axios.post(url, { tokens: devices.map(d => d.token), title: row.title, message: row.message, data: row.data ? JSON.parse(row.data) : undefined }, { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 }); update.push_status = 'SENT'; } catch { update.push_status = row.attempts >= 4 ? 'FAILED' : 'PENDING'; }
    }
    await db('notifications').where({ id: row.id }).update(update);
  }
  return rows.length;
}
