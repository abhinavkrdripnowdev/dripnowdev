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
  badgeIcon: string;
  accentColor: string;
  badgeBg: string;
  subtitle: string;
  path: string;
}

export const PORTAL_CONFIGS: Record<PortalRole, PortalConfig> = {
  customer: {
    roleKey: 'customer',
    title: 'Customer Storefront Sign In',
    badge: 'Customer Portal',
    badgeIcon: '🛒',
    accentColor: 'hsl(262, 83%, 58%)',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    subtitle: 'Sign in to browse products, track orders, and manage your account.',
    path: '/login',
  },
  shopkeeper: {
    roleKey: 'shopkeeper',
    title: 'Shopkeeper Merchant Sign In',
    badge: 'Shopkeeper Portal',
    badgeIcon: '🏪',
    accentColor: 'hsl(38, 92%, 50%)',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    subtitle: 'Sign in to manage your shop, list inventory, and fulfill customer orders.',
    path: '/login/shopkeeper',
  },
  delivery: {
    roleKey: 'delivery_partner',
    title: 'Delivery Partner Logistics Sign In',
    badge: 'Delivery Partner Portal',
    badgeIcon: '🚚',
    accentColor: 'hsl(172, 66%, 45%)',
    badgeBg: 'rgba(20, 184, 166, 0.15)',
    subtitle: 'Sign in to accept delivery dispatches and track active order drop-offs.',
    path: '/login/delivery',
  },
  admin: {
    roleKey: 'admin',
    title: 'Admin Operations Sign In',
    badge: 'Admin Operations Portal',
    badgeIcon: '🛡️',
    accentColor: 'hsl(217, 91%, 60%)',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    subtitle: 'Sign in to manage merchant onboardings, monitor operations, and view audit logs.',
    path: '/login/admin',
  },
  'super-admin': {
    roleKey: 'super_admin',
    title: 'Super Admin Master Control Sign In',
    badge: 'Super Admin Portal',
    badgeIcon: '⚡',
    accentColor: 'hsl(348, 83%, 58%)',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    subtitle: 'Sign in with master credentials to control system settings, roles, and security policies.',
    path: '/login/super-admin',
  },
};

type LoginMethod = 'email' | 'phone';
type PhoneStep = 'enter-phone' | 'enter-otp';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

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
    <AuthLayout>
      <div className="auth-header">
        <div
          className="portal-role-badge"
          style={{ background: config.badgeBg, color: config.accentColor, border: `1px solid ${config.accentColor}33` }}
        >
          <span>{config.badgeIcon}</span>
          <span>{config.badge}</span>
        </div>
        <h2 className="auth-title">{config.title}</h2>
        <p className="auth-subtitle">
          {config.subtitle}{' '}
          <Link to="/register" className="auth-link">Create an account</Link>
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
              Sign In to {config.badge}
            </Button>
          </form>

          {portalRole === 'customer' && (
            <>
              <div className="auth-divider"><span>or</span></div>
              <Button
                id="google-login-btn"
                variant="secondary"
                size="md"
                fullWidth
                leftIcon={<GoogleIcon />}
                type="button"
                onClick={() => window.location.href = '/api/auth/google/redirect'}
              >
                Continue with Google
              </Button>
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
            <div className="auth-icon-badge">📱</div>
            <h2 className="auth-title">Enter OTP</h2>
            <p className="auth-subtitle">
              Sent to <strong style={{ color: 'var(--color-text)' }}>{phone}</strong>
            </p>

            {otp && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: 6, color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                🔑 Local Dev OTP: <span style={{ letterSpacing: '2px', fontSize: '1.1rem', fontWeight: 800, color: '#ff9900' }}>{otp}</span>
              </div>
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
