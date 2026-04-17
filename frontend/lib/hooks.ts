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

export function useUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<Array<{ id: number; username: string; role: string; hashed_password: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { getUsers } = await import('./api');
      const data = await getUsers(token);
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { users, loading, error, fetchUsers };
}

export function useWeights() {
  const { token } = useAuth();
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeights = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { getWeights } = await import('./api');
      const data = await getWeights(token);
      setWeights(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load weights");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const saveWeights = async (newWeights: Record<string, number>) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { updateWeights } = await import('./api');
      const res = await updateWeights(token, newWeights);
      setWeights(res.weights);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update weights");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { weights, loading, error, fetchWeights, saveWeights, setWeights };
}
