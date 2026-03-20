import type {
  AccessDecision,
  AuditLog,
  DeviceStatus,
  MfaVerification,
  Role,
  TokenResponse,
} from "@/lib/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

type JsonRecord = Record<string, unknown>;

type ValidationErrorItem = {
  loc?: Array<string | number>;
  msg?: string;
};

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as JsonRecord | null;

  if (!response.ok) {
    let detail = "Request failed";

    if (typeof payload?.detail === "string") {
      detail = payload.detail;
    } else if (Array.isArray(payload?.detail)) {
      const messages = (payload.detail as ValidationErrorItem[])
        .map((item) => {
          const path = Array.isArray(item.loc) ? item.loc.slice(1).join(".") : "field";
          return item.msg ? `${path}: ${item.msg}` : null;
        })
        .filter((value): value is string => Boolean(value));

      if (messages.length > 0) {
        detail = messages.join(" | ");
      }
    }

    throw new Error(detail);
  }

  return payload as T;
}

export function registerUser(username: string, password: string, role: Role) {
  return request<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

export function loginUser(username: string, password: string) {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function evaluateAccess(params: {
  token: string;
  endpoint: string;
  ipAddress?: string;
  deviceStatus: DeviceStatus;
  accessTime: string;
}) {
  return request<AccessDecision>("/access/resource", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      endpoint: params.endpoint,
      ip_address: params.ipAddress?.trim() ? params.ipAddress.trim() : null,
      device_status: params.deviceStatus,
      access_time: params.accessTime,
    }),
  });
}

export function getAuditLogs(token: string, limit = 100) {
  return request<AuditLog[]>(`/admin/audit-logs?limit=${limit}`, {
    method: "GET",
    token,
  });
}

export function verifyMfa(params: {
  token: string;
  challengeId: string;
  code: string;
  endpoint: string;
}) {
  return request<MfaVerification>("/access/mfa/verify", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      challenge_id: params.challengeId,
      code: params.code,
      endpoint: params.endpoint,
    }),
  });
}

