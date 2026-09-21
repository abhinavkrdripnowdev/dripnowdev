import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token (hex string)
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a cryptographically secure numeric OTP
 */
export function generateOtp(digits = 6): string {
  const max = Math.pow(10, digits);
  const min = Math.pow(10, digits - 1);
  const range = max - min;
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  return String(min + (randomNumber % range));
}

/**
 * Hash a token using SHA-256 (for storage, not password use)
 */
export function sha256Hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
