import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import { env } from '../../config/env';
import { hashPassword, comparePassword } from '../../utils/hash';
import { generateSecureToken, sha256Hash } from '../../utils/crypto';
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  sendEmailOtp,
  verifyEmailOtp,
  sendPreRegPhoneOtp as sendPreRegPhoneOtpService,
  verifyPreRegPhoneOtp as verifyPreRegPhoneOtpService,
  sendPreRegEmailOtp as sendPreRegEmailOtpService,
  verifyPreRegEmailOtp as verifyPreRegEmailOtpService,
  sendPasswordResetOtp as sendPasswordResetOtpService,
  verifyPasswordResetOtp as verifyPasswordResetOtpService,
  verifyProofToken,
} from '../../services/otp.service';
import { sendEmailVerification, sendPasswordResetEmail, sendWelcomeEmail } from '../../services/email.service';
import { createSession, rotateRefreshToken, revokeAllSessions, revokeSession } from '../../services/token.service';
import { createAuditLog } from '../../services/audit.service';
import { createSecurityEvent } from '../../services/security.service';
import type {
  AuthenticatedUser,
  RegisterPayload,
  RegisterSellerPayload,
  RegisterDeliveryPayload,
  LoginEmailPayload,
  GoogleProfile,
} from './auth.types';

const LOCK_DURATION_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRES_MINUTES = Number(env.RESET_TOKEN_EXPIRES_IN_MINUTES);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserRoles(userId: string): Promise<string[]> {
  const rows = await db('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', userId)
    .select('roles.name');
  return rows.map((r: { name: string }) => r.name);
}

async function buildAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
  const user = await db('users').where({ id: userId }).first();
  const roles = await getUserRoles(userId);
  return {
    id: user.id,
    username: user.username ?? null,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url,
    status: user.status,
    phone_verified: user.phone_verified,
    email_verified: user.email_verified,
    roles,
  };
}

// ─── Pre-Registration Inline OTP Handlers ─────────────────────────────────────

export async function sendPreRegPhoneOtp(phone: string): Promise<{ otp: string }> {
  const otp = await sendPreRegPhoneOtpService(phone);
  return { otp };
}

export async function verifyPreRegPhoneOtp(phone: string, otp: string): Promise<{ verificationToken: string }> {
  const result = await verifyPreRegPhoneOtpService(phone, otp);
  if (!result.valid || !result.verificationToken) {
    throw Object.assign(new Error(result.reason || 'Invalid Phone OTP'), { statusCode: 400 });
  }
  return { verificationToken: result.verificationToken };
}

export async function sendPreRegEmailOtp(email: string): Promise<{ otp: string }> {
  const otp = await sendPreRegEmailOtpService(email);
  return { otp };
}

export async function verifyPreRegEmailOtp(email: string, otp: string): Promise<{ verificationToken: string }> {
  const result = await verifyPreRegEmailOtpService(email, otp);
  if (!result.valid || !result.verificationToken) {
    throw Object.assign(new Error(result.reason || 'Invalid Email OTP'), { statusCode: 400 });
  }
  return { verificationToken: result.verificationToken };
}

export async function checkUsername(username: string): Promise<{ available: boolean }> {
  const existing = await db('users').where({ username }).first();
  return { available: !existing };
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerCustomer(
  input: RegisterPayload,
  ip?: string,
  userAgent?: string
): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  // Validate proof tokens
  if (!verifyProofToken(input.phone, input.phone_token)) {
    throw Object.assign(new Error('Phone number verification expired or invalid. Please verify phone number again.'), { statusCode: 400 });
  }
  if (!verifyProofToken(input.email, input.email_token)) {
    throw Object.assign(new Error('Email address verification expired or invalid. Please verify email address again.'), { statusCode: 400 });
  }

  // Check duplicate username
  const existingUsername = await db('users').where({ username: input.username }).first();
  if (existingUsername) throw Object.assign(new Error('User ID / Username is already taken by another user'), { statusCode: 409 });

  // Check duplicate phone
  const existingPhone = await db('users').where({ phone: input.phone }).first();
  if (existingPhone) throw Object.assign(new Error('Phone number is already registered'), { statusCode: 409 });

  // Check duplicate email
  const existingEmail = await db('users').where({ email: input.email }).first();
  if (existingEmail) throw Object.assign(new Error('Email address is already registered'), { statusCode: 409 });

  const userId = uuidv4();

  await db.transaction(async (trx) => {
    await trx('users').insert({
      id: userId,
      username: input.username,
      full_name: input.full_name,
      phone: input.phone,
      email: input.email,
      phone_verified: true,
      email_verified: true,
      status: 'active',
    });

    // Assign customer role (id=1)
    await trx('user_roles').insert({ user_id: userId, role_id: 1, granted_by: null });

    // Store password credential
    const hash = await hashPassword(input.password);
    await trx('credentials').insert({ user_id: userId, password_hash: hash });
  });

  const roles = await getUserRoles(userId);
  const { accessToken, refreshToken } = await createSession(userId, roles, userAgent, ip);

  createAuditLog({ userId, action: 'register_completed_verified', ipAddress: ip, userAgent });

  sendWelcomeEmail(input.email, input.full_name).catch(() => {});

  const authenticatedUser = await buildAuthenticatedUser(userId);
  return { user: authenticatedUser, accessToken, refreshToken };
}

