"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff, Sparkles } from "lucide-react";
import { FieldShell, controlClass, describedBy } from "@/components/ui/FieldShell";
import { cn } from "@/lib/cn";

/** Cryptographically secure random password generator satisfying TaskFlow policies. */
export function generateRandomPassword(length = 14): string {
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const uppercase = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const numbers = "23456789";
  const symbols = "!@#$%*-_";
  const allChars = lowercase + uppercase + numbers + symbols;

  const getRandomChar = (charset: string) => {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    return charset[randomArray[0] % charset.length];
  };

  const passwordChars = [
    getRandomChar(lowercase),
    getRandomChar(uppercase),
    getRandomChar(numbers),
    getRandomChar(symbols),
  ];

  for (let i = 4; i < length; i++) {
    passwordChars.push(getRandomChar(allChars));
  }

  // Fisher-Yates shuffle
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const j = randomArray[0] % (i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

export interface TemporaryPasswordFieldProps {
  id?: string;
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoComplete?: string;
  maxLength?: number;
  minLength?: number;
}

export function TemporaryPasswordField({
  id: idProp,
  label = "Temporary password",
  value,
  onChange,
  error,
  hint,
  required,
  autoFocus,
  placeholder = "Enter or generate a temporary password",
  className,
  disabled,
  autoComplete = "new-password",
  maxLength = 128,
  minLength = 14,
}: TemporaryPasswordFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [revealed, setRevealed] = useState(true); // default to visible so admin sees what was set
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!value) return;
    const ok = await copyToClipboard(value);
    setCopyState(ok ? "copied" : "failed");
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopyState("idle");
    }, 2000);
  };

  const handleGenerate = async () => {
    const pwd = generateRandomPassword(Math.max(minLength, 14));
    onChange(pwd);
    // Also copy generated password directly for convenience
    const ok = await copyToClipboard(pwd);
    setCopyState(ok ? "copied" : "failed");
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopyState("idle");
    }, 2000);
  };

  return (
    <FieldShell
      id={id}
      label={
        <div className="flex w-full items-center justify-between gap-2">
          <span>{label}</span>
          <div className="flex items-center gap-1.5 font-normal">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              title="Generate a secure random password and copy to clipboard"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              <span>Generate</span>
            </button>
            {value && (
              <button
                type="button"
                onClick={handleCopy}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
                  copyState === "copied"
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Copy password to clipboard"
              >
                {copyState === "copied" ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative w-full">
        <input
          id={id}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          className={controlClass(error, "h-10 font-mono text-sm tracking-normal pr-16")}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value ? (
            <button
              type="button"
              onClick={handleCopy}
              disabled={disabled}
              aria-label={copyState === "copied" ? "Password copied" : "Copy password"}
              title={copyState === "copied" ? "Password copied" : "Copy password"}
              tabIndex={-1}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
            >
              {copyState === "copied" ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setRevealed(v => !v)}
            disabled={disabled}
            aria-label={revealed ? "Mask password" : "Show password"}
            aria-pressed={revealed}
            title={revealed ? "Mask password" : "Show password"}
            tabIndex={-1}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            {revealed ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </FieldShell>
  );
}
