"use client";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundMuted, playTicketChime, setSoundMuted } from "@/lib/sound";
import { useToast } from "./Toaster";

export function SoundToggle({ className }: { className?: string }) {
  const [muted, setMuted] = useState(() => isSoundMuted());
  const toast = useToast();

  useEffect(() => {
    const onChange = (e: Event) => {
      const custom = e as CustomEvent<{ muted: boolean }>;
      setMuted(custom.detail?.muted ?? isSoundMuted());
    };
    window.addEventListener("tf:sound_muted_change", onChange);
    return () => window.removeEventListener("tf:sound_muted_change", onChange);
  }, []);

  function toggle() {
    const next = !muted;
    setSoundMuted(next);
    setMuted(next);
    if (!next) {
      playTicketChime();
      toast.info("Sound alerts enabled", "You will hear audio chimes for meetings and assigned tickets.");
    } else {
      toast.info("Sound alerts muted", "Audio chimes are now silenced.");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={muted ? "Unmute sound alerts" : "Mute sound alerts (Meetings & Tickets)"}
      aria-label={muted ? "Unmute sound alerts" : "Mute sound alerts"}
      className={
        className ||
        "relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      }
    >
      {muted ? <VolumeX className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" /> : <Volume2 className="h-5 w-5 text-primary" aria-hidden="true" />}
    </button>
  );
}
