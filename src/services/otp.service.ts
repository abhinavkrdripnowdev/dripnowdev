import { db } from '../config/database';
import { env } from '../config/env';
import { generateOtp, sha256Hash } from '../utils/crypto';
import { sendEmailOtpCode, sendPasswordResetOtpEmail } from './email.service';

const OTP_EXPIRES_MINUTES = Number(env.OTP_EXPIRES_IN_MINUTES);
const OTP_MAX_ATTEMPTS = Number(env.OTP_MAX_ATTEMPTS);
const RESET_TOKEN_EXPIRES_MINUTES = Number(env.RESET_TOKEN_EXPIRES_IN_MINUTES);

/**
 * Generate and store a phone OTP for a user (replaces previous unused ones)
 */
export async function sendPhoneOtp(userId: string, phone: string): Promise<string> {
  // Invalidate any existing unused OTPs for this user
  await db('verification_tokens')
    .where({ user_id: userId, type: 'phone_otp', used: false })
    .update({ used: true });

  const otp = generateOtp(6);
  const hashedOtp = sha256Hash(otp);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRES_MINUTES);

  await db('verification_tokens').insert({
    user_id: userId,
    type: 'phone_otp',
    token: hashedOtp,
    expires_at: expiresAt,
    used: false,
    attempt_count: 0,
  });

  // Dispatch OTP via SMS provider
  await dispatchSms(phone, otp);

  return otp; // Only returned in development for testing
}

/**
 * Verify a phone OTP for a user
 */
export async function verifyPhoneOtp(
  userId: string,
  submittedOtp: string
): Promise<{ valid: boolean; reason?: string }> {
  const record = await db('verification_tokens')
    .where({ user_id: userId, type: 'phone_otp', used: false })
    .orderBy('created_at', 'desc')
    .first();

  if (!record) {
    return { valid: false, reason: 'No active OTP found. Please request a new one.' };
  }

  if (new Date(record.expires_at) < new Date()) {
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }

  if (record.attempt_count >= OTP_MAX_ATTEMPTS) {
    return { valid: false, reason: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  const hashedSubmitted = sha256Hash(submittedOtp);

  if (hashedSubmitted !== record.token) {
    await db('verification_tokens')
      .where({ id: record.id })
      .increment('attempt_count', 1);
    return { valid: false, reason: 'Incorrect OTP.' };
  }

  // Mark as used
  await db('verification_tokens').where({ id: record.id }).update({ used: true });
  // Mark phone as verified
  await db('users').where({ id: userId }).update({ phone_verified: true });

  return { valid: true };
}

/**
 * Generate and store an email OTP for a user
 */
export async function sendEmailOtp(userId: string, email: string, name: string): Promise<string> {
  // Invalidate any existing unused email OTPs for this user
  await db('verification_tokens')
    .where({ user_id: userId, type: 'email_otp', used: false })
    .update({ used: true });

  const otp = generateOtp(6);
  const hashedOtp = sha256Hash(otp);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRES_MINUTES);

  await db('verification_tokens').insert({
    user_id: userId,
    type: 'email_otp',
    token: hashedOtp,
    expires_at: expiresAt,
    used: false,
    attempt_count: 0,
  });

  if (env.NODE_ENV === 'development') {
    console.log(`\n📧 [EMAIL OTP MOCK] Email: ${email} → OTP: ${otp}\n`);
  }

  await sendEmailOtpCode(email, name, otp);

  return otp;
}

/**
 * Verify an email OTP for a user
 */
export async function verifyEmailOtp(
  userId: string,
  submittedOtp: string
): Promise<{ valid: boolean; reason?: string }> {
  const record = await db('verification_tokens')
    .where({ user_id: userId, type: 'email_otp', used: false })
    .orderBy('created_at', 'desc')
    .first();

  if (!record) {
    return { valid: false, reason: 'No active email OTP found. Please request a new one.' };
  }

  if (new Date(record.expires_at) < new Date()) {
    return { valid: false, reason: 'Email OTP has expired. Please request a new one.' };
  }

  if (record.attempt_count >= OTP_MAX_ATTEMPTS) {
    return { valid: false, reason: 'Too many incorrect attempts for email OTP. Please request a new OTP.' };
  }

  const hashedSubmitted = sha256Hash(submittedOtp);

  if (hashedSubmitted !== record.token) {
    await db('verification_tokens')
      .where({ id: record.id })
      .increment('attempt_count', 1);
    return { valid: false, reason: 'Incorrect email OTP.' };
  }

  // Mark as used
  await db('verification_tokens').where({ id: record.id }).update({ used: true });
  // Mark email as verified
  await db('users').where({ id: userId }).update({ email_verified: true });

  return { valid: true };
}

/**
 * Pre-registration Phone OTP sending & verification helpers
 */
export async function sendPreRegPhoneOtp(phone: string): Promise<string> {
  const existing = await db('users').where({ phone }).first();
  if (existing) {
    throw Object.assign(new Error('Phone number is already registered'), { statusCode: 409 });
  }

  await db('verification_tokens')
    .where({ phone, type: 'phone_otp', used: false })
    .update({ used: true });

  const otp = generateOtp(6);
  const hashedOtp = sha256Hash(otp);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRES_MINUTES);

  await db('verification_tokens').insert({
    user_id: null,
    phone,
    email: null,
    type: 'phone_otp',
    token: hashedOtp,
    expires_at: expiresAt,
    used: false,
    attempt_count: 0,
  });

  await dispatchSms(phone, otp);

  return otp;
}

