import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import * as authService from './auth.service';
import {
  registerSchema,
  registerSellerSchema,
  registerDeliverySchema,
  checkUsernameSchema,
  loginEmailSchema,
  loginPhoneSchema,
  verifyOtpSchema,
  sendPreRegPhoneOtpSchema,
  verifyPreRegPhoneOtpSchema,
  sendPreRegEmailOtpSchema,
  verifyPreRegEmailOtpSchema,
  forgotPasswordSchema,
  verifyForgotPasswordOtpSchema,
  resetPasswordWithTokenSchema,
  resetPasswordSchema,
  resendOtpSchema,
  verifyEmailSchema,
} from './auth.validators';
import { verifyRefreshToken } from '../../services/token.service';
import { createSecurityEvent } from '../../services/security.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendForbidden,
  sendUnauthorized,
} from '../../utils/response';

// ─── Validation helper ────────────────────────────────────────────────────────

function validate<T>(schema: ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };

  const errors: Record<string, string[]> = {};
  result.error.issues.forEach((e) => {
    const key = e.path.join('.') || 'general';
    if (!errors[key]) errors[key] = [];
    errors[key].push(e.message);
  });
  return { success: false, errors };
}

// ─── Pre-Registration Phone & Email OTP Handlers ───────────────────────────────

export async function sendPreRegPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(sendPreRegPhoneOtpSchema, req.body);
    if (!parsed.success) { sendError(res, 'Validation failed', 422, parsed.errors); return; }
    await authService.sendPreRegPhoneOtp(parsed.data.phone);
    sendSuccess(res, null, 'OTP sent to phone number');
  } catch (err) { next(err); }
}

export async function verifyPreRegPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(verifyPreRegPhoneOtpSchema, req.body);
    if (!parsed.success) { sendError(res, 'Validation failed', 422, parsed.errors); return; }
    const result = await authService.verifyPreRegPhoneOtp(parsed.data.phone, parsed.data.otp);
    sendSuccess(res, result, 'Phone number verified successfully');
  } catch (err) { next(err); }
}

export async function sendPreRegEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(sendPreRegEmailOtpSchema, req.body);
    if (!parsed.success) { sendError(res, 'Validation failed', 422, parsed.errors); return; }
    await authService.sendPreRegEmailOtp(parsed.data.email);
    sendSuccess(res, null, 'OTP sent to email address');
  } catch (err) { next(err); }
}

export async function verifyPreRegEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(verifyPreRegEmailOtpSchema, req.body);
    if (!parsed.success) { sendError(res, 'Validation failed', 422, parsed.errors); return; }
    const result = await authService.verifyPreRegEmailOtp(parsed.data.email, parsed.data.otp);
    sendSuccess(res, result, 'Email address verified successfully');
  } catch (err) { next(err); }
}

export async function checkUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(checkUsernameSchema, req.body);
    if (!parsed.success) { sendError(res, 'Validation failed', 422, parsed.errors); return; }
    const result = await authService.checkUsername(parsed.data.username);
    sendSuccess(res, result, result.available ? 'Username is available' : 'Username is already taken');
  } catch (err) { next(err); }
}

// ─── Register Final Account ───────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(registerSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    const result = await authService.registerCustomer(
      parsed.data,
      req.ip,
      req.headers['user-agent']
    );

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendCreated(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Account created successfully');
  } catch (err) {
    next(err);
  }
}

export async function registerSeller(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(registerSellerSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    const result = await authService.registerSeller(
      parsed.data,
      req.ip,
      req.headers['user-agent']
    );

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendCreated(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Seller application submitted and account created successfully');
  } catch (err) {
    next(err);
  }
}

export async function registerDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(registerDeliverySchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    const result = await authService.registerDeliveryPartner(
      parsed.data,
      req.ip,
      req.headers['user-agent']
    );

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendCreated(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Delivery partner application submitted and account created successfully');
  } catch (err) {
    next(err);
  }
}

export async function registerAdminAttempt(req: Request, res: Response): Promise<void> {
  createSecurityEvent({
    eventType: 'unauthorized_admin_registration_attempt',
    severity: 'critical',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    details: { bodySubmitted: req.body },
  });

  sendForbidden(res, 'Public admin registration is strictly forbidden on DripNow platform');
}


// ─── Verify Phone OTP ─────────────────────────────────────────────────────────

export async function verifyPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(verifyOtpSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    const result = await authService.verifyOtpAndLogin(
      parsed.data.phone,
      parsed.data.otp,
      req.ip,
      req.headers['user-agent']
    );

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Phone verified and logged in successfully');
  } catch (err) {
    next(err);
  }
}

