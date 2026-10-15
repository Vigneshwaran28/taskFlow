"use client";
// Settings → Appearance → Background picture: the workspace's picture (default), none, or the person's own image link,
// with dimming. "My own picture" opens the link field without changing anything until a valid link is used; the
// preview shows the picture (dimmed) before it's applied.
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { isSafeImageUrl, type AppearancePreferences } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

type BackgroundKey = "backgroundImage" | "backgroundDim";
type Mode = "workspace" | "none" | "custom";

const LINK_PROBLEM = "Use an image link starting with https:// (no spaces or quotes).";

export interface BackgroundPickerProps {
  preferences: Pick<AppearancePreferences, BackgroundKey>;
  workspaceImage: string;
  workspaceDim: number;
  /** Applies on this device only (while dragging the slider) */
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

      {/* Preview: a card over the picture, dimmed as it will be. */}
      <div
        aria-hidden="true"
        className="relative flex h-28 max-w-md items-end overflow-hidden rounded-lg border bg-background bg-cover bg-center p-2"
        style={previewImage ? { backgroundImage: `url("${previewImage}")` } : undefined}
        data-background-preview
      >
        <span className="absolute inset-0 bg-background" style={{ opacity: previewImage ? dim / 100 : 1 }} />
        {previewImage ? (
          <span className="relative rounded-md border bg-card px-2 py-1 text-xs shadow-sm">A card over the picture</span>
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
      <p className="text-xs text-muted-foreground">Only on your account, and only inside the app. Pictures load from the link you give, so use one you trust.</p>
    </div>
  );
}
