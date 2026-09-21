import { z } from 'zod';

const phoneRegex = /^\+[1-9]\d{7,14}$/; // E.164 format

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Phone must be in E.164 format (e.g. +919876543210)'),
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Invalid email address')
    .max(320),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone_token: z.string().min(1, 'Phone verification proof is required'),
  email_token: z.string().min(1, 'Email verification proof is required'),
});

export const checkUsernameSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
});

export const sendPreRegPhoneOtpSchema = z.object({
  phone: z.string().min(1, 'Phone number is required').regex(phoneRegex, 'Invalid phone number format'),
});

export const verifyPreRegPhoneOtpSchema = z.object({
  phone: z.string().min(1, 'Phone number is required').regex(phoneRegex, 'Invalid phone number format'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

export const sendPreRegEmailOtpSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Invalid email address'),
});

export const verifyPreRegEmailOtpSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

export const loginEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  required_role: z.string().optional(),
});

export const loginPhoneSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
  required_role: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

export const verifyRegistrationOtpsSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
  phone_otp: z.string().length(6, 'Phone OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
  email: z.string().email('Invalid email address'),
  email_otp: z.string().length(6, 'Email OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

export const resendEmailOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const verifyForgotPasswordOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

export const resetPasswordWithTokenSchema = z.object({
  email: z.string().email('Invalid email address'),
  reset_token: z.string().min(1, 'Reset token is required'),
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export const resendOtpSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginEmailInput = z.infer<typeof loginEmailSchema>;
export type LoginPhoneInput = z.infer<typeof loginPhoneSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type VerifyRegistrationOtpsInput = z.infer<typeof verifyRegistrationOtpsSchema>;
export type ResendEmailOtpInput = z.infer<typeof resendEmailOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
