import { z } from 'zod';

const phoneRegex = /^\+[1-9]\d{7,14}$/;

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'User ID must be at least 3 characters')
    .max(30, 'User ID must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'User ID can only contain letters, numbers, underscores, and hyphens'),
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, and hyphens'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Enter a valid phone number (e.g. +919876543210)'),
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

export const verifyRegistrationOtpsSchema = z.object({
  phone_otp: z
    .string()
    .length(6, 'Mobile OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must be numeric only'),
  email_otp: z
    .string()
    .length(6, 'Email OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must be numeric only'),
});

export const loginEmailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  required_role: z.string().optional(),
});

export const loginPhoneSchema = z.object({
  phone: z.string().min(1, 'Phone number is required').regex(phoneRegex, 'Enter a valid phone number'),
  required_role: z.string().optional(),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must be numeric only'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

export const verifyForgotPasswordOtpSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric only'),
});

export const resetPasswordWithTokenSchema = z
  .object({
    email: z.string().email(),
    reset_token: z.string().min(1, 'Reset token is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type VerifyRegistrationOtpsFormValues = z.infer<typeof verifyRegistrationOtpsSchema>;
export type LoginEmailFormValues = z.infer<typeof loginEmailSchema>;
export type LoginPhoneFormValues = z.infer<typeof loginPhoneSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type VerifyForgotPasswordOtpFormValues = z.infer<typeof verifyForgotPasswordOtpSchema>;
export type ResetPasswordWithTokenFormValues = z.infer<typeof resetPasswordWithTokenSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordWithTokenSchema>;
