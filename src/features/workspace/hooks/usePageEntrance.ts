"use client";
// Plays the workspace's page entrance (branding.ui.pageTransition) on the main content whenever the page changes. The
// Web Animations API replays it without remounting the page (its state survives); nothing plays when the workspace
// chose none, the animation level is "none", or the person (or their device) reduces motion.
import { useEffect, type RefObject } from "react";

const DURATIONS: Record<string, number> = { slow: 420, normal: 260, fast: 160 };

const KEYFRAMES: Record<string, Keyframe[]> = {
  fade: [{ opacity: 0 }, { opacity: 1 }],
  slide: [
    { opacity: 0, transform: "translateY(10px)" },
    { opacity: 1, transform: "none" },
  ],
  zoom: [
    { opacity: 0, transform: "scale(0.985)" },
    { opacity: 1, transform: "none" },
  ],
};

export function usePageEntrance(ref: RefObject<HTMLElement | null>, pageKey: string) {
  useEffect(() => {
    const element = ref.current;
    const root = document.documentElement;
    const kind = root.dataset.uiPageTransition;
    if (!element || !kind || !KEYFRAMES[kind] || typeof element.animate !== "function") return;
    if (root.dataset.motion === "reduce" || root.dataset.uiAnimation === "none" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = element.animate(KEYFRAMES[kind], { duration: DURATIONS[root.dataset.uiSpeed ?? "normal"] ?? 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    return () => animation.cancel();
  }, [ref, pageKey]);
}
