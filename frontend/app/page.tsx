"use client";

import { useEffect, useState } from "react";
import { useAudit } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default function DashboardOverview() {
  const { logs, loading, fetchLogs } = useAudit();
  const [metrics, setMetrics] = useState({ allowed: 0, denied: 0, mfa: 0, avgRisk: 0 });

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
              <h3>Recent Denials & Challenges</h3>
              <Link href="/audit" className="link-btn">View All</Link>
            </div>
            {logs.filter(l => l.decision !== 'ALLOW').slice(0, 5).map(log => (
              <div key={log.id} className="quick-log-item">
                <Badge variant={log.decision === 'DENY' ? 'deny' : 'mfa'}>{log.decision}</Badge>
                <div className="ql-info">
                  <span className="endpoint">{log.endpoint}</span>
                  <span className="reason">{log.reason}</span>
                </div>
                <div className="ql-risk">{log.risk_score.toFixed(0)} Risk</div>
              </div>
            ))}
            {!loading && logs.filter(l => l.decision !== 'ALLOW').length === 0 && (
              <p className="sub-text">No critical events recently.</p>
            )}
          </Card>
        </div>
        <div className="col">
          <Card className="call-to-action-card pattern-bg">
            <h3>Test New Policies</h3>
            <p className="sub-text">Use the Policy Simulator to mock requests and evaluate how your zero-trust configuration behaves under different conditions (trusted devices vs active attacker scenarios).</p>
            <Link href="/simulator">
              <button className="ui-btn ui-btn-primary" style={{marginTop: '1rem'}}>
                Launch Simulator
              </button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
