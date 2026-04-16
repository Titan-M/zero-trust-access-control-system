import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { evaluateAccess, verifyMfa, getAuditLogs } from "./api";
import type { AccessDecision, DeviceStatus, AuditLog } from "./types";

export function usePolicyEngine() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<AccessDecision | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState("");

  const evaluate = useCallback(async (params: { endpoint: string; ipAddress?: string; deviceStatus: DeviceStatus; accessTime: string; }) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await evaluateAccess({ token, ...params });
      setDecision(res);
      if (res.decision === "MFA_REQUIRED" && res.challenge_id) {
        setMfaChallengeId(res.challenge_id);
      }
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const verifyChallenge = useCallback(async (endpoint: string, code: string) => {
    if (!token || !mfaChallengeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyMfa({ token, challengeId: mfaChallengeId, code, endpoint });
      if (res.decision === "ALLOW") {
        setDecision(prev => prev ? { ...prev, decision: "ALLOW", message: res.message, reason: res.reason } : null);
        return true;
      } else {
        setError("Invalid MFA Code");
        return false;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "MFA Failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, mfaChallengeId]);

  return { evaluate, verifyChallenge, decision, loading, error, mfaChallengeId };
}

export function useAudit() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs(token, 50);
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { logs, loading, error, fetchLogs };
}
