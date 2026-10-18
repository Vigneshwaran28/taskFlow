"use client";
// Presentational: a workspace's logo (an icon on the brand colour, or an image link) and the app's background picture.
// Used by the provider console (tenant dialog) and the workspace's own Settings → Branding.
import { useId, useState } from "react";
import { ImageOff, Sparkles } from "lucide-react";
import { LOGO_ICON_KEYS, LOGO_ICONS, LogoGlyph } from "@/components/shared/logoIcons";
import { LogoIconPickerModal } from "@/components/shared/LogoIconPickerModal";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ACCENT_META, isSafeImageUrl, type Accent } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

export interface BrandAssets {
  logoIcon?: string;
  logoUrl?: string;
  backgroundImage?: string;
  backgroundDim?: number;
}

export type BrandAssetsErrors = Partial<Record<"logoUrl" | "backgroundImage", string>>;

const LINK_PROBLEM = "Use an image link starting with https:// (no spaces or quotes).";

/** Same rule as the server: empty, or an http(s) link that is safe inside CSS url(). */
export function validateBrandAssets(value: BrandAssets): BrandAssetsErrors {
  const errors: BrandAssetsErrors = {};
  if (value.logoUrl?.trim() && !isSafeImageUrl(value.logoUrl.trim())) errors.logoUrl = LINK_PROBLEM;
  if (value.backgroundImage?.trim() && !isSafeImageUrl(value.backgroundImage.trim())) errors.backgroundImage = LINK_PROBLEM;
  return errors;
}

export interface BrandAssetsFieldsProps {
  value: BrandAssets;
  onChange: (changes: BrandAssets) => void;
  accent: Accent;
  title: string;
  errors?: BrandAssetsErrors;
}

export function BrandAssetsFields({ value, onChange, accent, title, errors = {} }: BrandAssetsFieldsProps) {
  const id = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const icon = value.logoIcon ?? "check";
  const isClassic = LOGO_ICON_KEYS.includes(icon);
  const logoUrl = value.logoUrl?.trim() ?? "";
  const background = value.backgroundImage?.trim() ?? "";
  const dim = value.backgroundDim ?? 40;
  const logoOk = isSafeImageUrl(logoUrl);
  const backgroundOk = isSafeImageUrl(background);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <fieldset className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-medium">Logo</legend>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPickerOpen(true)}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Browse Icon Packs (200+)</span>
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          {logoOk ? (
            // eslint-disable-next-line @next/next/no-img-element -- previewing the workspace's own image link
            <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-card object-contain" referrerPolicy="no-referrer" />
          ) : (
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white", ACCENT_META[accent].swatch)} aria-hidden="true">
              <LogoGlyph name={icon} className="h-5 w-5" strokeWidth={2.5} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{title}</span>
            <span className="block text-xs text-muted-foreground">Sidebar, sign-in page, and browser tab icon</span>
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPickerOpen(true)}
            className="shrink-0 text-xs"
          >
            Change icon
          </Button>
        </div>

        {!isClassic && (
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-md text-white shadow-xs", ACCENT_META[accent].swatch)}>
                <LogoGlyph name={icon} className="h-4 w-4" />
              </span>
              <div>
                <span className="font-semibold text-foreground">
                  Custom icon active: <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{icon}</code>
                </span>
                <span className="block text-[11px] text-muted-foreground">Chosen from multi-library icon packs</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="font-medium text-primary hover:underline"
            >
              Change
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Quick pick common icons:</span>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Open icon picker &rarr;
            </button>
          </div>
          <div role="radiogroup" aria-label="Logo icon" className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {LOGO_ICON_KEYS.map(key => {
              const selected = icon === key;
              return (
                <label
                  key={key}
                  title={LOGO_ICONS[key].label}
                  className={cn(
                    "flex h-10 cursor-pointer items-center justify-center rounded-lg border transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    selected ? "border-primary bg-accent text-accent-foreground shadow-xs" : "text-muted-foreground hover:bg-muted",
                    logoOk && "opacity-50"
                  )}
                >
                  <input type="radio" name={`${id}-icon`} value={key} checked={selected} onChange={() => onChange({ logoIcon: key })} className="sr-only" />
                  <LogoGlyph name={key} className="h-5 w-5" />
                  <span className="sr-only">{LOGO_ICONS[key].label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <LogoIconPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          currentIcon={icon}
          onSelect={key => onChange({ logoIcon: key })}
          accent={accent}
          title={title}
        />

        <TextField
          label="Logo image link (optional)"
          type="url"
          inputMode="url"
          placeholder="https://example.com/logo.png"
          value={value.logoUrl ?? ""}
          error={errors.logoUrl}
          hint="A square PNG or SVG works best. Used instead of the icon."
          onChange={event => onChange({ logoUrl: event.target.value })}
        />
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Background picture</legend>
        <TextField
          label="Image link"
          type="url"
          inputMode="url"
          placeholder="https://example.com/office.jpg"
          value={value.backgroundImage ?? ""}
          error={errors.backgroundImage}
          hint="Shown behind the app for everyone (people can switch it off for themselves). Leave empty for none."
          onChange={event => onChange({ backgroundImage: event.target.value })}
        />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="flex justify-between font-medium">
            Dim the picture <span className="tabular-nums text-muted-foreground">{dim}%</span>
          </span>
          <input type="range" min={0} max={90} step={5} value={dim} onChange={event => onChange({ backgroundDim: Number(event.target.value) })} className="accent-primary" />
          <span className="text-xs text-muted-foreground">More dimming keeps text easy to read over busy pictures.</span>
        </label>
        <div
          aria-hidden="true"
          className="relative flex h-24 items-end overflow-hidden rounded-lg border bg-background bg-cover bg-center p-2"
          style={backgroundOk ? { backgroundImage: `url("${background}")` } : undefined}
        >
          <span className="absolute inset-0 bg-background" style={{ opacity: backgroundOk ? dim / 100 : 1 }} />
          {backgroundOk ? (
            <span className="relative rounded-md border bg-card px-2 py-1 text-xs shadow-sm">A card over the picture</span>
          ) : (
            <span className="relative flex items-center gap-1.5 text-xs text-muted-foreground">
              <ImageOff className="h-4 w-4" />
              No background picture
            </span>
          )}
        </div>
      </fieldset>
    </div>
  );
}
