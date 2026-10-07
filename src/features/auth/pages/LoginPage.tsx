import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '@/components/layout/AuthLayout/AuthLayout';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { PasswordInput } from '@/components/ui/PasswordInput/PasswordInput';
import { OtpInput } from '@/components/ui/OtpInput/OtpInput';
import { GoogleSignIn } from '@/features/auth/components/GoogleSignIn';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import {
  loginEmailSchema,
  loginPhoneSchema,
  otpSchema,
} from '@/features/auth/schemas/auth.schemas';
import { getDefaultDashboard } from '@/features/auth/types/auth.types';
import type {
  LoginEmailFormValues,
  LoginPhoneFormValues,
} from '@/features/auth/schemas/auth.schemas';
import './RegisterPage.css';

export type PortalRole = 'customer' | 'shopkeeper' | 'delivery' | 'admin' | 'super-admin';

interface PortalConfig {
  roleKey: string;
  title: string;
  badge: string;
  subtitle: string;
  path: string;
}

export const PORTAL_CONFIGS: Record<PortalRole, PortalConfig> = {
  customer: {
    roleKey: 'customer',
    title: 'Welcome back',
    badge: 'Customer sign in',
    subtitle: 'Sign in to track orders, save favourites and check out faster.',
    path: '/login',
  },
  shopkeeper: {
    roleKey: 'shopkeeper',
    title: 'Seller sign in',
    badge: 'Seller portal',
    subtitle: 'Manage your catalogue, stock and incoming orders.',
    path: '/login/shopkeeper',
  },
  delivery: {
    roleKey: 'delivery_partner',
    title: 'Partner sign in',
    badge: 'Delivery partner portal',
    subtitle: 'Accept deliveries and follow each drop-off step by step.',
    path: '/login/delivery',
  },
  admin: {
    roleKey: 'admin',
    title: 'Admin sign in',
    badge: 'Operations portal',
    subtitle: 'Review sellers and riders, moderate products and monitor orders.',
    path: '/login/admin',
  },
  'super-admin': {
    roleKey: 'super_admin',
    title: 'Super admin sign in',
    badge: 'Platform portal',
    subtitle: 'Platform settings, access and security policy. Every action is logged.',
    path: '/login/super-admin',
  },
};

type LoginMethod = 'email' | 'phone';
type PhoneStep = 'enter-phone' | 'enter-otp';

export interface LoginPageProps {
  portalRole?: PortalRole;
}