export async function registerSeller(
  input: RegisterSellerPayload,
  ip?: string,
  userAgent?: string
): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  if (!verifyProofToken(input.phone, input.phone_token)) {
    throw Object.assign(new Error('Phone verification expired or invalid.'), { statusCode: 400 });
  }
  if (!verifyProofToken(input.email, input.email_token)) {
    throw Object.assign(new Error('Email verification expired or invalid.'), { statusCode: 400 });
  }

  const existingUsername = await db('users').where({ username: input.username }).first();
  if (existingUsername) throw Object.assign(new Error('Username is already taken'), { statusCode: 409 });

  const existingPhone = await db('users').where({ phone: input.phone }).first();
  if (existingPhone) throw Object.assign(new Error('Phone number is already registered'), { statusCode: 409 });

  const existingEmail = await db('users').where({ email: input.email }).first();
  if (existingEmail) throw Object.assign(new Error('Email address is already registered'), { statusCode: 409 });

  const userId = uuidv4();

  await db.transaction(async (trx) => {
    await trx('users').insert({
      id: userId,
      username: input.username,
      full_name: input.full_name,
      phone: input.phone,
      email: input.email,
      phone_verified: true,
      email_verified: true,
      status: 'active',
    });

    // Assign seller role (id=2)
    await trx('user_roles').insert({ user_id: userId, role_id: 2, granted_by: null });

    // Store password credential
    const hash = await hashPassword(input.password);
    await trx('credentials').insert({ user_id: userId, password_hash: hash });

    // Create onboarding application entry
    await trx('onboarding_applications').insert({
      user_id: userId,
      role_applied: 'seller',
      status: 'pending',
      business_name: input.business_name,
      business_type: input.business_type ?? null,
      address: input.address ?? null,
      documents_json: input.documents_json ? JSON.stringify(input.documents_json) : null,
    });
  });

  const roles = await getUserRoles(userId);
  const { accessToken, refreshToken } = await createSession(userId, roles, userAgent, ip);

  createAuditLog({ userId, action: 'register_completed_verified', ipAddress: ip, userAgent, metadata: { role: 'seller' } });
  sendWelcomeEmail(input.email, input.full_name).catch(() => {});

  const authenticatedUser = await buildAuthenticatedUser(userId);
  return { user: authenticatedUser, accessToken, refreshToken };
}

