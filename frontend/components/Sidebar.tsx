"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const links = [
    { name: "Dashboard Overview", path: "/" },
    { name: "Policy Simulator", path: "/simulator" },
    { name: "Audit Trail", path: "/audit" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-circle"></div>
        <h2>ZTAC Admin</h2>
      </div>
      
      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link 
            key={link.path} 
            href={link.path}
            className={`nav-link ${pathname === link.path ? "active" : ""}`}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={logout} className="logout-btn">Sign Out</button>
      </div>
    </aside>
  );
}
