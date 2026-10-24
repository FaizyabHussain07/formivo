'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Check, X } from 'lucide-react';

/**
 * Lightweight toast system for success/error feedback.
 * Rendered in an aria-live region so screen readers announce updates.
 */

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastApi {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const VARIANT_STYLE: Record<ToastVariant, { wrapper: string; icon: ReactNode }> = {
  success: {
    wrapper: 'border-success/30',
    icon: <Check className="h-4 w-4 text-success" aria-hidden="true" />,
  },
  error: {
    wrapper: 'border-danger/30',
    icon: <X className="h-4 w-4 text-danger" aria-hidden="true" />,
  },
  info: {
    wrapper: 'border-info/30',
    icon: <Check className="h-4 w-4 text-info" aria-hidden="true" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastApi['toast']>(
    ({ title, description, variant = 'info' }) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((current) => [
        ...current.slice(-2),
        { id, title, description, variant },
      ]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-80"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-surface-elevated px-4 py-3 shadow-lg ${VARIANT_STYLE[t.variant].wrapper}`}
          >
            <span className="mt-0.5 flex-none">{VARIANT_STYLE[t.variant].icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="flex-none rounded p-1 text-subtle-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}