// ─── Resend Phone OTP ─────────────────────────────────────────────────────────

export async function resendPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(resendOtpSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    await authService.initiatePhoneLogin(parsed.data.phone, req.ip, req.headers['user-agent']);
    sendSuccess(res, null, 'OTP resent successfully');
  } catch (err) {
    next(err);
  }
}

// ─── Login Phone (initiate OTP) ───────────────────────────────────────────────

export async function loginPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(loginPhoneSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    await authService.initiatePhoneLogin(parsed.data.phone, req.ip, req.headers['user-agent']);
    sendSuccess(res, null, 'OTP sent to your phone number');
  } catch (err) {
    next(err);
  }
}

// ─── Login Email+Password ──────────────────────────────────────────────────────

export async function loginEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(loginEmailSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    const result = await authService.loginWithEmail(parsed.data, req.ip, req.headers['user-agent']);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
  } catch (err) {
    next(err);
  }
}

// ─── Google Auth Callback ─────────────────────────────────────────────────────

export async function googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = req.body as { sub: string; email: string; name: string; picture?: string };

    if (!profile.sub || !profile.email) {
      sendError(res, 'Invalid Google profile data', 400);
      return;
    }

    const result = await authService.loginWithGoogle(profile, req.ip, req.headers['user-agent']);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Google login successful');
  } catch (err) {
    next(err);
  }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      sendUnauthorized(res, 'Refresh token required');
      return;
    }

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      sendUnauthorized(res, 'Invalid or expired refresh token');
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshAuthToken(
      rawToken,
      payload.sub,
      req.ip
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, { accessToken }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendUnauthorized(res); return; }
    await authService.logout(req.user.id, req.user.sessionId, req.ip, req.headers['user-agent']);
    res.clearCookie('refreshToken');
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

export async function logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendUnauthorized(res); return; }
    await authService.logoutAll(req.user.id, req.ip, req.headers['user-agent']);
    res.clearCookie('refreshToken');
    sendSuccess(res, null, 'Logged out from all devices');
  } catch (err) {
    next(err);
  }
}

// ─── Forgot Password (OTP Flow) ────────────────────────────────────────────────

export async function forgotPasswordSendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(forgotPasswordSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    await authService.sendPasswordResetOtp(parsed.data.email, req.ip, req.headers['user-agent']);
    sendSuccess(res, null, 'If an account exists with this email, an OTP code has been sent.');
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordVerifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(verifyForgotPasswordOtpSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    const result = await authService.verifyPasswordResetOtp(parsed.data.email, parsed.data.otp);
    sendSuccess(res, result, 'OTP code verified successfully');
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordWithToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(resetPasswordWithTokenSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    await authService.resetPasswordWithToken(
      parsed.data.email,
      parsed.data.reset_token,
      parsed.data.new_password,
      req.ip,
      req.headers['user-agent']
    );
    sendSuccess(res, null, 'Password reset successful. Please log in with your new password.');
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(forgotPasswordSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    await authService.sendPasswordResetOtp(parsed.data.email, req.ip, req.headers['user-agent']);
    sendSuccess(res, null, 'If an account exists with this email, you will receive a reset link/OTP shortly.');
  } catch (err) {
    next(err);
  }
}


// ─── Email Verification ───────────────────────────────────────────────────────

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = validate(verifyEmailSchema, req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 422, parsed.errors);
      return;
    }

    await authService.verifyEmail(parsed.data.token);
    sendSuccess(res, null, 'Email verified successfully. Welcome to DripNow!');
  } catch (err) {
    next(err);
  }
}

// ─── Get Current User ─────────────────────────────────────────────────────────

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { sendUnauthorized(res); return; }
    const user = await authService.getCurrentUser(req.user.id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
