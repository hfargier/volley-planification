import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { subscribeToast, type ToastMessage } from './toast';

// Le succès s'effface seul. Une erreur reste affichée jusqu'au clic : elle peut
// signifier « travail non sauvegardé », on ne doit pas pouvoir la manquer.
const DUREE_MS: Record<ToastMessage['kind'], number> = {
  success: 3200,
  error: 0,
};

const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToast((toast) => {
      setToasts((current) => [...current, toast]);
      const duree = DUREE_MS[toast.kind];
      if (duree > 0) {
        timers.current.push(
          window.setTimeout(() => dismiss(toast.id), duree)
        );
      }
    });

    return () => {
      unsubscribe();
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          {toast.kind === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span className="toast-text">{toast.text}</span>
          <button
            className="toast-close"
            onClick={() => dismiss(toast.id)}
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastHost;
