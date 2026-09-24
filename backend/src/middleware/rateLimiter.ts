import rateLimit from 'express-rate-limit';
import { sendTooManyRequests } from '../utils/response';
import { Request, Response } from 'express';

const jsonHandler = (_req: Request, res: Response) => {
  sendTooManyRequests(res, 'Too many requests, please try again later.');
};

/** General API rate limiter */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

/** Login attempts limiter */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

/** OTP send rate limiter */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
  message: 'Too many OTP requests. Please try again in 15 minutes.',
});

/** Password reset request limiter */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

/** Registration limiter */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});
