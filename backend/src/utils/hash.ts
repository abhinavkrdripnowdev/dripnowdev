import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  if (Buffer.byteLength(password, 'utf8') > 72) throw Object.assign(new Error('Password must be at most 72 UTF-8 bytes'), { statusCode: 422 });
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (Buffer.byteLength(password, 'utf8') > 72) return false;
  return bcrypt.compare(password, hash);
}

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

export async function compareToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
