"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { loginUser, registerUser } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AuthMode } from "@/lib/types";

export default function LoginPage() {
  const { setToken } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (mode: AuthMode) => {
    if (!username || !password) {
      setError("Please fill in both fields");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = mode === "register"
        ? await registerUser(username, password, "admin")
        : await loginUser(username, password);
      
      setToken(result.access_token);
      // AuthContext will handle redirect to dashboard
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <Card className="login-card">
        <div className="login-header">
          <div className="logo-circle large"></div>
          <h2>Authenticate</h2>
          <p>Zero Trust Access Control System</p>
        </div>

        {error && <div className="status-msg error">{error}</div>}

        <div className="login-form">
          <Input 
            label="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="admin_user" 
          />
          <Input 
            label="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Min 10 characters" 
          />
          <div className="login-actions">
            <Button variant="secondary" onClick={() => handleAuth("register")} isLoading={loading}>
              Register
            </Button>
            <Button variant="primary" onClick={() => handleAuth("login")} isLoading={loading}>
              Sign In
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
