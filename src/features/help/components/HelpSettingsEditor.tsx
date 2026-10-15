"use client";
// Workspace settings → Help & onboarding: whether new people get tours, the help centre, and which tours exist.
import { MODULES } from "@/app-shell/modules";
import { useCurrentUser } from "@/features/auth";
import { cn } from "@/lib/cn";
import type { FeatureKey, TourKey, WorkspaceSettings } from "@/types/session";
import { TOURS } from "../tours";

type HelpSettings = WorkspaceSettings["help"];

export const DEFAULT_HELP: HelpSettings = { enabled: true, autoStart: true, helpCenter: true, disabledTours: [], welcomeMessage: "" };

function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className={cn("flex items-start gap-3 rounded-lg border p-3", disabled && "opacity-60")}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

export interface HelpSettingsEditorProps {
  value: HelpSettings | undefined;
  onChange: (value: HelpSettings) => void;
  /** Licensed modules: only their tours are listed */
  features?: readonly FeatureKey[];
}

export function HelpSettingsEditor({ value, onChange, features: given }: HelpSettingsEditorProps) {
  // Inside a workspace: its licensed modules when the caller doesn't say.
  const { data: user } = useCurrentUser();
  const features = given ?? user?.tenant.features;
  const help = { ...DEFAULT_HELP, ...value };
  const set = <K extends keyof HelpSettings>(key: K, next: HelpSettings[K]) => onChange({ ...help, [key]: next });
  const tours = TOURS.filter(tour => !tour.feature || !features || features.includes(tour.feature));
  const toggleTour = (key: TourKey, on: boolean) => set("disabledTours", on ? help.disabledTours.filter(item => item !== key) : [...help.disabledTours, key]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Toggle label="Help and tours" hint="Off: no tours, tips, or help centre for anyone." checked={help.enabled} onChange={next => set("enabled", next)} />
        <Toggle label="Start tours automatically" hint="The welcome tour at a first sign-in, a module's tour at the first visit." checked={help.autoStart} disabled={!help.enabled} onChange={next => set("autoStart", next)} />
        <Toggle label="Help centre" hint="Guides and replayable tours in the ? menu." checked={help.helpCenter} disabled={!help.enabled} onChange={next => set("helpCenter", next)} />
      </div>
      <fieldset className={cn("flex flex-col gap-2", !help.enabled && "opacity-60")} disabled={!help.enabled}>
        <legend className="mb-1 text-sm font-medium">Tours</legend>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {tours.map(tour => {
            const Icon = tour.feature ? MODULES[tour.feature].icon : null;
            const on = !help.disabledTours.includes(tour.key);
            return (
              <li key={tour.key}>
                <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <input type="checkbox" checked={on} onChange={event => toggleTour(tour.key, event.target.checked)} className="h-4 w-4 shrink-0 rounded border-input accent-primary" />
                  {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="min-w-0 truncate">{tour.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{tour.steps.length} {tour.steps.length === 1 ? "step" : "steps"}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Welcome message (optional)</span>
        <textarea
          rows={3}
          maxLength={400}
          disabled={!help.enabled}
          placeholder="Shown on the first step of the welcome tour, e.g. who to ask for help."
          value={help.welcomeMessage}
          onChange={event => set("welcomeMessage", event.target.value)}
          className="w-full resize-y rounded-lg border border-input bg-card px-2.5 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        <span className="text-xs text-muted-foreground">{help.welcomeMessage.length} / 400</span>
      </label>
    </div>
  );
}