export const LoginPage: React.FC<LoginPageProps> = ({ portalRole = 'customer' }) => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const config = PORTAL_CONFIGS[portalRole] ?? PORTAL_CONFIGS.customer;

  const [method, setMethod] = useState<LoginMethod>('email');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter-phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [globalError, setGlobalError] = useState('');

  // Email form
  const emailForm = useForm<LoginEmailFormValues>({
    resolver: zodResolver(loginEmailSchema),
    defaultValues: { email: '', password: '' },
  });

  // Phone form
  const phoneForm = useForm<LoginPhoneFormValues>({
    resolver: zodResolver(loginPhoneSchema),
    defaultValues: { phone: '+91' },
  });

  const startResendTimer = () => {
    setResendCountdown(30);
    const interval = setInterval(() => {
      setResendCountdown((c) => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; });
    }, 1000);
  };

  const onEmailLogin = emailForm.handleSubmit(async (data) => {
    setGlobalError('');
    try {
      const response = await authService.loginEmail({
        ...data,
        required_role: config.roleKey,
      });
      setAuth(response.user, response.accessToken);
      navigate(getDefaultDashboard(response.user.roles), { replace: true });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Login failed');
    }
  });

  const onPhoneSubmit = phoneForm.handleSubmit(async (data) => {
    setGlobalError('');
    try {
      const generatedOtp = await authService.loginPhone({ ...data, required_role: config.roleKey });
      if (generatedOtp) setOtp(generatedOtp);
      setPhone(data.phone);
      setPhoneStep('enter-otp');
      startResendTimer();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to send OTP');
    }
  });

  const handleVerifyOtp = async () => {
    const result = otpSchema.safeParse({ otp });
    if (!result.success) { setOtpError('Enter a valid 6-digit OTP'); return; }
    setOtpError('');
    setOtpLoading(true);
    try {
      const response = await authService.verifyPhoneOtp({ phone, otp });
      setAuth(response.user, response.accessToken);
      navigate(getDefaultDashboard(response.user.roles), { replace: true });
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    try {
      const generatedOtp = await authService.loginPhone({ phone, required_role: config.roleKey });
      if (generatedOtp) setOtp(generatedOtp);
      setOtpError('');
      startResendTimer();
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Failed to resend');
    }
  };

  const switchMethod = (m: LoginMethod) => {
    setMethod(m);
    setGlobalError('');
    setPhoneStep('enter-phone');
    setOtp('');
    setOtpError('');
  };

  return (
    <AuthLayout variant={portalRole === 'shopkeeper' ? 'seller' : portalRole}>
      <div className="auth-header">
        <span className="auth-eyebrow"><i />{config.badge}</span>
        <h2 className="auth-title">{config.title}</h2>
        <p className="auth-subtitle">
          {config.subtitle}{' '}
          {portalRole === 'customer' && <Link to="/register" className="auth-link">New here? Create an account</Link>}
        </p>
      </div>

      {/* Tab Switcher */}
      {!(method === 'phone' && phoneStep === 'enter-otp') && (
        <div className="auth-tabs" role="tablist" aria-label="Login method">
          <button
            id="login-tab-email"
            role="tab"
            aria-selected={method === 'email'}
            className={`auth-tab ${method === 'email' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMethod('email')}
            type="button"
          >
            Email + Password
          </button>
          <button
            id="login-tab-phone"
            role="tab"
            aria-selected={method === 'phone'}
            className={`auth-tab ${method === 'phone' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMethod('phone')}
            type="button"
          >
            Phone OTP
          </button>
        </div>
      )}

      {globalError && (
        <div className="auth-alert auth-alert--error animate-fade-in-down" role="alert">
          {globalError}
        </div>
      )}

      {/* ── Email + Password ─────────────────────────────────── */}
      {method === 'email' && (
        <div className="animate-fade-in">
          <form onSubmit={onEmailLogin} noValidate className="auth-form">
            <Input
              id="login-email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={emailForm.formState.errors.email?.message}
              {...emailForm.register('email')}
            />
            <div>
              <PasswordInput
                id="login-password"
                label="Password"
                placeholder="Your password"
                autoComplete="current-password"
                error={emailForm.formState.errors.password?.message}
                value={emailForm.watch('password')}
                {...emailForm.register('password')}
              />
              <div style={{ textAlign: 'right', marginTop: '6px' }}>
                <Link to="/forgot-password" className="auth-link" style={{ fontSize: 'var(--text-sm)' }}>
                  Forgot password?
                </Link>
              </div>
            </div>
            <Button
              id="email-login-btn"
              type="submit"
              variant="gradient"
              size="lg"
              fullWidth
              isLoading={emailForm.formState.isSubmitting}
            >
              Sign in
            </Button>
          </form>

          {portalRole === 'customer' && (
            <>
              <GoogleSignIn onError={setGlobalError} />
            </>
          )}
        </div>
      )}

      {/* ── Phone OTP — Enter Phone ───────────────────────────── */}
      {method === 'phone' && phoneStep === 'enter-phone' && (
        <div className="animate-fade-in">
          <form onSubmit={onPhoneSubmit} noValidate className="auth-form">
            <Input
              id="login-phone"
              label="Phone number"
              type="tel"
              placeholder="+919876543210"
              autoComplete="tel"
              error={phoneForm.formState.errors.phone?.message}
              hint="Include country code (e.g. +91)"
              {...phoneForm.register('phone')}
            />
            <Button
              id="phone-login-btn"
              type="submit"
              variant="gradient"
              size="lg"
              fullWidth
              isLoading={phoneForm.formState.isSubmitting}
            >
              Send OTP
            </Button>
          </form>
        </div>
      )}

      {/* ── Phone OTP — Enter OTP ─────────────────────────────── */}
      {method === 'phone' && phoneStep === 'enter-otp' && (
        <div className="animate-slide-in-right">
          <button className="auth-back-btn" onClick={() => setPhoneStep('enter-phone')} type="button">
            ← Back
          </button>
          <div className="auth-header">
            <span className="auth-eyebrow"><i />Verification</span>
            <h2 className="auth-title">Enter OTP</h2>
            <p className="auth-subtitle">
              Sent to <strong style={{ color: 'var(--color-text)' }}>{phone}</strong>
            </p>

            {otp && (
              <div className="auth-devotp">Local dev OTP: <b>{otp}</b></div>
            )}
          </div>

          <div className="otp-container">
            <OtpInput
              id="login-otp"
              value={otp}
              onChange={(v) => { setOtp(v); setOtpError(''); }}
              error={!!otpError}
              disabled={otpLoading}
              length={6}
            />
            {otpError && <p className="otp-error-msg animate-fade-in-down" role="alert">{otpError}</p>}
          </div>

          <Button
            id="otp-login-verify-btn"
            variant="gradient"
            size="lg"
            fullWidth
            isLoading={otpLoading}
            disabled={otp.length < 6}
            onClick={handleVerifyOtp}
            type="button"
          >
            Verify OTP &amp; Sign In
          </Button>

          <div className="otp-resend">
            {resendCountdown > 0 ? (
              <p className="otp-resend__countdown">Resend in {resendCountdown}s</p>
            ) : (
              <button type="button" className="auth-link-btn" onClick={handleResendOtp}>
                Resend OTP
              </button>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
};
