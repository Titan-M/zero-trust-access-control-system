"use client";

import { useEffect, useState } from "react";
import { evaluateAccess, getAuditLogs, loginUser, registerUser, verifyMfa } from "@/lib/api";
import type { AccessDecision, AuditLog, AuthMode, DeviceStatus, Role } from "@/lib/types";

function getLocalTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

type Status = { kind: "ok" | "error"; text: string } | null;

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Auth State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>(null);

  // Context State
  const [endpoint, setEndpoint] = useState("/access/resource");
  const [ipAddress, setIpAddress] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("trusted");
  const [accessTime, setAccessTime] = useState(getLocalTime());

  // Decision State
  const [decision, setDecision] = useState<AccessDecision | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  // Audit State
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("ztac_access_token");
    if (saved) setToken(saved);
  }, []);

  const handleAuth = async (mode: AuthMode) => {
    setLoading(true);
    setStatus(null);
    try {
      const result = mode === "register"
        ? await registerUser(username, password, "admin")
        : await loginUser(username, password);
      setToken(result.access_token);
      window.localStorage.setItem("ztac_access_token", result.access_token);
      setStatus({ kind: "ok", text: "Authentication successful!" });
      setTimeout(() => {
        setStatus(null);
        setStep(2);
      }, 1000);
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Auth failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await evaluateAccess({ token, endpoint, ipAddress, deviceStatus, accessTime });
      setDecision(res);
      if (res.decision === "MFA_REQUIRED" && res.challenge_id) {
        setMfaChallengeId(res.challenge_id);
      }
      setStep(3);
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Evaluation failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await verifyMfa({ token, challengeId: mfaChallengeId, code: mfaCode, endpoint });
      if (res.decision === "ALLOW") {
        setDecision(prev => prev ? { ...prev, decision: "ALLOW", message: res.message, reason: res.reason } : null);
        setStatus({ kind: "ok", text: "MFA Verified!" });
      } else {
        setStatus({ kind: "error", text: "Invalid MFA Code." });
      }
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "MFA Failed" });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs(token, 10);
      setLogs(res);
      setStep(4);
    } catch {
      setStatus({ kind: "error", text: "Failed to load audit logs. Are you an admin?" });
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (type: "safe" | "suspicious" | "critical") => {
    if (type === "safe") { setIpAddress("10.0.0.24"); setDeviceStatus("trusted"); setAccessTime("10:30"); }
    else if (type === "suspicious") { setIpAddress("103.25.67.12"); setDeviceStatus("untrusted"); setAccessTime("22:45"); }
    else { setIpAddress("8.8.8.8"); setDeviceStatus("untrusted"); setAccessTime("02:15"); }
  };

  const riskClass = (decision?.risk_score ?? 0) >= 70 ? "danger" : (decision?.risk_score ?? 0) >= 35 ? "warn" : "safe";

  return (
    <main>
      <div className="wizard-card">
        <div className="stepper">
          <div className={`step ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>
            <div className="step-circle">1</div>
            <div className="step-label">Identity</div>
          </div>
          <div className={`step ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>
            <div className="step-circle">2</div>
            <div className="step-label">Context</div>
          </div>
          <div className={`step ${step >= 3 ? "active" : ""} ${step > 3 ? "completed" : ""}`}>
            <div className="step-circle">3</div>
            <div className="step-label">Decision</div>
          </div>
          <div className={`step ${step >= 4 ? "active" : ""} ${step > 4 ? "completed" : ""}`}>
            <div className="step-circle">4</div>
            <div className="step-label">Audit</div>
          </div>
        </div>

        {status && <div className={`status-msg ${status.kind}`}>{status.text}</div>}

        {step === 1 && (
          <div className="step-content">
            <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Establish Identity</h2>
            <div className="form-group">
              <label>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin_user" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 10 chars" />
            </div>
            <div className="btn-row">
              <button className="secondary" disabled={loading} onClick={() => handleAuth("register")}>Register</button>
              <button className="primary" disabled={loading} onClick={() => handleAuth("login")}>Authenticate</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h2 style={{ marginBottom: "1rem", textAlign: "center" }}>Simulate Request Context</h2>
            <div className="presets">
              <button className="preset-btn" onClick={() => applyPreset("safe")}>Normal Office</button>
              <button className="preset-btn" onClick={() => applyPreset("suspicious")}>Remote Untrusted</button>
              <button className="preset-btn" onClick={() => applyPreset("critical")}>Critical Alert</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Target Endpoint</label>
                <input value={endpoint} onChange={e => setEndpoint(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Source IP Prefix</label>
                <input value={ipAddress} onChange={e => setIpAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Device Trust</label>
                <select value={deviceStatus} onChange={e => setDeviceStatus(e.target.value as DeviceStatus)}>
                  <option value="trusted">Trusted Corporate Device</option>
                  <option value="untrusted">Untrusted / BYOD</option>
                </select>
              </div>
              <div className="form-group">
                <label>Access Time</label>
                <input value={accessTime} onChange={e => setAccessTime(e.target.value)} />
              </div>
            </div>
            <div className="btn-row">
              <button className="secondary" onClick={() => setStep(1)}>Back</button>
              <button className="primary" onClick={handleEvaluate} disabled={loading}>Engage Rule Engine</button>
            </div>
          </div>
        )}

        {step === 3 && decision && (
          <div className="step-content">
            <h2 style={{ marginBottom: "1rem", textAlign: "center" }}>Policy Encounter Output</h2>
            
            <div className="decision-box">
              <div className={`decision-badge ${decision.decision}`}>{decision.decision}</div>
              <div className="risk-gauge">
                <div className={`risk-fill ${riskClass}`} style={{ width: `${decision.risk_score}%` }}></div>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                Risk Score: <strong>{decision.risk_score.toFixed(1)}/100</strong>
              </p>
              <p style={{ marginTop: "1rem", fontSize: "0.95rem" }}>{decision.reason}</p>
            </div>

            {decision.decision === "MFA_REQUIRED" && (
              <div className="form-group" style={{ textAlign: "center", width: "60%", margin: "0 auto" }}>
                <label>MFA Challenge Triggered</label>
                <input 
                  value={mfaCode} 
                  onChange={e => setMfaCode(e.target.value)} 
                  placeholder="Enter 6-digit code" 
                  style={{ textAlign: "center", letterSpacing: "0.2em", fontSize: "1.2rem" }} 
                />
                {decision.debug_mfa_code && <p style={{ color: "var(--neon-blue)", fontSize: "0.8rem", marginTop: "0.5rem" }}>Hint: {decision.debug_mfa_code}</p>}
                <button className="primary full-width" style={{ marginTop: "1rem" }} onClick={handleMfa} disabled={loading}>Verify Challenge</button>
              </div>
            )}

            <div className="btn-row" style={{ marginTop: "2rem" }}>
              <button className="secondary" onClick={() => setStep(2)}>Retry Context</button>
              <button className="primary" onClick={loadAuditLogs} disabled={loading}>View Audit Trail</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-content">
            <h2 style={{ marginBottom: "1rem", textAlign: "center" }}>Access Audit Log</h2>
            <div className="log-shell">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Decision</th>
                    <th>Risk</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.access_time}</td>
                      <td><strong style={{ color: log.decision === "ALLOW" ? "var(--success)" : log.decision === "DENY" ? "var(--danger)" : "var(--warn)" }}>{log.decision}</strong></td>
                      <td>{log.risk_score.toFixed(0)}</td>
                      <td>{log.ip_address}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>No logs found.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="btn-row" style={{ marginTop: "2rem" }}>
              <button className="secondary" onClick={() => setStep(2)}>Run Another Test</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