export async function verifyPreRegPhoneOtp(
  phone: string,
  submittedOtp: string
): Promise<{ valid: boolean; reason?: string; verificationToken?: string }> {
  const record = await db('verification_tokens')
    .where({ phone, type: 'phone_otp', used: false })
    .orderBy('created_at', 'desc')
    .first();

  if (!record) {
    return { valid: false, reason: 'No active OTP found. Please request a new code.' };
  }

  if (new Date(record.expires_at) < new Date()) {
    return { valid: false, reason: 'OTP has expired. Please request a new code.' };
  }

  if (record.attempt_count >= OTP_MAX_ATTEMPTS) {
    return { valid: false, reason: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (sha256Hash(submittedOtp) !== record.token) {
    await db('verification_tokens').where({ id: record.id }).increment('attempt_count', 1);
    return { valid: false, reason: 'Incorrect OTP.' };
  }

  await db('verification_tokens').where({ id: record.id }).update({ used: true });
  const verificationToken = generateVerificationProof(phone);

  return { valid: true, verificationToken };
}

/**
 * Pre-registration Email OTP sending & verification helpers
 */
export async function sendPreRegEmailOtp(email: string): Promise<string> {
  const existing = await db('users').where({ email }).first();
  if (existing) {
    throw Object.assign(new Error('Email address is already registered'), { statusCode: 409 });
  }

  await db('verification_tokens')
    .where({ email, type: 'email_otp', used: false })
    .update({ used: true });

  const otp = generateOtp(6);
  const hashedOtp = sha256Hash(otp);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRES_MINUTES);

  await db('verification_tokens').insert({
    user_id: null,
    phone: null,
    email,
    type: 'email_otp',
    token: hashedOtp,
    expires_at: expiresAt,
    used: false,
    attempt_count: 0,
  });

  if (env.NODE_ENV === 'development') {
    console.log(`\n📧 [EMAIL OTP MOCK] Email: ${email} → OTP: ${otp}\n`);
  }

  await sendEmailOtpCode(email, 'User', otp);

  return otp;
}

export async function verifyPreRegEmailOtp(
  email: string,
  submittedOtp: string
): Promise<{ valid: boolean; reason?: string; verificationToken?: string }> {
  const record = await db('verification_tokens')
    .where({ email, type: 'email_otp', used: false })
    .orderBy('created_at', 'desc')
    .first();

  if (!record) {
    return { valid: false, reason: 'No active OTP found. Please request a new code.' };
  }

  if (new Date(record.expires_at) < new Date()) {
    return { valid: false, reason: 'OTP has expired. Please request a new code.' };
  }

  if (record.attempt_count >= OTP_MAX_ATTEMPTS) {
    return { valid: false, reason: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (sha256Hash(submittedOtp) !== record.token) {
    await db('verification_tokens').where({ id: record.id }).increment('attempt_count', 1);
    return { valid: false, reason: 'Incorrect OTP.' };
  }

  await db('verification_tokens').where({ id: record.id }).update({ used: true });
  const verificationToken = generateVerificationProof(email);

  return { valid: true, verificationToken };
}

export function generateVerificationProof(identifier: string): string {
  return sha256Hash(`verified:${identifier}:${env.JWT_ACCESS_SECRET}`);
}

export function verifyProofToken(identifier: string, token: string): boolean {
  return token === generateVerificationProof(identifier);
}

/**
 * Password Reset OTP sending & verification helpers
 */
export async function sendPasswordResetOtp(email: string): Promise<void> {
  const user = await db('users').where({ email }).first();
  // Silent return if user not found (security: anti-enumeration)
  if (!user) return;

  await db('verification_tokens')
    .where({ user_id: user.id, type: 'password_reset_otp', used: false })
    .update({ used: true });

  const otp = generateOtp(6);
  const hashedOtp = sha256Hash(otp);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_EXPIRES_MINUTES);

  await db('verification_tokens').insert({
    user_id: user.id,
    phone: null,
    email: user.email,
    type: 'password_reset_otp',
    token: hashedOtp,
    expires_at: expiresAt,
    used: false,
    attempt_count: 0,
  });

  if (env.NODE_ENV === 'development') {
    console.log(`\n🔑 [PASSWORD RESET OTP MOCK] Email: ${email} → OTP: ${otp}\n`);
  }

  await sendPasswordResetOtpEmail(user.email, user.full_name, otp);
}

export async function verifyPasswordResetOtp(
  email: string,
  submittedOtp: string
): Promise<{ valid: boolean; reason?: string; resetToken?: string }> {
  const user = await db('users').where({ email }).first();
  if (!user) {
    return { valid: false, reason: 'Invalid or expired OTP.' };
  }

  const record = await db('verification_tokens')
    .where({ user_id: user.id, type: 'password_reset_otp', used: false })
    .orderBy('created_at', 'desc')
    .first();

  if (!record) {
    return { valid: false, reason: 'No active OTP found. Please request a new code.' };
  }

  if (new Date(record.expires_at) < new Date()) {
    return { valid: false, reason: 'OTP has expired. Please request a new code.' };
  }

  if (record.attempt_count >= OTP_MAX_ATTEMPTS) {
    return { valid: false, reason: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (sha256Hash(submittedOtp) !== record.token) {
    await db('verification_tokens').where({ id: record.id }).increment('attempt_count', 1);
    return { valid: false, reason: 'Incorrect OTP.' };
  }

  await db('verification_tokens').where({ id: record.id }).update({ used: true });
  const resetToken = generateVerificationProof(`reset:${user.id}`);

  return { valid: true, resetToken };
}

/**
 * Send OTP via configured SMS provider (or console mock)
 */
async function dispatchSms(phone: string, otp: string): Promise<void> {
  if (env.SMS_PROVIDER === 'mock' || env.NODE_ENV === 'development') {
    console.log(`\n📱 [OTP MOCK] Phone: ${phone} → OTP: ${otp}\n`);
    return;
  }
  // TODO: Integrate MSG91 / Twilio here
  throw new Error('SMS provider not configured');
}
