import type { ComponentType, ReactNode } from "react";
import { Logo } from "./Logo";

export interface StatusPageProps {
  /** Big code above the title, e.g. "404" */
  code?: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  message: ReactNode;
  /** Buttons and links */
  actions?: ReactNode;
  footer?: ReactNode;
}

/** Full-page status screen (not found, errors): the product mark, a big code, and ways forward. */
export function StatusPage({ code, icon: Icon, title, message, actions, footer }: StatusPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-3xl items-center px-4 py-6 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="flex w-full max-w-lg flex-col items-center gap-5 text-center">
          {code && (
            <p aria-hidden="true" className="bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-7xl font-bold tracking-tight text-transparent sm:text-8xl">
              {code}
            </p>
          )}
          <div className="rounded-full bg-accent p-3">
            <Icon className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <div className="text-sm text-muted-foreground">{message}</div>
          </div>
          {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
          {footer && <div className="text-xs text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
