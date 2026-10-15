"use client";
// Top bar: quick appearance switcher — light, dark, or system, and every style preset (Neon, Ocean, High contrast, …).
// The full set of options lives in Settings → Appearance.
import Link from "@/components/navigation/Link";
import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { STYLE_META } from "@/components/shared/StylePreview";
import { useToast } from "@/components/shared/Toaster";
import { useUpdatePreferences } from "@/features/auth";
import { STYLES, useTheme, type AppearancePreferences, type ThemeMode } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

const MODES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Styles that only look right on dark surfaces switch the theme to dark with them. */
const DARK_FIRST = new Set(["midnight", "neon"]);

export function ThemeMenu() {
  const toast = useToast();
  const { preferences, setPreference, style, brand } = useTheme();
  const save = useUpdatePreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape (document listeners are an external system → effect).
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function change(changes: Partial<AppearancePreferences>) {
    for (const [key, value] of Object.entries(changes)) setPreference(key as keyof AppearancePreferences, value as never);
    save.mutate(changes, { onError: () => toast.error("Couldn't save your preference", "It still applies on this device.") });
  }

  const isDark = preferences.theme === "dark" || (preferences.theme === "system" && typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const ModeIcon = isDark ? Moon : Sun;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Theme and style"
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ModeIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div role="dialog" aria-label="Theme and style" className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border bg-card p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme</p>
          <div className="grid grid-cols-3 gap-1.5">
            {MODES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={preferences.theme === value}
                onClick={() => change({ theme: value })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  preferences.theme === value ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Palette className="h-3.5 w-3.5" aria-hidden="true" />
            Style
          </p>
          {brand.lockStyle ? (
            <p className="text-xs text-muted-foreground">Your workspace uses {STYLE_META[style].label} for everyone.</p>
          ) : (
            <ul className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto">
              {STYLES.map(name => (
                <li key={name}>
                  <button
                    type="button"
                    aria-pressed={style === name}
                    onClick={() => change(DARK_FIRST.has(name) && !isDark ? { style: name, theme: "dark" } : { style: name })}
                    className={cn(
                      "flex w-full items-center justify-between gap-1 rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      style === name ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{STYLE_META[name].label}</span>
                    {style === name && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link href="/settings?tab=appearance" onClick={() => setOpen(false)} className="mt-3 block rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            More appearance options: colours, background picture, custom CSS…
          </Link>
        </div>
      )}
    </div>
  );
}
