import { db } from '../config/database';

export type SecuritySeverity = 'info' | 'warning' | 'critical';

export type SecurityEventType =
  | 'unauthorized_admin_registration_attempt'
  | 'role_escalation_attempt'
  | 'account_locked'
  | 'login_failed_burst'
  | 'invalid_token_attempt'
  | 'unauthorized_access_attempt'
  | 'suspicious_activity';

export interface SecurityEventEntry {
  userId?: string;
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export async function createSecurityEvent(entry: SecurityEventEntry): Promise<void> {
  try {
    await db('security_events').insert({
      user_id: entry.userId ?? null,
      event_type: entry.eventType,
      severity: entry.severity ?? 'info',
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      details: entry.details ? JSON.stringify(entry.details) : null,
    });
  } catch (error) {
    // Security event logging should be fail-safe
    console.error('[SecurityEvent Error]', error);
  }
}
