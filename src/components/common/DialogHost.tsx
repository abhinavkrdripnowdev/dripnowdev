import React, { useEffect, useRef, useState } from 'react';
import { dismissToast, useDialogState, type ChoiceRequest, type ConfirmRequest, type ReasonRequest } from '@/lib/dialog';
import './DialogHost.css';

const Frame: React.FC<{ title: string; message?: string; tone?: 'default' | 'danger'; onCancel: () => void; children: React.ReactNode }> = ({ title, message, tone = 'default', onCancel, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, select, [tabindex="0"]');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const auto = ref.current?.querySelector<HTMLElement>('[data-autofocus]');
    (auto ?? ref.current)?.focus();
    return () => { document.removeEventListener('keydown', onKey, true); prev?.focus?.(); };
  }, [onCancel]);
  return (
    <div className="dlg-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div ref={ref} className={`dlg dlg--${tone}`} role="dialog" aria-modal="true" aria-labelledby="dlg-title" tabIndex={-1}>
        <h2 id="dlg-title">{title}</h2>
        {message && <p className="dlg__msg">{message}</p>}
        {children}
      </div>
    </div>
  );
};

const ReasonDialog: React.FC<{ req: ReasonRequest }> = ({ req }) => {
  const [value, setValue] = useState('');
  const ok = !req.required || value.trim().length > 0;
  const submit = () => { if (ok) req.resolve(value.trim()); };
  return (
    <Frame title={req.title} message={req.message} tone={req.tone} onCancel={() => req.resolve(null)}>
      <label className="dlg__field">
        <span>{req.label}{req.required && <b aria-hidden="true"> *</b>}</span>
        <textarea data-autofocus rows={3} value={value} placeholder={req.placeholder} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }} />
      </label>
      <div className="dlg__actions">
        <button type="button" className="dlg-btn" onClick={() => req.resolve(null)}>Cancel</button>
        <button type="button" className={`dlg-btn dlg-btn--primary ${req.tone === 'danger' ? 'is-danger' : ''}`} disabled={!ok} onClick={submit}>{req.confirmLabel}</button>
      </div>
    </Frame>
  );
};

const ConfirmDialogView: React.FC<{ req: ConfirmRequest }> = ({ req }) => (
  <Frame title={req.title} message={req.message} tone={req.tone} onCancel={() => req.resolve(false)}>
    <div className="dlg__actions">
      <button type="button" className="dlg-btn" onClick={() => req.resolve(false)}>Cancel</button>
      <button type="button" data-autofocus className={`dlg-btn dlg-btn--primary ${req.tone === 'danger' ? 'is-danger' : ''}`} onClick={() => req.resolve(true)}>{req.confirmLabel}</button>
    </div>
  </Frame>
);

const ChoiceDialog: React.FC<{ req: ChoiceRequest }> = ({ req }) => {
  const [value, setValue] = useState(req.options[0]?.value ?? '');
  const [reason, setReason] = useState('');
  const ok = Boolean(value) && (!req.reasonLabel || reason.trim().length > 0);
  return (
    <Frame title={req.title} message={req.message} onCancel={() => req.resolve(null)}>
      <div className="dlg__options" role="radiogroup">
        {req.options.map((o, i) => (
          <label key={o.value} className={`dlg__option ${value === o.value ? 'is-on' : ''}`}>
            <input type="radio" name="dlg-choice" data-autofocus={i === 0 ? true : undefined} checked={value === o.value} onChange={() => setValue(o.value)} />
            <span><b>{o.label}</b>{o.hint && <small>{o.hint}</small>}</span>
          </label>
        ))}
      </div>
      {req.reasonLabel && (
        <label className="dlg__field">
          <span>{req.reasonLabel} <b aria-hidden="true">*</b></span>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}
      <div className="dlg__actions">
        <button type="button" className="dlg-btn" onClick={() => req.resolve(null)}>Cancel</button>
        <button type="button" className="dlg-btn dlg-btn--primary" disabled={!ok} onClick={() => req.resolve({ value, reason: reason.trim() })}>{req.confirmLabel}</button>
      </div>
    </Frame>
  );
};

export const DialogHost: React.FC = () => {
  const { dialog, toasts } = useDialogState();
  return (
    <>
      {dialog?.kind === 'reason' && <ReasonDialog req={dialog} />}
      {dialog?.kind === 'confirm' && <ConfirmDialogView req={dialog} />}
      {dialog?.kind === 'choice' && <ChoiceDialog req={dialog} />}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
            <span>{t.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>×</button>
          </div>
        ))}
      </div>
    </>
  );
};
