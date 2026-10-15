"use client";
// Tenant form → Look & feel, and Settings → Branding: corners, shadows, cards, buttons, type, spacing, and motion for
// every UI element of the workspace. The preview beside the choices uses the same CSS as the app ([data-ui-preview]).
import { useId, useState } from "react";
import { Bell, Play, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { DEFAULT_UI, UI_FIELDS, UI_OPTIONS, uiDataProps, type UiKey, type UiSettings } from "../utils/uiOptions";

const GROUPS = [
  { id: "shape", title: "Shape" },
  { id: "type", title: "Type and spacing" },
  { id: "motion", title: "Motion" },
] as const;

/** One-click starting points. */
const PRESETS: { label: string; value: Partial<UiSettings> }[] = [
  { label: "Clean", value: { radius: "small", shadow: "soft", surface: "bordered", buttonShape: "rounded", animation: "subtle", pageTransition: "fade", hover: "none" } },
  { label: "Friendly", value: { radius: "large", shadow: "soft", surface: "elevated", buttonShape: "pill", animation: "lively", pageTransition: "slide", hover: "lift" } },
  { label: "Sharp", value: { radius: "none", shadow: "none", surface: "bordered", buttonShape: "square", animation: "subtle", pageTransition: "none", hover: "glow" } },
  { label: "Calm", value: { radius: "default", shadow: "none", surface: "flat", buttonShape: "default", animation: "none", pageTransition: "none", hover: "none", density: "spacious" } },
];

function Segmented({ name, value, options, labels, onChange }: { name: string; value: string; options: readonly string[]; labels: Record<string, string>; onChange: (next: string) => void }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {options.map(option => {
        const selected = option === value;
        return (
          <label
            key={option}
            className={cn(
              "flex-1 cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1.5 text-center text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-ring",
              selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <input type="radio" name={name} value={option} checked={selected} onChange={() => onChange(option)} className="sr-only" />
            {labels[option] ?? option}
          </label>
        );
      })}
    </div>
  );
}

/** A small slice of the app in the chosen look; "Replay" plays the page entrance again. */
function UiPreview({ value, workspaceName }: { value: UiSettings; workspaceName: string }) {
  const [round, setRound] = useState(0);
  const motion = value.animation !== "none" && value.pageTransition !== "none";
  return (
    <div {...uiDataProps(value)} data-ui-preview="" className="flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Live preview</p>
        {motion && (
          <button type="button" onClick={() => setRound(round + 1)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <Play className="h-3 w-3" aria-hidden="true" />
            Replay entrance
          </button>
        )}
      </div>
      <div key={round} data-ui-preview-page="" className="flex min-w-0 flex-col gap-3 font-sans">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">{(workspaceName || "W").slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{workspaceName || "Your workspace"}</p>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
          <Bell className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Open tickets</h4>
            <Badge tone="primary">12</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">3 are due today. Response time is on target.</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 rounded-full bg-primary transition-all" />
          </div>
        </div>
        <button type="button" className="rounded-xl border bg-card p-3 text-left shadow-sm transition-all" tabIndex={-1}>
          <span className="block text-sm font-medium">A clickable card</span>
          <span className="block text-xs text-muted-foreground">Point at it to see the hover effect.</span>
        </button>
        <input readOnly tabIndex={-1} value="A text field" aria-label="Sample field" className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" tabIndex={-1}>
            Primary
          </Button>
          <Button size="sm" variant="secondary" tabIndex={-1}>
            Secondary
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface UiCustomizationFieldsProps {
  value: UiSettings;
  onChange: (value: UiSettings) => void;
  workspaceName?: string;
  className?: string;
}

export function UiCustomizationFields({ value, onChange, workspaceName = "", className }: UiCustomizationFieldsProps) {
  const id = useId();
  const set = (key: UiKey, next: string) => onChange({ ...value, [key]: next } as UiSettings);
  const changed = (Object.keys(DEFAULT_UI) as UiKey[]).some(key => value[key] !== DEFAULT_UI[key]);

  return (
    <div className={cn("grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]", className)}>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium">Start from</span>
          {PRESETS.map(preset => (
            <Button key={preset.label} variant="secondary" size="sm" onClick={() => onChange({ ...value, ...preset.value })}>
              {preset.label}
            </Button>
          ))}
          {changed && (
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...DEFAULT_UI })}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>
        {GROUPS.map(group => (
          <fieldset key={group.id} className="flex min-w-0 flex-col gap-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">{group.title}</legend>
            {UI_FIELDS.filter(field => field.group === group.id).map(field => (
              <div key={field.key} className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-medium" id={`${id}-${field.key}`}>
                    {field.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{field.hint}</span>
                </div>
                <div aria-labelledby={`${id}-${field.key}`} role="group">
                  <Segmented name={`${id}-${field.key}`} value={value[field.key]} options={UI_OPTIONS[field.key]} labels={field.labels} onChange={next => set(field.key, next)} />
                </div>
              </div>
            ))}
          </fieldset>
        ))}
        <p className="text-xs text-muted-foreground">These apply on top of the default style for everyone in the workspace, on its sign-in and password pages too. Custom CSS (Branding) can go further.</p>
      </div>
      <aside className="min-w-0 lg:sticky lg:top-16 lg:self-start">
        <UiPreview value={value} workspaceName={workspaceName} />
      </aside>
    </div>
  );
}
