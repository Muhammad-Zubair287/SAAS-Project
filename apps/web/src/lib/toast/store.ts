'use client';

import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs: number;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

/** Errors linger — they usually need reading and often an action. */
const DEFAULT_DURATION_MS = 5_000;
const ERROR_DURATION_MS = 8_000;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `toast-${counter}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId();
    const durationMs =
      toast.durationMs ??
      (toast.variant === 'error' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id, durationMs }] }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

type ToastInput = string | { title: string; description?: string; durationMs?: number };

function show(variant: ToastVariant, input: ToastInput, description?: string): string {
  const payload =
    typeof input === 'string'
      ? { title: input, ...(description ? { description } : {}) }
      : input;
  return useToastStore.getState().push({ variant, ...payload });
}

/**
 * Imperative on purpose: this must be callable from the QueryClient's
 * MutationCache.onError, which runs outside React and so cannot use a hook.
 */
export const toast = {
  success: (input: ToastInput, description?: string) => show('success', input, description),
  error: (input: ToastInput, description?: string) => show('error', input, description),
  warning: (input: ToastInput, description?: string) => show('warning', input, description),
  info: (input: ToastInput, description?: string) => show('info', input, description),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear(),
};
