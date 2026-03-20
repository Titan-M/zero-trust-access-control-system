"use client";

import { useEffect, useMemo, useState } from "react";

import { evaluateAccess, getAuditLogs, loginUser, registerUser, verifyMfa } from "@/lib/api";
import type { AccessDecision, AuditLog, AuthMode, DeviceStatus, Role } from "@/lib/types";

function getLocalTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

type Status = {
  kind: "ok" | "error";
  text: string;
};

function decodeRoleFromToken(token: string): Role | null {
  const segments = token.split(".");
  if (segments.length < 2) {
    return null;
  }

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    const payload = JSON.parse(window.atob(padded)) as { role?: string };
    if (payload.role === "admin" || payload.role === "user") {
      return payload.role;
    }
    return null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [mode, setMode] = useState<AuthMode>("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");

  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status | null>(null);

  const [endpoint, setEndpoint] = useState("/access/resource");
  const [ipAddress, setIpAddress] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("trusted");
  const [accessTime, setAccessTime] = useState(getLocalTime());

  const [decision, setDecision] = useState<AccessDecision | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaExpiresAt, setMfaExpiresAt] = useState<string | null>(null);

  const [authLoading, setAuthLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);

  const currentRole = useMemo(() => (token ? decodeRoleFromToken(token) : null), [token]);

  useEffect(() => {
    const saved = window.localStorage.getItem("ztac_access_token");
    if (saved) {
      setToken(saved);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      window.localStorage.removeItem("ztac_access_token");
      return;
    }
    window.localStorage.setItem("ztac_access_token", token);
  }, [token]);

  useEffect(() => {
    if (token && currentRole === "admin") {
      void refreshLogs();
      return;
    }

    if (currentRole !== "admin") {
      setLogs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentRole]);

  async function handleAuthenticate() {
    setAuthLoading(true);
    setStatus(null);

    try {
      const result =
        mode === "register"
          ? await registerUser(username, password, role)
          : await loginUser(username, password);

      setToken(result.access_token);
      setStatus({
        kind: "ok",
        text:
          mode === "register"
            ? "Registration successful. Token issued."
            : "Login successful. Token refreshed.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "Authentication failed",
      });
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleEvaluate() {
    if (!token) {
      setStatus({ kind: "error", text: "Authenticate first before evaluating access." });
      return;
    }

    setAccessLoading(true);
    setStatus(null);

    try {
      const result = await evaluateAccess({
        token,
        endpoint,
        ipAddress,
        deviceStatus,
        accessTime,
      });
      setDecision(result);
      if (result.decision === "MFA_REQUIRED" && result.challenge_id) {
        setMfaChallengeId(result.challenge_id);
        setMfaExpiresAt(result.challenge_expires_at ?? null);
      } else {
        setMfaChallengeId("");
        setMfaExpiresAt(null);
        setMfaCode("");
      }
      setStatus({ kind: "ok", text: "Access evaluated and audit log recorded." });
      await refreshLogs();
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "Access evaluation failed",
      });
    } finally {
      setAccessLoading(false);
    }
  }

  async function handleVerifyMfa() {
    if (!token || !mfaChallengeId) {
      setStatus({ kind: "error", text: "Request access first to create an MFA challenge." });
      return;
    }

    if (!/^\d{6}$/.test(mfaCode)) {
      setStatus({ kind: "error", text: "MFA code must be exactly 6 digits." });
      return;
    }

    setMfaLoading(true);
    setStatus(null);

    try {
      const result = await verifyMfa({
        token,
        challengeId: mfaChallengeId,
        code: mfaCode,
        endpoint,
      });

      setStatus({
        kind: result.decision === "ALLOW" ? "ok" : "error",
        text: `${result.message} (${result.reason})`,
      });

      if (result.decision === "ALLOW") {
        setDecision((prev) =>
          prev
            ? {
                ...prev,
                decision: "ALLOW",
                message: "MFA verification successful. Access granted.",
                reason: "Additional verification passed",
              }
            : prev
        );
        setMfaChallengeId("");
        setMfaCode("");
        setMfaExpiresAt(null);
      }

      await refreshLogs();
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "MFA verification failed",
      });
    } finally {
      setMfaLoading(false);
    }
  }

  async function refreshLogs() {
    if (!token) {
      return;
    }

    if (currentRole !== "admin") {
      setLogs([]);
      return;
    }

    setLogsLoading(true);
    try {
      const result = await getAuditLogs(token, 100);
      setLogs(result);
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to fetch logs",
      });
    } finally {
      setLogsLoading(false);
    }
  }

  function applyPreset(type: "safe" | "suspicious" | "critical") {
    if (type === "safe") {
      setIpAddress("10.0.0.24");
      setDeviceStatus("trusted");
      setAccessTime("10:30");
      return;
    }

    if (type === "suspicious") {
      setIpAddress("103.25.67.12");
      setDeviceStatus("untrusted");
      setAccessTime("22:45");
      return;
    }

    setIpAddress("8.8.8.8");
    setDeviceStatus("untrusted");
    setAccessTime("02:15");
    setRole("admin");
  }

  const decisionClass =
    decision?.decision === "DENY"
      ? "deny"
      : decision?.decision === "MFA_REQUIRED"
        ? "mfa"
        : "allow";

  const riskClass =
    (decision?.risk_score ?? 0) >= 70 ? "danger" : (decision?.risk_score ?? 0) >= 35 ? "warn" : "safe";

  const stats = useMemo(() => {
    const total = logs.length;
    const denied = logs.filter((item) => item.decision === "DENY").length;
    const challenged = logs.filter((item) => item.decision === "MFA_REQUIRED").length;
    const highRisk = logs.filter((item) => item.risk_score >= 70).length;
    return { total, denied, challenged, highRisk };
  }, [logs]);

  const alerts = useMemo(
    () => logs.filter((item) => item.risk_score >= 35).slice(0, 4),
    [logs]
  );

  const isAuthenticated = Boolean(token);

  return (
    <main>
      <section className="card hero reveal">
        <h1 className="hero-title">Zero-Trust Security Console</h1>
        <p className="hero-sub">
          Use this in three steps: authenticate, simulate request context, then inspect the decision.
        </p>
        <div className="guide" style={{ marginTop: "0.8rem" }}>
          <span className="pill">1. Register/Login</span>
          <span className="pill">2. Evaluate Access</span>
          <span className="pill">3. Verify MFA if prompted</span>
        </div>
        {status && <div className={`status ${status.kind}`}>{status.text}</div>}
      </section>

      <section className="grid cols-2" style={{ marginTop: "1rem" }}>
        <article className="card reveal delay-1">
          <div className="panel-head">
            <h2>
              <span className="step-badge">Step 1</span> Authenticate
            </h2>
            <span className="muted">Get access token</span>
          </div>

          <div className="mode-switch">
            <button
              className={`secondary ${mode === "register" ? "active" : ""}`}
              type="button"
              onClick={() => setMode("register")}
            >
              Register
            </button>
            <button
              className={`secondary ${mode === "login" ? "active" : ""}`}
              type="button"
              onClick={() => setMode("login")}
            >
              Login
            </button>
          </div>

          <div className="grid cols-2">
            <div>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="security_analyst"
              />
              <p className="muted" style={{ marginTop: "0.35rem" }}>
                3-64 chars, letters/numbers with optional _ or -
              </p>
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 10 characters"
              />
              <p className="muted" style={{ marginTop: "0.35rem" }}>
                Minimum 10 characters required
              </p>
            </div>
          </div>

          <div style={{ marginTop: "0.75rem" }}>
            <label htmlFor="role">Role</label>
            <select id="role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <p className="muted" style={{ marginTop: "0.4rem" }}>
            Choose role only for register. Login ignores role.
          </p>

          <div style={{ display: "flex", gap: "0.55rem", marginTop: "0.85rem" }}>
            <button className="primary" type="button" disabled={authLoading} onClick={handleAuthenticate}>
              {authLoading ? "Processing..." : mode === "register" ? "Create Identity" : "Sign In"}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setToken("");
                setDecision(null);
                setMfaChallengeId("");
                setMfaCode("");
                setMfaExpiresAt(null);
              }}
            >
              Clear Token
            </button>
          </div>
        </article>

        <article className="card reveal delay-2">
          <div className="panel-head">
            <h2>Session</h2>
            <span className="muted">Current identity</span>
          </div>

          <div className={`status ${isAuthenticated ? "ok" : "error"}`}>
            {isAuthenticated ? "Authenticated. You can now evaluate access." : "Not authenticated yet."}
          </div>

          <p className="muted" style={{ marginTop: "0.65rem" }}>
            Session role: {currentRole ?? "unknown"}
          </p>

          <p className="muted" style={{ marginTop: "0.5rem", marginBottom: "0.35rem" }}>
            Active token
          </p>
          <div className="token-box">{token ? token : "No token available. Authenticate to start."}</div>

          <div className="stat-grid" style={{ marginTop: "0.95rem" }}>
            <div className="stat">
              <div className="label">Total Attempts</div>
              <div className="value">{stats.total}</div>
            </div>
            <div className="stat">
              <div className="label">MFA Challenges</div>
              <div className="value">{stats.challenged}</div>
            </div>
            <div className="stat">
              <div className="label">Denied</div>
              <div className="value">{stats.denied}</div>
            </div>
            <div className="stat">
              <div className="label">High Risk</div>
              <div className="value">{stats.highRisk}</div>
            </div>
          </div>

          <div style={{ marginTop: "0.9rem" }}>
            <div className="panel-head" style={{ marginBottom: "0.45rem" }}>
              <h3>Alert Feed</h3>
              <button className="secondary" type="button" onClick={() => void refreshLogs()} disabled={logsLoading}>
                {logsLoading ? "Refreshing..." : "Refresh Logs"}
              </button>
            </div>
            <div className="pill-row">
              {alerts.length === 0 && <span className="pill">No suspicious activity detected</span>}
              {alerts.map((item) => (
                <span
                  className={`pill ${item.decision === "DENY" ? "danger" : "warn"}`}
                  key={`${item.id}-${item.created_at}`}
                >
                  {item.username} • {item.decision} • {item.risk_score}
                </span>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="grid cols-2" style={{ marginTop: "1rem" }}>
        <article className="card reveal delay-2">
          <div className="panel-head">
            <h2>
              <span className="step-badge">Step 2</span> Simulate Request Context
            </h2>
            <span className="muted">Risk inputs</span>
          </div>

          <p className="muted" style={{ marginBottom: "0.65rem" }}>
            Pick a preset first, then evaluate access.
          </p>

          <div className="pill-row" style={{ marginBottom: "0.65rem" }}>
            <button className="ghost" type="button" onClick={() => applyPreset("safe")}>
              Office Normal
            </button>
            <button className="ghost" type="button" onClick={() => applyPreset("suspicious")}>
              Suspicious Remote
            </button>
            <button className="ghost" type="button" onClick={() => applyPreset("critical")}>
              Critical Admin Risk
            </button>
          </div>

          <div className="grid cols-2">
            <div>
              <label htmlFor="endpoint">Endpoint</label>
              <input
                id="endpoint"
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
                placeholder="/access/resource"
              />
            </div>
            <div>
              <label htmlFor="ipAddress">IP Address</label>
              <input
                id="ipAddress"
                value={ipAddress}
                onChange={(event) => setIpAddress(event.target.value)}
                placeholder="10.0.0.24"
              />
            </div>
            <div>
              <label htmlFor="deviceStatus">Device Status</label>
              <select
                id="deviceStatus"
                value={deviceStatus}
                onChange={(event) => setDeviceStatus(event.target.value as DeviceStatus)}
              >
                <option value="trusted">trusted</option>
                <option value="untrusted">untrusted</option>
              </select>
            </div>
            <div>
              <label htmlFor="accessTime">Access Time (HH:MM)</label>
              <input
                id="accessTime"
                value={accessTime}
                onChange={(event) => setAccessTime(event.target.value)}
                placeholder="12:00"
              />
            </div>
          </div>

          <button
            className="primary"
            style={{ marginTop: "0.9rem" }}
            type="button"
            disabled={accessLoading}
            onClick={handleEvaluate}
          >
            {accessLoading ? "Evaluating..." : "Evaluate Access Request"}
          </button>
        </article>

        <article className="card reveal delay-3">
          <div className="panel-head">
            <h2>
              <span className="step-badge">Step 3</span> Decision Output
            </h2>
            <span className="muted">Policy result</span>
          </div>

          {!decision && (
            <p className="muted">Run Step 2 to see risk score, reason, and final decision.</p>
          )}

          {decision && (
            <>
              <div className={`decision ${decisionClass}`}>{decision.decision}</div>
              <div className="risk-wrap">
                <p className="muted">Risk score: {decision.risk_score.toFixed(1)} / 100</p>
                <div className="risk-bar">
                  <div className={`risk-fill ${riskClass}`} style={{ width: `${decision.risk_score}%` }} />
                </div>
              </div>
              <p style={{ marginTop: "0.8rem", lineHeight: 1.5 }}>
                <strong>Reason:</strong> {decision.reason}
              </p>
              <p style={{ marginTop: "0.45rem", color: "#1f3a56" }}>{decision.message}</p>

              {decision.decision === "MFA_REQUIRED" && mfaChallengeId && (
                <div style={{ marginTop: "0.9rem" }}>
                  <label htmlFor="mfaCode">MFA Code</label>
                  <input
                    id="mfaCode"
                    inputMode="numeric"
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                  />
                  {mfaExpiresAt && (
                    <p className="muted" style={{ marginTop: "0.45rem" }}>
                      Challenge expires: {new Date(mfaExpiresAt).toLocaleString()}
                    </p>
                  )}
                  {decision.debug_mfa_code && (
                    <p className="muted" style={{ marginTop: "0.45rem" }}>
                      Dev MFA code: {decision.debug_mfa_code}
                    </p>
                  )}
                  <button
                    className="primary"
                    type="button"
                    style={{ marginTop: "0.7rem" }}
                    disabled={mfaLoading}
                    onClick={handleVerifyMfa}
                  >
                    {mfaLoading ? "Verifying..." : "Verify MFA"}
                  </button>
                </div>
              )}
            </>
          )}
        </article>
      </section>

      <section className="card reveal delay-3" style={{ marginTop: "1rem" }}>
        <div className="panel-head">
          <h2>Audit Trail</h2>
          <span className="muted">Last 100 events</span>
        </div>

        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          Optional advanced panel. Use this after you understand the main 3-step flow.
        </p>

        <details>
          <summary>Show Audit Logs</summary>
          <div className="log-shell" style={{ marginTop: "0.75rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Decision</th>
                  <th>Risk</th>
                  <th>IP</th>
                  <th>Device</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {currentRole === "admin" && logs.length === 0 && (
                  <tr>
                    <td colSpan={7}>No audit events yet.</td>
                  </tr>
                )}
                {currentRole !== "admin" && (
                  <tr>
                    <td colSpan={7}>Admin role required to view audit logs.</td>
                  </tr>
                )}
                {logs.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                    <td>{item.username}</td>
                    <td>{item.decision}</td>
                    <td>{item.risk_score.toFixed(1)}</td>
                    <td>{item.ip_address}</td>
                    <td>{item.device_status}</td>
                    <td>{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </main>
  );
}

