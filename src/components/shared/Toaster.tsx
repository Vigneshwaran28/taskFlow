"use client";
// App-wide toast notifications: const toast = useToast(); toast.success("Saved").
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONES = { success: "text-success", error: "text-destructive", info: "text-primary" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts(current => current.filter(toast => toast.id !== id)), []);

  const show = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++;
      setToasts(current => [...current.slice(-3), { id, tone, title, description }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => show("success", title, description),
      error: (title, description) => show("error", title, description),
      info: (title, description) => show("info", title, description),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4">
        {toasts.map(toast => {
          const Icon = ICONS[toast.tone];
          return (
            <div key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-card p-4 shadow-lg">
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", TONES[toast.tone])} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-sm text-muted-foreground">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
