import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  fullWidth?: boolean;
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = "primary", 
  fullWidth, 
  isLoading, 
  className = "", 
  disabled, 
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={`ui-btn ui-btn-${variant} ${fullWidth ? 'full-width' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Processing..." : children}
    </button>
  );
}
