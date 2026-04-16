"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("ztac_access_token");
    if (saved) {
      setTokenState(saved);
    }
    setMounted(true);
  }, []);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      window.localStorage.setItem("ztac_access_token", newToken);
    } else {
      window.localStorage.removeItem("ztac_access_token");
    }
    setTokenState(newToken);
  };

  const logout = () => {
    setToken(null);
    router.push("/login");
  };

  useEffect(() => {
    if (mounted) {
      if (!token && pathname !== "/login") {
        router.push("/login");
      } else if (token && pathname === "/login") {
        router.push("/");
      }
    }
  }, [token, pathname, mounted, router]);

  if (!mounted) return null;

  return (
    <AuthContext.Provider value={{ token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
