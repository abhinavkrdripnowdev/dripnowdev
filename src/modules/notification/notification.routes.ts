import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '../../config/database';
import { authenticate } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/response';

const router = Router(); router.use(authenticate);
router.get('/', async (req, res) => sendSuccess(res, await db('notifications').where({ user_id: req.user!.id }).orderBy('created_at', 'desc').limit(100)));
router.patch('/:id/read', async (req, res) => { await db('notifications').where({ id: String(req.params.id), user_id: req.user!.id }).update({ is_read: true, read_at: new Date() }); sendSuccess(res, null); });
router.post('/devices', async (req, res) => { const data = z.object({ provider: z.enum(['fcm', 'apns', 'webpush']), token: z.string().min(20).max(500) }).strict().parse(req.body); await db('notification_devices').insert({ id: randomUUID(), user_id: req.user!.id, ...data }).onConflict('token').merge({ user_id: req.user!.id, provider: data.provider }); sendSuccess(res, null); });
router.delete('/devices/:token', async (req, res) => { await db('notification_devices').where({ user_id: req.user!.id, token: String(req.params.token) }).delete(); sendSuccess(res, null); });
export default router;
