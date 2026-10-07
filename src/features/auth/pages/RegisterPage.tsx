import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '@/components/layout/AuthLayout/AuthLayout';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { PasswordInput } from '@/components/ui/PasswordInput/PasswordInput';
import { OtpInput } from '@/components/ui/OtpInput/OtpInput';
import { Modal } from '@/components/ui/Modal/Modal';
import { GoogleSignIn } from '@/features/auth/components/GoogleSignIn';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { registerSchema } from '@/features/auth/schemas/auth.schemas';
import { getDefaultDashboard } from '@/features/auth/types/auth.types';
import type { RegisterFormValues } from '@/features/auth/schemas/auth.schemas';
import './RegisterPage.css';

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
  </svg>
);

const phoneRegex = /^(\+?[1-9]\d{7,14}|\d{10})$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [globalError, setGlobalError] = useState('');

  // Phone state & verification
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneToken, setPhoneToken] = useState('');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpError, setPhoneOtpError] = useState('');
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneSendLoading, setPhoneSendLoading] = useState(false);
  const [phoneResendCountdown, setPhoneResendCountdown] = useState(0);

  // Email state & verification
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailToken, setEmailToken] = useState('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailSendLoading, setEmailSendLoading] = useState(false);
  const [emailResendCountdown, setEmailResendCountdown] = useState(0);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', full_name: '', phone: '+91', email: '', password: '' },
  });

  const phoneValue = watch('phone') ?? '';
  const emailValue = watch('email') ?? '';
  const passwordValue = watch('password') ?? '';

  const handleUsernameChange = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || trimmed.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const isAvailable = await authService.checkUsername(trimmed);
    setUsernameStatus(isAvailable ? 'available' : 'taken');
  };

  const isValidPhone = phoneRegex.test(phoneValue);
  const isValidEmail = emailRegex.test(emailValue);

  // Timers
  const startPhoneResendTimer = () => {
    setPhoneResendCountdown(30);
    const interval = setInterval(() => {
      setPhoneResendCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const startEmailResendTimer = () => {
    setEmailResendCountdown(30);
    const interval = setInterval(() => {
      setEmailResendCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  // Phone Verification Trigger
  const handleOpenPhoneModal = async () => {
    if (!isValidPhone) return;
    setGlobalError('');
    setPhoneSendLoading(true);
    try {
      const generatedOtp = await authService.sendPreRegPhoneOtp(phoneValue);
      setPhoneOtp(generatedOtp || '');
      setPhoneOtpError('');
      setIsPhoneModalOpen(true);
      startPhoneResendTimer();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to send OTP to phone');
    } finally {
      setPhoneSendLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length !== 6) {
      setPhoneOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    setPhoneOtpError('');
    setPhoneOtpLoading(true);
    try {
      const token = await authService.verifyPreRegPhoneOtp(phoneValue, phoneOtp);
      setPhoneToken(token);
      setPhoneVerified(true);
      setIsPhoneModalOpen(false);
    } catch (err) {
      setPhoneOtpError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    if (phoneResendCountdown > 0) return;
    try {
      const generatedOtp = await authService.sendPreRegPhoneOtp(phoneValue);
      setPhoneOtp(generatedOtp || '');
      setPhoneOtpError('');
      startPhoneResendTimer();
    } catch (err) {
      setPhoneOtpError(err instanceof Error ? err.message : 'Failed to resend OTP');
    }
  };

  // Email Verification Trigger
  const handleOpenEmailModal = async () => {
    if (!isValidEmail) return;
    setGlobalError('');
    setEmailSendLoading(true);
    try {
      const generatedOtp = await authService.sendPreRegEmailOtp(emailValue);
      setEmailOtp(generatedOtp || '');
      setEmailOtpError('');
      setIsEmailModalOpen(true);
      startEmailResendTimer();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to send OTP to email');
    } finally {
      setEmailSendLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (emailOtp.length !== 6) {
      setEmailOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    setEmailOtpError('');
    setEmailOtpLoading(true);
    try {
      const token = await authService.verifyPreRegEmailOtp(emailValue, emailOtp);
      setEmailToken(token);
      setEmailVerified(true);
      setIsEmailModalOpen(false);
    } catch (err) {
      setEmailOtpError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (emailResendCountdown > 0) return;
    try {
      const generatedOtp = await authService.sendPreRegEmailOtp(emailValue);
      setEmailOtp(generatedOtp || '');
      setEmailOtpError('');
      startEmailResendTimer();
    } catch (err) {
      setEmailOtpError(err instanceof Error ? err.message : 'Failed to resend OTP');
    }
  };

  // Submit Final Registration
  const onSubmitDetails = handleSubmit(async (data) => {
    if (!phoneVerified || !phoneToken) {
      setGlobalError('Please verify your phone number before creating your account.');
      return;
    }
    if (!emailVerified || !emailToken) {
      setGlobalError('Please verify your email address before creating your account.');
      return;
    }

    setGlobalError('');
    try {
      const response = await authService.register({
        username: data.username,
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        password: data.password,
        phone_token: phoneToken,
        email_token: emailToken,
      });
      setAuth(response.user, response.accessToken);
      navigate(getDefaultDashboard(response.user.roles), { replace: true });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Registration failed');
    }
  });

  return (
    <AuthLayout>
      <div className="animate-fade-in-up">
        <div className="auth-header">
          <h2 className="auth-title">Create your account</h2>
          <p className="auth-subtitle">
            Already have one?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>

        {globalError && (
          <div className="auth-alert auth-alert--error animate-fade-in-down" role="alert">
            {globalError}
          </div>
        )}

        <form onSubmit={onSubmitDetails} noValidate className="auth-form">
          <Input
            id="reg-username"
            label="User ID (Unique Handle)"
            placeholder="e.g. alex_drip99"
            autoComplete="username"
            error={errors.username?.message}
            hint="Choose a unique ID for your account (letters, numbers, underscores)"
            rightAddon={
              usernameStatus === 'checking' ? (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Checking...</span>
              ) : usernameStatus === 'available' ? (
                <span className="input-verified-badge">✓ Available</span>
              ) : usernameStatus === 'taken' ? (
                <span className="input-taken">✕ Taken</span>
              ) : null
            }
            {...register('username', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleUsernameChange(e.target.value),
            })}
          />

          <Input
            id="reg-full-name"
            label="Full name"
            placeholder="John Doe"
            autoComplete="name"
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          <Input
            id="reg-phone"
            label="Phone number"
            type="tel"
            placeholder="+919876543210"
            autoComplete="tel"
            disabled={phoneVerified}
            error={errors.phone?.message}
            hint="Include country code (e.g. +91 for India)"
            leftAddon={<PhoneIcon />}
            rightAddon={
              phoneVerified ? (
                <span className="input-verified-badge">✓ Verified</span>
              ) : (
                <button
                  type="button"
                  className="input-verify-btn"
                  onClick={handleOpenPhoneModal}
                  disabled={!isValidPhone || phoneSendLoading}
                >
                  {phoneSendLoading ? 'Sending...' : 'Verify'}
                </button>
              )
            }
            {...register('phone', {
              onChange: () => {
                if (phoneVerified) { setPhoneVerified(false); setPhoneToken(''); }
              },
            })}
          />

          <Input
            id="reg-email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={emailVerified}
            error={errors.email?.message}
            rightAddon={
              emailVerified ? (
                <span className="input-verified-badge">✓ Verified</span>
              ) : (
                <button
                  type="button"
                  className="input-verify-btn"
                  onClick={handleOpenEmailModal}
                  disabled={!isValidEmail || emailSendLoading}
                >
                  {emailSendLoading ? 'Sending...' : 'Verify'}
                </button>
              )
            }
            {...register('email', {
              onChange: () => {
                if (emailVerified) { setEmailVerified(false); setEmailToken(''); }
              },
            })}
          />

          <PasswordInput
            id="reg-password"
            label="Password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            error={errors.password?.message}
            value={passwordValue}
            showStrength
            {...register('password')}
          />

          <Button
            id="register-submit-btn"
            type="submit"
            variant="gradient"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            disabled={!phoneVerified || !emailVerified}
          >
            Create Account
          </Button>

          {(!phoneVerified || !emailVerified) && (
            <p className="auth-verification-hint">
              * Please verify both your mobile number and email address to activate your account.
            </p>
          )}
        </form>

        <GoogleSignIn onError={setGlobalError} dividerLabel="or continue with" />

        <p className="auth-legal">
          By creating an account, you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>{' '}
          &amp;{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>
      </div>

      {/* ── Modal 1: Verify Phone OTP ───────────────────────────────────── */}
      <Modal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        title="Verify Mobile Number"
        subtitle={`Enter the 6-digit OTP code sent to ${phoneValue}`}
      >

        {phoneOtpError && (
          <div className="auth-alert auth-alert--error animate-fade-in-down" role="alert">
            {phoneOtpError}
          </div>
        )}

        <div style={{ margin: '16px 0', display: 'flex', justifyContent: 'center' }}>
          <OtpInput
            id="modal-phone-otp"
            value={phoneOtp}
            onChange={(v) => { setPhoneOtp(v); setPhoneOtpError(''); }}
            disabled={phoneOtpLoading}
            length={6}
          />
        </div>

        <Button
          id="phone-modal-submit-btn"
          variant="gradient"
          size="md"
          fullWidth
          isLoading={phoneOtpLoading}
          disabled={phoneOtp.length < 6}
          onClick={handleVerifyPhoneOtp}
          type="button"
        >
          Verify Code
        </Button>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          {phoneResendCountdown > 0 ? (
            <span className="otp-resend__countdown">Resend code in {phoneResendCountdown}s</span>
          ) : (
            <button type="button" className="auth-link-btn" onClick={handleResendPhoneOtp}>
              Didn't receive code? Resend
            </button>
          )}
        </div>
      </Modal>

      {/* ── Modal 2: Verify Email OTP ───────────────────────────────────── */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Verify Email Address"
        subtitle={`Enter the 6-digit OTP code sent to ${emailValue}`}
      >

        {emailOtpError && (
          <div className="auth-alert auth-alert--error animate-fade-in-down" role="alert">
            {emailOtpError}
          </div>
        )}

        <div style={{ margin: '16px 0', display: 'flex', justifyContent: 'center' }}>
          <OtpInput
            id="modal-email-otp"
            value={emailOtp}
            onChange={(v) => { setEmailOtp(v); setEmailOtpError(''); }}
            disabled={emailOtpLoading}
            length={6}
          />
        </div>

        <Button
          id="email-modal-submit-btn"
          variant="gradient"
          size="md"
          fullWidth
          isLoading={emailOtpLoading}
          disabled={emailOtp.length < 6}
          onClick={handleVerifyEmailOtp}
          type="button"
        >
          Verify Code
        </Button>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          {emailResendCountdown > 0 ? (
            <span className="otp-resend__countdown">Resend code in {emailResendCountdown}s</span>
          ) : (
            <button type="button" className="auth-link-btn" onClick={handleResendEmailOtp}>
              Didn't receive code? Resend
            </button>
          )}
        </div>
      </Modal>
    </AuthLayout>
  );
};
