import React, { forwardRef } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  id: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, id, className = '', ...props }, ref) => {
    return (
      <div className={`input-group ${error ? 'input-group--error' : ''}`}>
        {label && (
          <label htmlFor={id} className="input-label">
            {label}
          </label>
        )}
        <div className="input-wrapper">
          {leftAddon && <span className="input-addon input-addon--left" aria-hidden="true">{leftAddon}</span>}
          <input
            ref={ref}
            id={id}
            className={`input-field ${leftAddon ? 'input-field--has-left' : ''} ${rightAddon ? 'input-field--has-right' : ''} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            {...props}
          />
          {rightAddon && <span className="input-addon input-addon--right">{rightAddon}</span>}
        </div>
        {error && (
          <p id={`${id}-error`} className="input-error" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
        {!error && hint && <p id={`${id}-hint`} className="input-hint">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