export async function registerDeliveryPartner(
  input: RegisterDeliveryPayload,
  ip?: string,
  userAgent?: string
): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  if (!verifyProofToken(input.phone, input.phone_token)) {
    throw Object.assign(new Error('Phone verification expired or invalid.'), { statusCode: 400 });
  }
  if (!verifyProofToken(input.email, input.email_token)) {
    throw Object.assign(new Error('Email verification expired or invalid.'), { statusCode: 400 });
  }

  const existingUsername = await db('users').where({ username: input.username }).first();
  if (existingUsername) throw Object.assign(new Error('Username is already taken'), { statusCode: 409 });

  const existingPhone = await db('users').where({ phone: input.phone }).first();
  if (existingPhone) throw Object.assign(new Error('Phone number is already registered'), { statusCode: 409 });

  const existingEmail = await db('users').where({ email: input.email }).first();
  if (existingEmail) throw Object.assign(new Error('Email address is already registered'), { statusCode: 409 });

  const userId = uuidv4();
  const docs = input.documents_json ? { ...input.documents_json, vehicle_type: input.vehicle_type, license_number: input.license_number } : { vehicle_type: input.vehicle_type, license_number: input.license_number };

  await db.transaction(async (trx) => {
    await trx('users').insert({
      id: userId,
      username: input.username,
      full_name: input.full_name,
      phone: input.phone,
      email: input.email,
      phone_verified: true,
      email_verified: true,
      status: 'active',
    });

    // Assign delivery_partner role (id=3)
    await trx('user_roles').insert({ user_id: userId, role_id: 3, granted_by: null });

    // Store password credential
    const hash = await hashPassword(input.password);
    await trx('credentials').insert({ user_id: userId, password_hash: hash });

    // Create onboarding application entry
    await trx('onboarding_applications').insert({
      user_id: userId,
      role_applied: 'delivery_partner',
      status: 'pending',
      address: input.address ?? null,
      documents_json: JSON.stringify(docs),
    });
  });

  const roles = await getUserRoles(userId);
  const { accessToken, refreshToken } = await createSession(userId, roles, userAgent, ip);

  createAuditLog({ userId, action: 'register_completed_verified', ipAddress: ip, userAgent, metadata: { role: 'delivery_partner' } });
  sendWelcomeEmail(input.email, input.full_name).catch(() => {});

  const authenticatedUser = await buildAuthenticatedUser(userId);
  return { user: authenticatedUser, accessToken, refreshToken };
}


// ─── Dual OTP Verification for Registration ────────────────────────────────────

export async function verifyRegistrationOtps(
  input: { phone: string; phone_otp: string; email: string; email_otp: string },
  ip?: string,
  userAgent?: string
): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  const user = await db('users').where({ phone: input.phone, email: input.email }).first();
  if (!user) throw Object.assign(new Error('No matching account found for verification'), { statusCode: 404 });

  // Verify Phone OTP
  const phoneResult = await verifyPhoneOtp(user.id, input.phone_otp);
  if (!phoneResult.valid) throw Object.assign(new Error(phoneResult.reason || 'Invalid Phone OTP'), { statusCode: 400 });

  // Verify Email OTP
  const emailResult = await verifyEmailOtp(user.id, input.email_otp);
  if (!emailResult.valid) throw Object.assign(new Error(emailResult.reason || 'Invalid Email OTP'), { statusCode: 400 });

  // Activate account after both OTPs pass
  await db('users').where({ id: user.id }).update({
    status: 'active',
    phone_verified: true,
    email_verified: true,
  });

  const roles = await getUserRoles(user.id);
  const { accessToken, refreshToken } = await createSession(user.id, roles, userAgent, ip);

  createAuditLog({ userId: user.id, action: 'register_completed_verified', ipAddress: ip, userAgent });

  // Send welcome email upon successful verification
  if (user.email) {
    sendWelcomeEmail(user.email, user.full_name).catch(() => {});
  }

  const authenticatedUser = await buildAuthenticatedUser(user.id);
  return { user: authenticatedUser, accessToken, refreshToken };
}

// ─── Resend Email OTP ──────────────────────────────────────────────────────────

export async function initiateEmailOtp(
  email: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  const user = await db('users').where({ email }).first();
  if (!user) throw Object.assign(new Error('No account found with this email address'), { statusCode: 404 });

  await sendEmailOtp(user.id, user.email, user.full_name);
  createAuditLog({ userId: user.id, action: 'email_otp_sent', ipAddress: ip, userAgent });
}

// ─── Phone OTP Login / Verification ──────────────────────────────────────────

export async function initiatePhoneLogin(
  phone: string,
  ip?: string,
  userAgent?: string
): Promise<{ otp: string }> {
  const user = await db('users').where({ phone }).first();
  if (!user) throw Object.assign(new Error('No account found with this phone number'), { statusCode: 404 });
  if (user.status === 'suspended') throw Object.assign(new Error('Your account has been suspended'), { statusCode: 403 });

  const otp = await sendPhoneOtp(user.id, phone);
  createAuditLog({ userId: user.id, action: 'phone_otp_sent', ipAddress: ip, userAgent });
  return { otp };
}

