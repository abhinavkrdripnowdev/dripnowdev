import { Router } from 'express';
import * as controller from './auth.controller';
import { authenticate } from '../../middleware/authenticate';
import {
  loginLimiter,
  otpLimiter,
  passwordResetLimiter,
  registrationLimiter,
} from '../../middleware/rateLimiter';

const router = Router();

// ─── Public Auth Routes ────────────────────────────────────────────────────────

/** POST /api/auth/register/send-phone-otp — Send OTP to phone for pre-registration */
router.post('/register/send-phone-otp', otpLimiter, controller.sendPreRegPhoneOtp);

/** POST /api/auth/register/verify-phone-otp — Verify phone OTP & return proof token */
router.post('/register/verify-phone-otp', otpLimiter, controller.verifyPreRegPhoneOtp);

/** POST /api/auth/register/send-email-otp — Send OTP to email for pre-registration */
router.post('/register/send-email-otp', otpLimiter, controller.sendPreRegEmailOtp);

/** POST /api/auth/register/verify-email-otp — Verify email OTP & return proof token */
router.post('/register/verify-email-otp', otpLimiter, controller.verifyPreRegEmailOtp);

/** POST /api/auth/check-username — Check if unique username is available */
router.post('/check-username', controller.checkUsername);

/** POST /api/auth/register — Create customer account */
router.post('/register', registrationLimiter, controller.register);

/** POST /api/auth/register/seller — Register seller account & application */
router.post('/register/seller', registrationLimiter, controller.registerSeller);

/** POST /api/auth/register/delivery — Register delivery partner account & application */
router.post('/register/delivery', registrationLimiter, controller.registerDelivery);

/** POST /api/auth/register/admin — Block public admin registration & log security event */
router.all('/register/admin', controller.registerAdminAttempt);


/** POST /api/auth/verify-phone-otp — Verify phone OTP (phone login) */
router.post('/verify-phone-otp', otpLimiter, controller.verifyPhoneOtp);

/** POST /api/auth/resend-phone-otp — Resend phone OTP */
router.post('/resend-phone-otp', otpLimiter, controller.resendPhoneOtp);

/** POST /api/auth/verify-email — Verify email token from link */
router.post('/verify-email', controller.verifyEmail);

/** POST /api/auth/login/phone — Initiate phone OTP login */
router.post('/login/phone', loginLimiter, controller.loginPhone);

/** POST /api/auth/login/email — Login with email + password */
router.post('/login/email', loginLimiter, controller.loginEmail);

/** POST /api/auth/google — Google OAuth token verification */
router.post('/google', loginLimiter, controller.googleCallback);

/** POST /api/auth/forgot-password/send-otp — Send password reset OTP code */
router.post('/forgot-password/send-otp', passwordResetLimiter, controller.forgotPasswordSendOtp);

/** POST /api/auth/forgot-password/verify-otp — Verify password reset OTP code */
router.post('/forgot-password/verify-otp', otpLimiter, controller.forgotPasswordVerifyOtp);

/** POST /api/auth/forgot-password/reset — Reset password using verified token */
router.post('/forgot-password/reset', controller.resetPasswordWithToken);

/** POST /api/auth/forgot-password — Request password reset email */
router.post('/forgot-password', passwordResetLimiter, controller.forgotPassword);

/** POST /api/auth/reset-password — Reset password with token */
router.post('/reset-password', controller.resetPasswordWithToken);

/** POST /api/auth/refresh — Refresh access token using refresh token */
router.post('/refresh', controller.refreshToken);

// ─── Protected Auth Routes ─────────────────────────────────────────────────────

/** POST /api/auth/logout — Revoke current session */
router.post('/logout', authenticate, controller.logout);

/** POST /api/auth/logout-all — Revoke all sessions (all devices) */
router.post('/logout-all', authenticate, controller.logoutAll);

/** GET /api/auth/me — Get current user profile */
router.get('/me', authenticate, controller.me);

export default router;
