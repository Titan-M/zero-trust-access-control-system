import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: "allow" | "deny" | "mfa" | "safe" | "warn" | "danger" | "neutral";
  children: React.ReactNode;
}

export function Badge({ variant, children, className = "", ...props }: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}
