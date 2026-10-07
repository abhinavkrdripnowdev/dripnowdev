import { useSyncExternalStore } from 'react';

/**
 * Promise-based dialogs and toasts that replace window.prompt/confirm/alert.
 * Render <DialogHost /> once (App.tsx); call the helpers from anywhere.
 */

export type Tone = 'default' | 'danger';
export type ToastTone = 'info' | 'success' | 'error';

export interface ReasonRequest { kind: 'reason'; title: string; message?: string; label: string; placeholder?: string; confirmLabel: string; tone: Tone; required: boolean; resolve: (v: string | null) => void }
export interface ConfirmRequest { kind: 'confirm'; title: string; message?: string; confirmLabel: string; tone: Tone; resolve: (v: boolean) => void }
export interface ChoiceOption { value: string; label: string; hint?: string }
export interface ChoiceRequest { kind: 'choice'; title: string; message?: string; options: ChoiceOption[]; reasonLabel?: string; confirmLabel: string; resolve: (v: { value: string; reason: string } | null) => void }
export type DialogRequest = ReasonRequest | ConfirmRequest | ChoiceRequest;
export interface ToastItem { id: number; message: string; tone: ToastTone }

interface State { dialog: DialogRequest | null; toasts: ToastItem[] }

let state: State = { dialog: null, toasts: [] };
const queue: DialogRequest[] = [];
const listeners = new Set<() => void>();
let toastId = 0;

const emit = () => { state = { ...state }; listeners.forEach((l) => l()); };

const next = () => { state.dialog = queue.shift() ?? null; emit(); };
const open = (req: DialogRequest) => { if (state.dialog) queue.push(req); else { state.dialog = req; emit(); } };

export function askReason(opts: { title: string; message?: string; label?: string; placeholder?: string; confirmLabel?: string; tone?: Tone; required?: boolean }): Promise<string | null> {
  return new Promise((resolve) => open({
    kind: 'reason', title: opts.title, message: opts.message, label: opts.label ?? 'Reason', placeholder: opts.placeholder,
    confirmLabel: opts.confirmLabel ?? 'Confirm', tone: opts.tone ?? 'default', required: opts.required ?? true,
    resolve: (v) => { resolve(v); next(); },
  }));
}

export function confirmDialog(opts: { title: string; message?: string; confirmLabel?: string; tone?: Tone }): Promise<boolean> {
  return new Promise((resolve) => open({
    kind: 'confirm', title: opts.title, message: opts.message, confirmLabel: opts.confirmLabel ?? 'Confirm', tone: opts.tone ?? 'default',
    resolve: (v) => { resolve(v); next(); },
  }));
}

export function chooseOption(opts: { title: string; message?: string; options: ChoiceOption[]; reasonLabel?: string; confirmLabel?: string }): Promise<{ value: string; reason: string } | null> {
  return new Promise((resolve) => open({
    kind: 'choice', title: opts.title, message: opts.message, options: opts.options, reasonLabel: opts.reasonLabel, confirmLabel: opts.confirmLabel ?? 'Continue',
    resolve: (v) => { resolve(v); next(); },
  }));
}

export function toast(message: string, tone: ToastTone = 'info') {
  const id = ++toastId;
  state.toasts = [...state.toasts, { id, message, tone }];
  emit();
  setTimeout(() => dismissToast(id), tone === 'error' ? 6500 : 4000);
}

export function dismissToast(id: number) {
  state.toasts = state.toasts.filter((t) => t.id !== id);
  emit();
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useDialogState = () => useSyncExternalStore(subscribe, () => state);
