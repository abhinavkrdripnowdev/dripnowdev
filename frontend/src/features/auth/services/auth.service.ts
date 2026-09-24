import api from '@/lib/api';
import type {
  RegisterInput,
  LoginEmailInput,
  LoginPhoneInput,
  VerifyOtpInput,
  VerifyRegistrationOtpsInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  LoginResponse,
  ApiResponse,
} from '../types/auth.types';
import type { AxiosError } from 'axios';

function extractError(error: unknown): string {
  const axiosError = error as AxiosError<ApiResponse>;
  return axiosError.response?.data?.message ?? 'An unexpected error occurred';
}

export const authService = {
  async sendPreRegPhoneOtp(phone: string): Promise<string | undefined> {
    try {
      const res = await api.post<ApiResponse<{ otp?: string }>>('/auth/register/send-phone-otp', { phone });
      return res.data.data?.otp;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async verifyPreRegPhoneOtp(phone: string, otp: string): Promise<string> {
    try {
      const res = await api.post<ApiResponse<{ verificationToken: string }>>('/auth/register/verify-phone-otp', { phone, otp });
      return res.data.data!.verificationToken;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async sendPreRegEmailOtp(email: string): Promise<string | undefined> {
    try {
      const res = await api.post<ApiResponse<{ otp?: string }>>('/auth/register/send-email-otp', { email });
      return res.data.data?.otp;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async verifyPreRegEmailOtp(email: string, otp: string): Promise<string> {
    try {
      const res = await api.post<ApiResponse<{ verificationToken: string }>>('/auth/register/verify-email-otp', { email, otp });
      return res.data.data!.verificationToken;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async checkUsername(username: string): Promise<boolean> {
    try {
      const res = await api.post<ApiResponse<{ available: boolean }>>('/auth/check-username', { username });
      return res.data.data?.available ?? false;
    } catch {
      return false;
    }
  },

  async register(data: RegisterInput): Promise<LoginResponse> {
    try {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/register', data);
      return res.data.data!;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async verifyRegistrationOtps(data: VerifyRegistrationOtpsInput): Promise<LoginResponse> {
    try {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/register/verify', data);
      return res.data.data!;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async resendEmailOtp(email: string): Promise<void> {
    try {
      await api.post('/auth/register/resend-email-otp', { email });
    } catch (err) { throw new Error(extractError(err)); }
  },

  async verifyPhoneOtp(data: VerifyOtpInput): Promise<LoginResponse> {
    try {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/verify-phone-otp', data);
      return res.data.data!;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async resendPhoneOtp(phone: string): Promise<void> {
    try {
      await api.post('/auth/resend-phone-otp', { phone });
    } catch (err) { throw new Error(extractError(err)); }
  },

  async loginPhone(data: LoginPhoneInput): Promise<string | undefined> {
    try {
      const res = await api.post<ApiResponse<{ otp?: string }>>('/auth/login/phone', data);
      return res.data.data?.otp;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async loginEmail(data: LoginEmailInput): Promise<LoginResponse> {
    try {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/login/email', data);
      return res.data.data!;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async loginGoogle(idToken: string): Promise<LoginResponse> {
    try {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/google', { id_token: idToken });
      return res.data.data!;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async forgotPassword(data: ForgotPasswordInput): Promise<void> {
    try {
      await api.post('/auth/forgot-password/send-otp', data);
    } catch (err) { throw new Error(extractError(err)); }
  },

  async sendForgotPasswordOtp(email: string): Promise<void> {
    try {
      await api.post('/auth/forgot-password/send-otp', { email });
    } catch (err) { throw new Error(extractError(err)); }
  },

  async verifyForgotPasswordOtp(email: string, otp: string): Promise<string> {
    try {
      const res = await api.post<ApiResponse<{ resetToken: string }>>('/auth/forgot-password/verify-otp', { email, otp });
      return res.data.data!.resetToken;
    } catch (err) { throw new Error(extractError(err)); }
  },

  async resetPasswordWithToken(data: { email: string; reset_token: string; new_password: string; confirm_password: string }): Promise<void> {
    try {
      await api.post('/auth/forgot-password/reset', data);
    } catch (err) { throw new Error(extractError(err)); }
  },

  async resetPassword(data: ResetPasswordInput): Promise<void> {
    try {
      await api.post('/auth/reset-password', data);
    } catch (err) { throw new Error(extractError(err)); }
  },

  async verifyEmail(token: string): Promise<void> {
    try {
      await api.post('/auth/verify-email', { token });
    } catch (err) { throw new Error(extractError(err)); }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch { /* Ignore logout errors */ }
  },

  async refreshToken(): Promise<string> {
    const res = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
    return res.data.data!.accessToken;
  },

  async getMe(): Promise<LoginResponse['user']> {
    try {
      const res = await api.get<ApiResponse<LoginResponse['user']>>('/auth/me');
      return res.data.data!;
    } catch (err) { throw new Error(extractError(err)); }
  },
};
