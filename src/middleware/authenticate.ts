import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service';
import { sendUnauthorized } from '../utils/response';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendUnauthorized(res, 'Access token required');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, roles: payload.roles, sessionId: payload.sessionId };
    next();
  } catch {
    sendUnauthorized(res, 'Invalid or expired access token');
  }
}
