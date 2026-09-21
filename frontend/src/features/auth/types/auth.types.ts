export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface AuthenticatedUser {
  id: string;
  username: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: 'active' | 'suspended' | 'pending_verification';
  roles: string[];
  phone_verified: boolean;
  email_verified: boolean;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  accessToken: string;
}

// ─── Input Types (match backend Zod schemas) ──────────────────────────────────

export interface RegisterInput {
  username: string;
  full_name: string;
  phone: string;
  email: string;
  password: string;
  phone_token: string;
  email_token: string;
}

export interface VerifyRegistrationOtpsInput {
  phone: string;
  phone_otp: string;
  email: string;
  email_otp: string;
}

export interface LoginEmailInput {
  email: string;
  password: string;
}

export interface LoginPhoneInput {
  phone: string;
}

export interface VerifyOtpInput {
  phone: string;
  otp: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  new_password: string;
  confirm_password: string;
}

// ─── Role constants ────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'seller' | 'delivery_partner' | 'manager' | 'super_admin';

export const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  customer: '/dashboard',
  seller: '/seller/dashboard',
  delivery_partner: '/delivery/dashboard',
  manager: '/manager/dashboard',
  super_admin: '/admin/dashboard',
};

export function getDefaultDashboard(roles: string[]): string {
  // Highest privilege first
  const priority: UserRole[] = ['super_admin', 'manager', 'seller', 'delivery_partner', 'customer'];
  for (const role of priority) {
    if (roles.includes(role)) return ROLE_DASHBOARD_MAP[role];
  }
  return '/dashboard';
}
