"use client";
// Settings → Appearance → Background picture: the workspace's picture (default), none, or the person's own image link,
// with dimming and customizable text color. Auto-detects top 3 contrasting text colors from the image and allows
// custom color picking with real-time preview.
import { useEffect, useState } from "react";
import { Check, ImageOff, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { isSafeImageUrl, type AppearancePreferences } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import { extractTopColors, isLightColor } from "../utils/colorExtractor";

type BackgroundKey = "backgroundImage" | "backgroundDim" | "backgroundTextColor";
type Mode = "workspace" | "none" | "custom";

const LINK_PROBLEM = "Use an image link starting with https:// (no spaces or quotes).";

export interface BackgroundPickerProps {
  preferences: Pick<AppearancePreferences, BackgroundKey>;
  workspaceImage: string;
  workspaceDim: number;
  /** Applies on this device only (while dragging slider or color picker) */
  onPreview: <K extends BackgroundKey>(key: K, value: AppearancePreferences[K]) => void;
  /** Applies and saves to the account */
  onSave: <K extends BackgroundKey>(key: K, value: AppearancePreferences[K]) => void;
  chipClass: (active: boolean) => string;
}

const modeOf = (image: string | null): Mode => (image === null ? "workspace" : image === "none" ? "none" : "custom");

/** Keyed by the saved picture in AppearanceSettings, so the draft starts from it again after every change. */
export function BackgroundPicker({ preferences, workspaceImage, workspaceDim, onPreview, onSave, chipClass }: BackgroundPickerProps) {
  const savedMode = modeOf(preferences.backgroundImage);
  const savedLink = savedMode === "custom" ? (preferences.backgroundImage ?? "") : "";
  // Picking "My own picture" only opens the link field; the saved choice changes when a link is used.
  const [choosingOwn, setChoosingOwn] = useState(false);
  const [draft, setDraft] = useState(savedLink);
  const [touched, setTouched] = useState(false);
  const mode: Mode = choosingOwn ? "custom" : savedMode;
  const link = draft.trim();
  const linkOk = isSafeImageUrl(link);
  const error = touched && link && !linkOk ? LINK_PROBLEM : null;
  const dim = preferences.backgroundDim ?? workspaceDim;
  // What the preview shows: the link being typed, else what's in use.
  const previewImage = mode === "custom" ? (linkOk ? link : null) : mode === "workspace" && isSafeImageUrl(workspaceImage) ? workspaceImage : null;

  const [suggestedColors, setSuggestedColors] = useState<[string, string, string]>(["#ffffff", "#fef08a", "#0f172a"]);
  const [customDraft, setCustomDraft] = useState(preferences.backgroundTextColor ?? "");
  const [prevColor, setPrevColor] = useState(preferences.backgroundTextColor);

  // Sync draft during render when preference changes externally
  if (preferences.backgroundTextColor !== prevColor) {
    setPrevColor(preferences.backgroundTextColor);
    setCustomDraft(preferences.backgroundTextColor ?? "");
  }

  const activeTextColor = preferences.backgroundTextColor;

  // Auto-detect contrasting colors whenever the background image changes
  useEffect(() => {
    if (!previewImage) return;
    let active = true;
    extractTopColors(previewImage).then(colors => {
      if (active) setSuggestedColors(colors);
    });
    return () => {
      active = false;
    };
  }, [previewImage]);

  const options: readonly { value: Mode; label: string }[] = [
    { value: "workspace", label: workspaceImage ? "Use workspace picture" : "Workspace default (none)" },
    { value: "none", label: "No picture" },
    { value: "custom", label: "My own picture" },
  ];

  function pick(next: Mode) {
    if (next === "custom") {
      setChoosingOwn(true);
      // A link that was in use before (or is already typed) applies right away.
      if (linkOk && link !== preferences.backgroundImage) onSave("backgroundImage", link);
      return;
    }
    setChoosingOwn(false);
    setTouched(false);
    onSave("backgroundImage", next === "workspace" ? null : "none");
  }

  function applyLink() {
    setTouched(true);
    if (!linkOk) return;
    onSave("backgroundImage", link);
  }

  function handleColorSelect(color: string | null) {
    onPreview("backgroundTextColor", color);
    onSave("backgroundTextColor", color);
    if (color) setCustomDraft(color);
  }

  const isLight = activeTextColor ? isLightColor(activeTextColor) : true;
  const sampleShadow = activeTextColor
    ? isLight
      ? "0 1px 3px rgba(0, 0, 0, 0.7), 0 0 1px rgba(0, 0, 0, 0.5)"
      : "0 1px 2px rgba(255, 255, 255, 0.8), 0 0 1px rgba(255, 255, 255, 0.4)"
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Background picture" className="flex flex-wrap gap-2">
        {options.map(option => (
          <label key={option.value} className={chipClass(mode === option.value)}>
            <input type="radio" name="background" value={option.value} checked={mode === option.value} onChange={() => pick(option.value)} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>

      {mode === "custom" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <TextField
            label="Picture link"
            type="url"
            inputMode="url"
            className="min-w-0 flex-1"
            placeholder="https://example.com/wallpaper.jpg"
            value={draft}
            error={error}
            hint={link === savedLink && linkOk ? "In use." : "Paste a link to a picture, then choose Use picture."}
            onChange={event => {
              setDraft(event.target.value);
              setTouched(true);
            }}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
            }}
          />
          <Button variant="secondary" className="sm:mt-6.5" onClick={applyLink} disabled={!link || link === savedLink}>
            Use picture
          </Button>
        </div>
      )}

      {/* Preview: shows both canvas text and a card over the picture */}
      <div
        aria-hidden="true"
        className="relative flex h-36 max-w-md flex-col justify-between overflow-hidden rounded-xl border bg-background bg-cover bg-center p-3 shadow-inner"
        style={previewImage ? { backgroundImage: `url("${previewImage}")` } : undefined}
        data-background-preview
      >
        <span className="absolute inset-0 bg-background transition-opacity" style={{ opacity: previewImage ? dim / 100 : 1 }} />
        {previewImage ? (
          <>
            <div className="relative z-10 flex flex-col gap-0.5">
              <span
                className="text-sm font-semibold tracking-tight transition-colors"
                style={{
                  color: activeTextColor ?? "inherit",
                  textShadow: sampleShadow,
                }}
              >
                Good evening, Vigneshwaran
              </span>
              <p
                className="text-xs transition-colors"
                style={{
                  color: activeTextColor ? `${activeTextColor}dd` : undefined,
                  textShadow: sampleShadow,
                }}
              >
                titan · Wednesday, October 28
              </p>
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <span className="rounded-md border bg-card px-2.5 py-1 text-xs font-medium shadow-xs">
                A card over the picture
              </span>
              {activeTextColor && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-mono font-medium backdrop-blur-xs"
                  style={{
                    backgroundColor: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)",
                    color: isLight ? "#ffffff" : "#000000",
                  }}
                >
                  {activeTextColor}
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="relative flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImageOff className="h-4 w-4" />
            {mode === "custom" ? "Paste a picture link to preview it" : "No background picture"}
          </span>
        )}
      </div>

      {mode !== "none" && (
        <label className={cn("flex max-w-md flex-col gap-1.5 text-sm", !previewImage && "opacity-60")}>
          <span className="flex justify-between font-medium">
            Dim the picture <span className="tabular-nums text-muted-foreground">{dim}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={dim}
            onChange={event => onPreview("backgroundDim", Number(event.target.value))}
            onPointerUp={event => onSave("backgroundDim", Number(event.currentTarget.value))}
            onKeyUp={event => onSave("backgroundDim", Number(event.currentTarget.value))}
            className="accent-primary"
          />
          <span className="text-xs text-muted-foreground">More dimming keeps text easy to read over busy pictures.</span>
        </label>
      )}

      {/* Text color customization over background picture */}
      {mode !== "none" && previewImage && (
        <div className="flex max-w-md flex-col gap-3 rounded-xl border bg-card/40 p-3.5 text-sm shadow-xs backdrop-blur-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                Text color over background
              </span>
              <p className="text-xs text-muted-foreground">Pick a color for page titles, tabs, and greetings to stay crisp and readable.</p>
            </div>
            {activeTextColor && (
              <button
                type="button"
                onClick={() => handleColorSelect(null)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                title="Reset to default theme color"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          {/* Top 3 Auto-detected color suggestions */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Suggested for this picture</span>
            <div className="grid grid-cols-3 gap-2">
              {suggestedColors.map((color, index) => {
                const isSelected = activeTextColor?.toLowerCase() === color.toLowerCase();
                const light = isLightColor(color);
                return (
                  <button
                    key={`${color}-${index}`}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    title={`Apply ${color}`}
                    className={cn(
                      "group relative flex h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-all shadow-xs",
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 border-primary scale-[1.02]"
                        : "border-border/80 hover:scale-[1.02] hover:border-border"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    <span
                      className="flex items-center gap-1 text-[11px] uppercase tracking-wider"
                      style={{ color: light ? "#0f172a" : "#ffffff" }}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      {color}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom color picker */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
            <span className="text-xs font-medium text-muted-foreground">Or set your own color:</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="bg-text-color-native"
                value={activeTextColor ?? (suggestedColors[0] || "#ffffff")}
                onChange={event => {
                  const val = event.target.value;
                  setCustomDraft(val);
                  onPreview("backgroundTextColor", val);
                }}
                onBlur={event => {
                  onSave("backgroundTextColor", event.target.value);
                }}
                className="h-7 w-8 cursor-pointer rounded border border-border p-0.5 bg-background shadow-2xs"
                aria-label="Choose custom text color from color picker"
              />
              <input
                type="text"
                placeholder="#FFFFFF"
                value={customDraft}
                maxLength={7}
                onChange={event => {
                  const val = event.target.value;
                  setCustomDraft(val);
                  if (/^#[0-9a-fA-F]{6}$/.test(val) || /^#[0-9a-fA-F]{3}$/.test(val)) {
                    onPreview("backgroundTextColor", val);
                    onSave("backgroundTextColor", val);
                  }
                }}
                className="h-7 w-22 rounded border border-input bg-background px-2 font-mono text-xs uppercase text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Only on your account, and only inside the app. Pictures load from the link you give, so use one you trust.</p>
    </div>
  );
}