export async function verifyOtpAndLogin(
  phone: string,
  otp: string,
  ip?: string,
  userAgent?: string
): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  const user = await db('users').where({ phone }).first();
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const result = await verifyPhoneOtp(user.id, otp);
  if (!result.valid) throw Object.assign(new Error(result.reason), { statusCode: 400 });

  // Activate account if pending
  if (user.status === 'pending_verification') {
    await db('users').where({ id: user.id }).update({ status: 'active' });
  }

  const roles = await getUserRoles(user.id);
  const { accessToken, refreshToken } = await createSession(user.id, roles, userAgent, ip);

  createAuditLog({ userId: user.id, action: 'login_success_phone', ipAddress: ip, userAgent });

  const authenticatedUser = await buildAuthenticatedUser(user.id);
  return { user: authenticatedUser, accessToken, refreshToken };
}

// ─── Email + Password Login ──────────────────────────────────────────────────

export async function loginWithEmail(
  input: LoginEmailPayload,
  ip?: string,
  userAgent?: string
): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  const user = await db('users').where({ email: input.email }).first();

  if (!user) {
    createAuditLog({ action: 'login_failed_email', ipAddress: ip, userAgent, metadata: { email: input.email } });
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (user.status === 'suspended') {
    throw Object.assign(new Error('Your account has been suspended'), { statusCode: 403 });
  }

  const credential = await db('credentials').where({ user_id: user.id }).first();
  if (!credential) {
    throw Object.assign(new Error('This account uses a different login method'), { statusCode: 400 });
  }

  // Check account lock
  if (credential.locked_until && new Date(credential.locked_until) > new Date()) {
    const remaining = Math.ceil((new Date(credential.locked_until).getTime() - Date.now()) / 60000);
    throw Object.assign(new Error(`Account locked. Try again in ${remaining} minutes.`), { statusCode: 423 });
  }

  const isValid = await comparePassword(input.password, credential.password_hash);

  if (!isValid) {
    const newAttempts = (credential.failed_attempts ?? 0) + 1;
    const updates: Record<string, unknown> = { failed_attempts: newAttempts };

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_DURATION_MINUTES);
      updates.locked_until = lockedUntil;
      createAuditLog({ userId: user.id, action: 'account_locked', ipAddress: ip, userAgent });
    }

    await db('credentials').where({ user_id: user.id }).update(updates);
    createAuditLog({ userId: user.id, action: 'login_failed_email', ipAddress: ip, userAgent });
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  // Reset failed attempts on success
  await db('credentials').where({ user_id: user.id }).update({
    failed_attempts: 0,
    locked_until: null,
    last_login_at: new Date(),
  });

  const roles = await getUserRoles(user.id);

  if (input.required_role) {
    const targetRole = input.required_role;
    const allowedRoles = [targetRole];
    if (targetRole === 'admin') allowedRoles.push('manager');
    if (targetRole === 'shopkeeper') allowedRoles.push('seller');

    const hasPermission = roles.some((r) => r === 'super_admin' || allowedRoles.includes(r));
    if (!hasPermission) {
      const displayRoleName =
        targetRole === 'super_admin'
          ? 'Super Admin'
          : targetRole === 'admin'
          ? 'Admin'
          : targetRole === 'shopkeeper'
          ? 'Shopkeeper'
          : targetRole === 'delivery_partner'
          ? 'Delivery Partner'
          : 'Customer';
      throw Object.assign(
        new Error(`Access Denied: Your account does not have ${displayRoleName} privileges. Please use your designated login portal.`),
        { statusCode: 403 }
      );
    }
  }

  const { accessToken, refreshToken } = await createSession(user.id, roles, userAgent, ip);

  createAuditLog({ userId: user.id, action: 'login_success_email', ipAddress: ip, userAgent });

  const authenticatedUser = await buildAuthenticatedUser(user.id);
  return { user: authenticatedUser, accessToken, refreshToken };
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function loginWithGoogle(
  profile: GoogleProfile,
  ip?: string,
  userAgent?: string
): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
  // Check if Google identity already exists
  let googleIdentity = await db('google_identities').where({ google_sub: profile.sub }).first();

  let userId: string;

  if (googleIdentity) {
    userId = googleIdentity.user_id;
    // Update Google profile info
    await db('google_identities').where({ id: googleIdentity.id }).update({
      google_email: profile.email,
      google_name: profile.name,
      google_picture: profile.picture,
    });
  } else {
    // Check if user exists with this email
    let existingUser = await db('users').where({ email: profile.email }).first();

    if (existingUser) {
      // Link Google account to existing user
      userId = existingUser.id;
    } else {
      // Create new customer
      userId = uuidv4();
      await db.transaction(async (trx) => {
        await trx('users').insert({
          id: userId,
          full_name: profile.name,
          email: profile.email,
          email_verified: true,
          status: 'active',
        });
        await trx('user_roles').insert({ user_id: userId, role_id: 1 });
      });
    }

    await db('google_identities').insert({
      user_id: userId,
      google_sub: profile.sub,
      google_email: profile.email,
      google_name: profile.name,
      google_picture: profile.picture,
    });
  }

  const roles = await getUserRoles(userId);
  const { accessToken, refreshToken } = await createSession(userId, roles, userAgent, ip);

  createAuditLog({ userId, action: 'login_success_google', ipAddress: ip, userAgent });

  const authenticatedUser = await buildAuthenticatedUser(userId);
  return { user: authenticatedUser, accessToken, refreshToken };
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

