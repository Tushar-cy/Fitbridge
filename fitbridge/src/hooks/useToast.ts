import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback(
    (message: string, type: Toast['type'] = 'info', duration = 3000) => {
      const id = Date.now().toString();
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  const success = (msg: string) => show(msg, 'success');
  const error = (msg: string) => show(msg, 'error');
  const info = (msg: string) => show(msg, 'info');
  const warning = (msg: string) => show(msg, 'warning');

  return { toasts, show, success, error, info, warning };
};
