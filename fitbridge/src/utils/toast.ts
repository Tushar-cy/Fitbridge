/**
 * toast.ts — Imperative toast utility for use OUTSIDE React components.
 *
 * Architecture:
 *   - A Zustand store holds the toast queue (no React state involved).
 *   - Service files / interceptors call `toast.error(...)` directly.
 *   - The ToastRenderer component (mount once in App root) reads the store
 *     and renders the visual toasts.
 *
 * Usage (anywhere — hooks, services, interceptors):
 *   import { toast } from '../utils/toast';
 *   toast.error('No internet connection');
 *   toast.success('Booking confirmed!');
 *
 * Usage in components (same API):
 *   import { useToastStore } from '../utils/toast';
 *   const toasts = useToastStore((s) => s.toasts);
 */

import { create } from 'zustand';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  /** Duration in ms before auto-dismiss. Default: 3500 */
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (message: string, type: ToastType, duration?: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

// ── Zustand store (module-level — no React required to read/write) ─────────────

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  add: (message, type, duration = 3500) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }));
    // Auto-remove after duration
    setTimeout(() => {
      useToastStore.getState().remove(id);
    }, duration);
  },

  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));

// ── Imperative API (callable outside React) ───────────────────────────────────

/**
 * Imperative toast — call from anywhere (services, interceptors, utils).
 *
 * @example
 *   toast.error('No internet connection');
 *   toast.success('Booking confirmed!', 5000);
 */
export const toast = {
  show:    (message: string, type: ToastType = 'info', duration?: number) =>
             useToastStore.getState().add(message, type, duration),
  success: (message: string, duration?: number) =>
             useToastStore.getState().add(message, 'success', duration),
  error:   (message: string, duration?: number) =>
             useToastStore.getState().add(message, 'error', duration),
  info:    (message: string, duration?: number) =>
             useToastStore.getState().add(message, 'info', duration),
  warning: (message: string, duration?: number) =>
             useToastStore.getState().add(message, 'warning', duration),
  clear:   () => useToastStore.getState().clear(),
};

export default toast;
