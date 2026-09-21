import { db } from '../config/database';

export type AuditAction =
  | 'register_initiated'
  | 'register_completed_verified'
  | 'phone_otp_sent'
  | 'phone_otp_verified'
  | 'email_otp_sent'
  | 'email_verification_sent'
  | 'email_verified'
  | 'login_success_phone'
  | 'login_success_email'
  | 'login_success_google'
  | 'login_failed_email'
  | 'login_failed_otp'
  | 'account_locked'
  | 'logout'
  | 'logout_all'
  | 'token_refreshed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'google_account_linked';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db('audit_logs').insert({
      user_id: entry.userId ?? null,
      action: entry.action,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  } catch (error) {
    // Audit logging should never break the main flow
    console.error('[AuditLog Error]', error);
  }
}
