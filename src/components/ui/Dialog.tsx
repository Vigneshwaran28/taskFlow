"use client";
// Accessible modal built on the native <dialog>: focus trap, Escape to close, and focus restore come from the browser.
import { useEffect, useId, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
  /** Fixed header content below title/description (e.g. tabs, search, menu) that stays pinned at the top */
  headContent?: ReactNode;
}

// The page behind an open modal must not scroll (the native <dialog> doesn't lock it). Counted, so stacked
// dialogs (a confirm over a form) only unlock when the last one closes. The scrollbar's width is kept as padding
// so the page doesn't shift sideways.
let scrollLocks = 0;
function lockPageScroll() {
  const root = document.documentElement;
  if (scrollLocks++ === 0) {
    const gap = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (gap > 0) root.style.paddingRight = `${gap}px`;
  }
  return () => {
    if (--scrollLocks === 0) {
      root.style.overflow = "";
      root.style.paddingRight = "";
    }
  };
}

export function Dialog({ open, onClose, title, description, size = "md", children, footer, headContent }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Sync React state with the DOM dialog API (external system → effect is correct).
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => (open ? lockPageScroll() : undefined), [open]);

  function handleCancel(event: SyntheticEvent) {
    event.preventDefault(); // keep React as the source of truth
    onClose();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === ref.current) onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={cn(
        "m-auto w-[calc(100%-1.5rem)] rounded-2xl sm:w-[calc(100%-2rem)] border bg-card p-0 text-foreground shadow-2xl overflow-hidden",
        { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size]
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col overflow-hidden">
          {/* Fixed header containing title, close button, and any menu/tabs */}
          <div className="shrink-0 border-b bg-card">
            <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold wrap-break-word">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {headContent && <div className="border-t border-border/50 bg-card px-4 sm:px-6">{headContent}</div>}
          </div>

          {/* The sole scrollable container inside the dialog */}
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">{children}</div>

          {/* Fixed footer */}
          {footer && <div className="shrink-0 flex flex-wrap justify-end gap-2 border-t bg-muted/40 px-4 py-3 sm:px-6 sm:py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
