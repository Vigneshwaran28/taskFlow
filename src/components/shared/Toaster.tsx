"use client";
// App-wide toast notifications: const toast = useToast(); toast.success("Saved").
// Supports action buttons (e.g. "Join Meeting", "View Ticket"), badges, and custom dismiss durations.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, ExternalLink, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
  external?: boolean;
}

export interface ToastOptions {
  action?: ToastAction;
  duration?: number;
  badge?: string;
}

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: ToastAction;
  badge?: string;
}

export interface ToastApi {
  success: (title: string, description?: string, options?: ToastOptions) => void;
  error: (title: string, description?: string, options?: ToastOptions) => void;
  info: (title: string, description?: string, options?: ToastOptions) => void;
  custom: (tone: ToastTone, title: string, description?: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONES = { success: "text-success", error: "text-destructive", info: "text-primary" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts(current => current.filter(toast => toast.id !== id)), []);

  const show = useCallback(
    (tone: ToastTone, title: string, description?: string, options?: ToastOptions) => {
      const id = nextId.current++;
      const duration = options?.duration ?? (options?.action ? 10000 : tone === "error" ? 7000 : 4500);

      setToasts(current => [
        ...current.slice(-4),
        { id, tone, title, description, action: options?.action, badge: options?.badge },
      ]);

      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description, options) => show("success", title, description, options),
      error: (title, description, options) => show("error", title, description, options),
      info: (title, description, options) => show("info", title, description, options),
      custom: (tone, title, description, options) => show(tone, title, description, options),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2.5 sm:inset-x-auto sm:right-4">
        {toasts.map(toast => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-xl border border-border/80 bg-card/95 p-4 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 sm:max-w-md"
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", TONES[toast.tone])} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold tracking-tight">{toast.title}</p>
                    {toast.badge && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {toast.badge}
                      </span>
                    )}
                  </div>
                  {toast.description && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{toast.description}</p>}
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

              {toast.action && (
                <div className="mt-1 flex items-center justify-end pl-8">
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      dismiss(toast.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>{toast.action.label}</span>
                    {toast.action.external && <ExternalLink className="h-3 w-3" aria-hidden="true" />}
                  </button>
                </div>
              )}
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
