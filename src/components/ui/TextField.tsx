"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { FieldShell, controlClass, describedBy } from "./FieldShell";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** Set to false to disable the password reveal toggle button on type="password" fields. Defaults to true. */
  showPasswordToggle?: boolean;
  action?: ReactNode;
}

export function TextField({
  label,
  hint,
  error,
  className,
  id: idProp,
  required,
  type,
  showPasswordToggle = true,
  action,
  ...inputProps
}: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  const effectiveType = isPassword ? (revealed ? "text" : "password") : type;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className} action={action}>
      <div className="relative w-full">
        <input
          id={id}
          type={effectiveType}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          className={controlClass(error, cn("h-10", isPassword && showPasswordToggle && "pr-10"))}
          {...inputProps}
        />
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setRevealed(v => !v)}
            disabled={inputProps.disabled}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            title={revealed ? "Hide password" : "Show password"}
            tabIndex={-1}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </FieldShell>
  );
}
