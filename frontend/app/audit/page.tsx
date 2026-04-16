"use client";

import { useEffect } from "react";
import { useAudit } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AuditPage() {
  const { logs, loading, error, fetchLogs } = useAudit();

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Card className="audit-card">
      <div className="header-row">
        <h3>Audit Trail</h3>
        <Button variant="secondary" onClick={fetchLogs} isLoading={loading}>Refresh List</Button>
      </div>

      {error ? (
        <div className="status-msg error">{error}</div>
      ) : (
        <div className="table-responsive">
          <table className="ui-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Time</th>
                <th>Target</th>
                <th>IP Address</th>
                <th>Risk Info</th>
                <th>Decision / Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td className="time-col">{new Date(log.created_at).toLocaleString()}</td>
                  <td>
                    <div className="flex-col">
                      <span>{log.endpoint}</span>
                      <span className="sub-text">{log.username}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex-col">
                      <span>{log.ip_address || "N/A"}</span>
                      <Badge variant={log.device_status === "trusted" ? "safe" : "danger"} style={{fontSize: '0.65rem', marginTop: '4px'}}>
                        {log.device_status}
                      </Badge>
                    </div>
                  </td>
                  <td>
                    <div className="flex-col">
                      <span style={{ fontWeight: 600 }}>{log.risk_score.toFixed(0)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex-col">
                      <Badge variant={log.decision === "ALLOW" ? "allow" : log.decision === "DENY" ? "deny" : "mfa"}>
                        {log.decision}
                      </Badge>
                      <span className="sub-text line-clamp">{log.reason}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem" }}>No audit logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
