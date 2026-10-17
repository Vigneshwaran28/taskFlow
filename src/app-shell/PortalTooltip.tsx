"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface PortalTooltipProps {
  label: ReactNode;
  position: "left" | "right";
  visible: boolean;
  anchorRect: DOMRect | null;
}

/**
 * High-performance Portal-based tooltip that renders directly into document.body.
 * Guarantees zero clipping from parent overflow-y-auto/scroll containers and zero layout overlap.
 */
export function PortalTooltip({ label, position, visible, anchorRect }: PortalTooltipProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client portal mounting
    setMounted(true);
  }, []);

  if (!mounted || !visible || !anchorRect || typeof document === "undefined") return null;

  const top = anchorRect.top + anchorRect.height / 2;
  const isRightSidebar = position === "right";

  const style = isRightSidebar
    ? {
        top: `${top}px`,
        right: `${window.innerWidth - anchorRect.left + 10}px`,
        transform: "translateY(-50%)",
      }
    : {
        top: `${top}px`,
        left: `${anchorRect.right + 10}px`,
        transform: "translateY(-50%)",
      };

  return createPortal(
    <div
      role="tooltip"
      style={style}
      className={cn(
        "pointer-events-none fixed z-[9999] whitespace-nowrap rounded-lg border border-border/80 bg-popover/95 px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-xl backdrop-blur-xs animate-in fade-in zoom-in-95 duration-100"
      )}
    >
      {label}
    </div>,
    document.body
  );
}