export async function refreshAuthToken(
  rawRefreshToken: string,
  userId: string,
  ip?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const roles = await getUserRoles(userId);
  const { accessToken, refreshToken } = await rotateRefreshToken(rawRefreshToken, userId, roles, ip);
  return { accessToken, refreshToken };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(userId: string, sessionId?: number, ip?: string, userAgent?: string): Promise<void> {
  if (sessionId) {
    await revokeSession(sessionId);
  }
  createAuditLog({ userId, action: 'logout', ipAddress: ip, userAgent });
}

export async function logoutAll(userId: string, ip?: string, userAgent?: string): Promise<void> {
  await revokeAllSessions(userId);
  createAuditLog({ userId, action: 'logout_all', ipAddress: ip, userAgent });
}

// ─── Forgot Password (OTP Flow) ────────────────────────────────────────────────

export async function sendPasswordResetOtp(email: string, ip?: string, userAgent?: string): Promise<void> {
  const user = await db('users').where({ email }).first();
  if (user) {
    createAuditLog({ userId: user.id, action: 'password_reset_requested', ipAddress: ip, userAgent });
  }
  await sendPasswordResetOtpService(email);
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
  const result = await verifyPasswordResetOtpService(email, otp);
  if (!result.valid || !result.resetToken) {
    throw Object.assign(new Error(result.reason || 'Invalid OTP code'), { statusCode: 400 });
  }
  return { resetToken: result.resetToken };
}

export async function resetPasswordWithToken(
  email: string,
  resetToken: string,
  newPassword: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  const user = await db('users').where({ email }).first();
  if (!user) throw Object.assign(new Error('User account not found'), { statusCode: 404 });

  if (!verifyProofToken(`reset:${user.id}`, resetToken)) {
    throw Object.assign(new Error('Reset token is invalid or expired. Please request a new OTP.'), { statusCode: 400 });
  }

  const newHash = await hashPassword(newPassword);

  await db.transaction(async (trx) => {
    // Update password credential
    await trx('credentials')
      .where({ user_id: user.id })
      .update({ password_hash: newHash, failed_attempts: 0, locked_until: null });

    // Revoke all sessions (security: log out all devices)
    await trx('sessions').where({ user_id: user.id }).update({ revoked: true });
  });

  createAuditLog({ userId: user.id, action: 'password_reset_completed', ipAddress: ip, userAgent });
}

// ─── Email Verification ───────────────────────────────────────────────────────

export async function verifyEmail(rawToken: string): Promise<void> {
  const hashedToken = sha256Hash(rawToken);

  const record = await db('verification_tokens')
    .where({ token: hashedToken, type: 'email_token', used: false })
    .first();

  if (!record) throw Object.assign(new Error('Invalid or expired verification link'), { statusCode: 400 });
  if (new Date(record.expires_at) < new Date()) {
    throw Object.assign(new Error('Verification link has expired'), { statusCode: 400 });
  }

  await db.transaction(async (trx) => {
    await trx('users').where({ id: record.user_id }).update({ email_verified: true });
    await trx('verification_tokens').where({ id: record.id }).update({ used: true });
  });

  const user = await db('users').where({ id: record.user_id }).first();
  if (user?.email) {
    await sendWelcomeEmail(user.email, user.full_name);
  }
}

// ─── Current User ─────────────────────────────────────────────────────────────

export async function getCurrentUser(userId: string): Promise<AuthenticatedUser> {
  return buildAuthenticatedUser(userId);
}
