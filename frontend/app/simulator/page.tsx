"use client";

import { useState } from "react";
import { usePolicyEngine } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { DeviceStatus } from "@/lib/types";

export default function SimulatorPage() {
  const { evaluate, verifyChallenge, decision, loading, error } = usePolicyEngine();
  
  const [endpoint, setEndpoint] = useState("/access/resource");
  const [ipAddress, setIpAddress] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("trusted");
  const [accessTime, setAccessTime] = useState(new Date().toTimeString().slice(0, 5));
  const [mfaCode, setMfaCode] = useState("");

  const applyPreset = (type: "safe" | "suspicious" | "critical") => {
    if (type === "safe") { setIpAddress("10.0.0.24"); setDeviceStatus("trusted"); setAccessTime("10:30"); }
    else if (type === "suspicious") { setIpAddress("103.25.67.12"); setDeviceStatus("untrusted"); setAccessTime("22:45"); }
    else { setIpAddress("8.8.8.8"); setDeviceStatus("untrusted"); setAccessTime("02:15"); }
  };

  const handleEvaluate = async () => {
    await evaluate({ endpoint, ipAddress, deviceStatus, accessTime });
    setMfaCode(""); // Reset MFA code
  };

  const handleVerifyMfa = async () => {
    await verifyChallenge(endpoint, mfaCode);
  };

  return (
    <div className="two-col-layout">
      <div className="col">
        <Card>
          <div className="preset-header">
            <h3>Request Context</h3>
            <div className="presets">
              <button className="preset-chip" onClick={() => applyPreset("safe")}>Normal</button>
              <button className="preset-chip" onClick={() => applyPreset("suspicious")}>Remote</button>
              <button className="preset-chip" onClick={() => applyPreset("critical")}>Critical</button>
            </div>
          </div>
          
          <div className="form-grid">
            <Input label="Target Endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
            <Input label="Source IP" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="0.0.0.0" />
            <Select 
              label="Device Trust" 
              value={deviceStatus} 
              onChange={(e) => setDeviceStatus(e.target.value as DeviceStatus)}
              options={[
                { value: "trusted", label: "Managed Device" },
                { value: "untrusted", label: "BYOD/Untrusted" }
              ]}
            />
            <Input type="time" label="Access Time" value={accessTime} onChange={(e) => setAccessTime(e.target.value)} />
          </div>

          <Button fullWidth onClick={handleEvaluate} isLoading={loading}>
            Simulate Access Request
          </Button>
          
          {error && <div className="status-msg error" style={{marginTop: "1rem"}}>{error}</div>}
        </Card>
      </div>

      <div className="col">
        <Card className="result-card">
          <h3>Evaluation Result</h3>
          
          {!decision ? (
            <div className="empty-state">
              <p>Configure the request parameters and run simulation to see the policy engine decision.</p>
            </div>
          ) : (
            <div className="decision-container fade-in">
              <Badge variant={decision.decision === 'ALLOW' ? 'allow' : decision.decision === 'DENY' ? 'deny' : 'mfa'} className="large-badge">
                {decision.decision}
              </Badge>
              
              <div className="risk-metric">
                <div className="risk-header">
                  <span>Calculated Risk</span>
                  <strong>{decision.risk_score.toFixed(1)} / 100</strong>
                </div>
                <div className="risk-gauge">
                  <div 
                    className={`risk-fill ${decision.risk_score >= 70 ? 'danger' : decision.risk_score >= 35 ? 'warn' : 'safe'}`} 
                    style={{ width: `${decision.risk_score}%` }}>
                  </div>
                </div>
              </div>
              
              <div className="reason-box">
                <p><strong>Reasoning:</strong> {decision.reason}</p>
                {decision.message && <p><strong>Details:</strong> {decision.message}</p>}
              </div>

              {decision.decision === "MFA_REQUIRED" && (
                <div className="mfa-challenge">
                  <h4>MFA Challenge Triggered</h4>
                  <Input 
                    placeholder="Enter 6-digit code" 
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    style={{ textAlign: "center", letterSpacing: "0.2em" }}
                  />
                  {decision.debug_mfa_code && <p className="hint">Hint: {decision.debug_mfa_code}</p>}
                  <Button fullWidth onClick={handleVerifyMfa} isLoading={loading} style={{marginTop: "1rem"}}>
                    Verify Factor
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
