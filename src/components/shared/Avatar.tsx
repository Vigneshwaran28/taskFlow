"use client";
import { useState } from "react";
import { isSafeImageUrl } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

/** First letters of the first two words: "Asha Rao" -> "AR". */
export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join("");
}

// A stable soft color per person, so the same name always gets the same circle.
const TONES = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
];

const SIZES = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base", xl: "h-16 w-16 text-xl" };

export interface AvatarProps {
  name?: string;
  /** Profile picture link; only safe http(s) links are used, and initials show if it's missing or fails to load */
  imageUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  /** Decorative (default) when the name is shown next to it; otherwise the picture is announced as the person's */
  decorative?: boolean;
}

export function Avatar({ name = "", imageUrl, size = "md", className, decorative = true }: AvatarProps) {
  const tone = TONES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];
  // The link that failed to load (a new link gets its own try).
  const [failed, setFailed] = useState<string | null>(null);
  const src = isSafeImageUrl(imageUrl) && failed !== imageUrl ? imageUrl : null;
  const label = name ? `${name}'s profile picture` : "Profile picture";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a person's own image link, any host
      <img
        src={src}
        alt={decorative ? "" : label}
        aria-hidden={decorative || undefined}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(src)}
        className={cn("inline-block shrink-0 rounded-full bg-muted object-cover", SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", SIZES[size], tone, className)}
    >
      {initials(name) || "?"}
    </span>
  );
}
