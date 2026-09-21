export interface UserRecord {
  id: string;
  username: string | null;
  full_name: string;
  phone: string | null;
  phone_verified: boolean;
  email: string | null;
  email_verified: boolean;
  avatar_url: string | null;
  status: 'active' | 'suspended' | 'pending_verification';
  created_at: Date;
  updated_at: Date;
}

export interface RoleRecord {
  id: number;
  name: string;
  display_name: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  roles: string[];
  phone_verified: boolean;
  email_verified: boolean;
}

export interface RegisterPayload {
  username: string;
  full_name: string;
  phone: string;
  email: string;
  password: string;
  phone_token: string;
  email_token: string;
}

export interface LoginEmailPayload {
  email: string;
  password: string;
  required_role?: string;
}

export interface LoginPhonePayload {
  phone: string;
  required_role?: string;
}

export interface VerifyOtpPayload {
  phone: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}
