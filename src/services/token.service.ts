import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../config/database';
import { sha256Hash, generateSecureToken } from '../utils/crypto';

export interface AccessTokenPayload {
  sub: string;         // user UUID
  roles: string[];     // role names
  sessionId?: number;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: number;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'dripnow',
    audience: 'dripnow-client',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'dripnow',
    audience: 'dripnow-client',
  }) as AccessTokenPayload;
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'dripnow',
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'dripnow',
  }) as RefreshTokenPayload;
}

/**
 * Create a new session with refresh token in DB
 */
export async function createSession(
  userId: string,
  roles: string[],
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string; sessionId: number }> {
  const rawRefreshToken = generateSecureToken(48);
  const hashedRefreshToken = sha256Hash(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const [sessionId] = await db('sessions').insert({
    user_id: userId,
    refresh_token: hashedRefreshToken,
    device_info: deviceInfo ?? null,
    ip_address: ipAddress ?? null,
    expires_at: expiresAt,
    revoked: false,
  });

  const accessToken = signAccessToken({ sub: userId, roles, sessionId });
  const refreshToken = signRefreshToken({ sub: userId, sessionId });

  return { accessToken, refreshToken: rawRefreshToken, sessionId };
}

/**
 * Rotate refresh token — invalidate old, create new
 */
export async function rotateRefreshToken(
  rawOldToken: string,
  userId: string,
  roles: string[],
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string; sessionId: number }> {
  const hashedOld = sha256Hash(rawOldToken);

  const session = await db('sessions')
    .where({ refresh_token: hashedOld, user_id: userId, revoked: false })
    .first();

  if (!session || new Date(session.expires_at) < new Date()) {
    throw new Error('Invalid or expired refresh token');
  }

  // Revoke old session
  await db('sessions').where({ id: session.id }).update({ revoked: true });

  // Create new session
  return createSession(userId, roles, session.device_info, ipAddress);
}

/**
 * Revoke all sessions for a user (logout all devices)
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db('sessions').where({ user_id: userId }).update({ revoked: true });
}

/**
 * Revoke a single session
 */
export async function revokeSession(sessionId: number): Promise<void> {
  await db('sessions').where({ id: sessionId }).update({ revoked: true });
}
