import React, { useState, forwardRef } from 'react';
import { Input } from '../Input/Input';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
  id: string;
  showStrength?: boolean;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'var(--color-error)' };
  if (score <= 4) return { score, label: 'Fair', color: 'var(--color-warning)' };
  return { score, label: 'Strong', color: 'var(--color-success)' };
}

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength = false, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const strength = showStrength && props.value ? getPasswordStrength(String(props.value)) : null;

    return (
      <div>
        <Input
          ref={ref}
          type={show ? 'text' : 'password'}
          rightAddon={
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 0 }}
            >
              {show ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
          {...props}
        />
        {strength && String(props.value).length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '2px',
                    background: i <= strength.score ? strength.color : 'var(--color-border)',
                    transition: 'background 0.3s ease',
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: strength.color, fontWeight: 500 }}>
              {strength.label} password
            </p>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
