import { createSecurityEvent } from '../services/security.service';
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service';
import { sendUnauthorized } from '../utils/response';
import { db } from '../config/database';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendUnauthorized(res, 'Access token required');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    const user = await db('users').where({ id: payload.sub }).first();
    const session = await db('sessions').where({ id: payload.sessionId ?? -1, user_id: payload.sub, revoked: false }).first();
    if (!user || user.status !== 'active' || ['REJECTED', 'SUSPENDED', 'BLOCKED'].includes(user.account_status) || !session || new Date(session.expires_at).getTime() <= Date.now()) {
      sendUnauthorized(res, 'Account or session is inactive'); return;
    }
    const roles = await db('user_roles').join('roles', 'roles.id', 'user_roles.role_id').where('user_roles.user_id', user.id).pluck('roles.name');
    req.user = { id: payload.sub, roles, sessionId: payload.sessionId };
    next();
  } catch {
    await createSecurityEvent({ eventType: 'invalid_token_attempt', ipAddress: req.ip, severity: 'warning' });
    sendUnauthorized(res, 'Invalid or expired access token');
  }
}
