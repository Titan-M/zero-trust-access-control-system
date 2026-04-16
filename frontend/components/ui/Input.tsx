import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className={`ui-input-group ${className}`}>
      {label && <label className="ui-label">{label}</label>}
      <input className={`ui-input ${error ? 'has-error' : ''}`} {...props} />
      {error && <span className="ui-error">{error}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = "", ...props }: SelectProps) {
  return (
    <div className={`ui-input-group ${className}`}>
      {label && <label className="ui-label">{label}</label>}
      <select className={`ui-input ${error ? 'has-error' : ''}`} {...props}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className="ui-error">{error}</span>}
    </div>
  );
}
