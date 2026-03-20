export type AuthMode = "register" | "login";

export type Role = "user" | "admin";

export type DeviceStatus = "trusted" | "untrusted";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AccessDecision {
  decision: "ALLOW" | "MFA_REQUIRED" | "DENY";
  risk_score: number;
  reason: string;
  message: string;
  challenge_id?: string | null;
  challenge_expires_at?: string | null;
  debug_mfa_code?: string | null;
}

export interface MfaVerification {
  decision: "ALLOW" | "DENY";
  message: string;
  reason: string;
}

export interface AuditLog {
  id: number;
  username: string;
  endpoint: string;
  ip_address: string;
  device_status: DeviceStatus;
  access_time: string;
  risk_score: number;
  decision: "ALLOW" | "MFA_REQUIRED" | "DENY";
  reason: string;
  created_at: string;
}

