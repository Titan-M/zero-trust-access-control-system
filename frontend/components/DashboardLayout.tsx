"use client";
import React from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const pathname = usePathname();

  if (pathname === "/login") {
    return <main className="login-layout">{children}</main>;
  }

  if (!token) return null; // Wait for redirect in AuthContext

  const getPageTitle = () => {
    switch (pathname) {
      case "/": return "Command Center";
      case "/simulator": return "Zero-Trust Policy Simulator";
      case "/audit": return "Security Audit Log";
      default: return "Dashboard";
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <header className="top-nav">
           <h2>{getPageTitle()}</h2>
           <div className="user-profile">
             <div className="avatar">A</div>
             <span>Admin User</span>
           </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
