"use client";

import { useEffect, useState } from "react";
import { useAudit, useUsers, useWeights } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default function DashboardOverview() {
  const { logs, loading: logsLoading, fetchLogs } = useAudit();
  const { users, loading: usersLoading, fetchUsers } = useUsers();
  const [metrics, setMetrics] = useState({ allowed: 0, denied: 0, mfa: 0, avgRisk: 0 });

  const { weights, fetchWeights, saveWeights } = useWeights();

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    fetchWeights();
    
    // Auto-refresh logs every 3 seconds for live monitoring
    const interval = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchLogs, fetchUsers, fetchWeights]);

  const handleWeightChange = (key: string, val: number) => {
    if (weights) {
      saveWeights({ ...weights, [key]: val });
    }
  };

  useEffect(() => {
    if (logs.length > 0) {
      let allowed = 0, denied = 0, mfa = 0, totalRisk = 0;
      logs.forEach(log => {
        if (log.decision === 'ALLOW') allowed++;
        else if (log.decision === 'DENY') denied++;
        else if (log.decision === 'MFA_REQUIRED') mfa++;
        totalRisk += log.risk_score;
      });
      setMetrics({
        allowed, denied, mfa, avgRisk: totalRisk / logs.length
      });
    }
  }, [logs]);

  return (
    <div className="dashboard-overview fade-in">
      <div className="metrics-grid">
        <Card className="metric-card">
          <div className="metric-title">Total Requests</div>
          <div className="metric-val">{logs.length}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-title">Allowed</div>
          <div className="metric-val success">{metrics.allowed}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-title">Denied</div>
          <div className="metric-val danger">{metrics.denied}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-title">MFA Challenges</div>
          <div className="metric-val warn">{metrics.mfa}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-title">Average Risk Score</div>
          <div className="metric-val">
            <span className={metrics.avgRisk > 50 ? 'danger-text' : 'success-text'}>
              {metrics.avgRisk.toFixed(1)}
            </span>
          </div>
        </Card>
      </div>

      <div className="two-col-layout" style={{ marginTop: '2rem' }}>
        <div className="col">
          <Card>
            <div className="header-row">
              <h3>Algorithm Activity Logs</h3>
              <Link href="/audit" className="link-btn">View All</Link>
            </div>
            <p className="sub-text" style={{ marginBottom: "1rem" }}>
              Live evaluation of the Contextual Risk Scoring Algorithm across endpoints.
            </p>
            <div className="table-responsive">
              <table className="ui-table" style={{ fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    <th>Target</th>
                    <th>Risk</th>
                    <th>Reasoning / Output</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 6).map(log => (
                    <tr key={log.id}>
                      <td>
                        <div className="flex-col">
                          <span style={{ fontWeight: 600 }}>{log.endpoint}</span>
                          <span className="sub-text">{log.username} ({log.ip_address || "N/A"})</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex-col">
                          <Badge variant={log.decision === 'ALLOW' ? 'allow' : log.decision === 'DENY' ? 'deny' : 'mfa'} style={{ fontSize: '0.65rem' }}>
                            {log.decision}
                          </Badge>
                          <span style={{ fontWeight: 600, marginTop: "4px" }}>{log.risk_score.toFixed(0)} Score</span>
                        </div>
                      </td>
                      <td>
                        <span className="sub-text line-clamp" title={log.reason}>{log.reason}</span>
                      </td>
                    </tr>
                  ))}
                  {!logsLoading && logs.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", padding: "1rem" }}>No algorithm logs recent.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="col">
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <Card>
              <div className="header-row">
                <h3>Cryptography &amp; Password Storage</h3>
              </div>
              <p className="sub-text" style={{ marginBottom: "1rem" }}>
                Showing active users and their PBKDF2-SHA256 stored hash values. 
              </p>
              <div className="table-responsive">
                <table className="ui-table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Algorithm Output (Hashed Password)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className="flex-col">
                            <span style={{ fontWeight: 600 }}>{user.username}</span>
                            <Badge variant={user.role === 'admin' ? 'mfa' : 'safe'} style={{ fontSize: '0.60rem', width: 'max-content' }}>
                              {user.role}
                            </Badge>
                          </div>
                        </td>
                        <td>
                          <code style={{ fontSize: "0.75rem", background: "var(--bg-subtle)", padding: "4px", borderRadius: "4px", display: "inline-block", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={user.hashed_password}>
                            {user.hashed_password}
                          </code>
                        </td>
                      </tr>
                    ))}
                    {!usersLoading && users.length === 0 && (
                      <tr>
                        <td colSpan={2} style={{ textAlign: "center", padding: "1rem" }}>No users registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="call-to-action-card">
              <h3>Test New Policies (Simulator)</h3>
              <p className="sub-text">Use the Policy Simulator to mock requests and evaluate how your zero-trust algorithm behaves under different situations.</p>
              <Link href="/simulator">
                <button className="ui-btn ui-btn-primary" style={{marginTop: '1rem'}}>
                  Launch Simulator
                </button>
              </Link>
            </Card>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Card>
          <div className="header-row">
            <h3>Live Algorithm Tuning Center</h3>
          </div>
          <p className="sub-text" style={{ marginBottom: "1.5rem" }}>
            Adjust the risk penalties applied by the Zero-Trust Evaluation Engine in real-time. Changes instantly take effect for all new requests.
          </p>
          <div className="form-grid">
            {Object.entries(weights || {}).map(([key, val]) => (
              <div key={key} style={{ background: "var(--bg-sidebar)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)" }}>
                    {key.replace(/_/g, ' ')}
                  </label>
                  <span style={{ color: "var(--primary)", fontWeight: 800 }}>+{val}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={val}
                  onChange={(e) => handleWeightChange(key, parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--primary)" }}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
