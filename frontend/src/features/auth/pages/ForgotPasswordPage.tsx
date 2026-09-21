import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '@/components/layout/AuthLayout/AuthLayout';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { PasswordInput } from '@/components/ui/PasswordInput/PasswordInput';
import { OtpInput } from '@/components/ui/OtpInput/OtpInput';
import { authService } from '@/features/auth/services/auth.service';
import {
  forgotPasswordSchema,
  resetPasswordWithTokenSchema,
} from '@/features/auth/schemas/auth.schemas';
import type {
  ForgotPasswordFormValues,
} from '@/features/auth/schemas/auth.schemas';
import './RegisterPage.css';
import './ForgotPasswordPage.css';

type ForgotStep = 'email' | 'otp' | 'reset' | 'success';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<ForgotStep>('email');
  const [globalError, setGlobalError] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const startResendTimer = () => {
    setResendCountdown(30);
    const interval = setInterval(() => {
      setResendCountdown((c) => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; });
    }, 1000);
  };

  const onEmailSubmit = emailForm.handleSubmit(async (data) => {
    setGlobalError('');
    try {
      await authService.sendForgotPasswordOtp(data.email);
      setEmail(data.email);
      setStep('otp');
      startResendTimer();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to send OTP email');
    }
  });

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP code');
      return;
    }
    setOtpError('');
    setOtpLoading(true);
    try {
      const token = await authService.verifyForgotPasswordOtp(email, otp);
      setResetToken(token);
      setStep('reset');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Invalid OTP code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    try {
      await authService.sendForgotPasswordOtp(email);
      setOtp('');
      setOtpError('');
      startResendTimer();
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Failed to resend OTP');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parseResult = resetPasswordWithTokenSchema.safeParse({
      email,
      reset_token: resetToken,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });

    if (!parseResult.success) {
      const firstErr = parseResult.error.issues[0]?.message || 'Please check your password input';
      setResetError(firstErr);
      return;
    }

    setResetError('');
    setResetLoading(true);
    try {
      await authService.resetPasswordWithToken({
        email,
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setStep('success');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* ── Step 1: Enter Email ───────────────────────────────────────── */}
      {step === 'email' && (
        <div className="animate-fade-in-up">
          <Link to="/login" className="auth-back-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
            ← Back to login
          </Link>
          <div className="auth-header">
            <div className="auth-icon-badge">🔑</div>
            <h2 className="auth-title">Forgot your password?</h2>
            <p className="auth-subtitle">
              Enter your registered email address and we'll send you a 6-digit OTP code to reset your password.
            </p>
          </div>

          {globalError && (
            <div className="auth-alert auth-alert--error animate-fade-in-down" role="alert">
              {globalError}
            </div>
          )}

          <form onSubmit={onEmailSubmit} noValidate className="auth-form">
            <Input
              id="forgot-email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={emailForm.formState.errors.email?.message}
              {...emailForm.register('email')}
            />
            <Button
              id="forgot-password-submit-btn"
              type="submit"
              variant="gradient"
              size="lg"
              fullWidth
              isLoading={emailForm.formState.isSubmitting}
            >
              Send OTP Code
            </Button>
          </form>
        </div>
      )}

      {/* ── Step 2: Enter & Verify OTP ───────────────────────────────── */}
      {step === 'otp' && (
        <div className="animate-slide-in-right">
          <button className="auth-back-btn" onClick={() => setStep('email')} type="button">
            ← Change email
          </button>
          <div className="auth-header">
            <div className="auth-icon-badge">🛡️</div>
            <h2 className="auth-title">Verify OTP Code</h2>
            <p className="auth-subtitle">
              We sent a 6-digit OTP code to <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
            </p>
          </div>

          {otpError && (
            <div className="auth-alert auth-alert--error animate-fade-in-down" role="alert">
              {otpError}
            </div>
          )}

          <div className="otp-container">
            <OtpInput
              id="forgot-otp"
              value={otp}
              onChange={(v) => { setOtp(v); setOtpError(''); }}
              error={!!otpError}
              disabled={otpLoading}
              length={6}
            />
          </div>

          <Button
            id="forgot-otp-verify-btn"
            variant="gradient"
            size="lg"
            fullWidth
            isLoading={otpLoading}
            disabled={otp.length < 6}
            onClick={handleVerifyOtp}
            type="button"
          >
            Verify Code &amp; Continue
          </Button>

          <div className="otp-resend" style={{ marginTop: 'var(--space-5)' }}>
            {resendCountdown > 0 ? (
              <p className="otp-resend__countdown">Resend OTP in {resendCountdown}s</p>
            ) : (
              <button type="button" className="auth-link-btn" onClick={handleResendOtp}>
                Didn't receive code? Resend OTP
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Set New Password ──────────────────────────────────── */}
      {step === 'reset' && (
        <div className="animate-fade-in-up">
          <div className="auth-header">
            <div className="auth-icon-badge">🔐</div>
            <h2 className="auth-title">Set new password</h2>
            <p className="auth-subtitle">
              Enter your new password for <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
            </p>
          </div>

          {resetError && (
            <div className="auth-alert auth-alert--error animate-fade-in-down" role="alert">
              {resetError}
            </div>
          )}

          <form onSubmit={handleResetPassword} noValidate className="auth-form">
            <PasswordInput
              id="reset-new-password"
              label="New password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setResetError(''); }}
              showStrength
            />
            <PasswordInput
              id="reset-confirm-password"
              label="Confirm new password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setResetError(''); }}
            />
            <Button
              id="reset-password-submit-btn"
              type="submit"
              variant="gradient"
              size="lg"
              fullWidth
              isLoading={resetLoading}
            >
              Reset Password
            </Button>
          </form>
        </div>
      )}

      {/* ── Step 4: Success ───────────────────────────────────────────── */}
      {step === 'success' && (
        <div className="animate-bounce-in" style={{ textAlign: 'center' }}>
          <div className="auth-success-icon">🎉</div>
          <h2 className="auth-title">Password reset successful!</h2>
          <p className="auth-subtitle" style={{ marginBottom: 'var(--space-8)' }}>
            Your password has been updated. All active sessions have been signed out for security.
          </p>
          <Button
            id="go-to-login-btn"
            variant="gradient"
            size="lg"
            fullWidth
            type="button"
            onClick={() => navigate('/login', { replace: true })}
          >
            Sign In with New Password
          </Button>
        </div>
      )}
    </AuthLayout>
  );
};
