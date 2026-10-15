// Display metadata for stock movements and levels. Complete class names only.
import type { ComponentType } from "react";
import { ArrowDownToLine, ArrowUpFromLine, RotateCcw, ShoppingCart, SlidersHorizontal } from "lucide-react";
import type { Tone } from "@/components/ui/Badge";
import type { MovementType } from "../services/inventoryService";

export interface MovementMeta {
  label: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
}

export const MOVEMENT_TYPES: Readonly<Record<MovementType, MovementMeta>> = Object.freeze({
  in: { label: "Stock in", icon: ArrowDownToLine, tone: "success" },
  out: { label: "Stock out", icon: ArrowUpFromLine, tone: "warning" },
  adjust: { label: "Count adjustment", icon: SlidersHorizontal, tone: "info" },
  sale: { label: "Sold", icon: ShoppingCart, tone: "primary" },
  return: { label: "Returned", icon: RotateCcw, tone: "neutral" },
});

/** Stock level label for a product: tone + text, never color alone. */
export function stockLevel(product: { quantity: number; reorderLevel: number }): { label: string; tone: Tone } {
  if (product.quantity <= 0) return { label: "Out of stock", tone: "danger" };
  if (product.quantity <= product.reorderLevel) return { label: "Low stock", tone: "warning" };
  return { label: "In stock", tone: "success" };
}

export const UNITS = ["pcs", "box", "pack", "kg", "g", "l", "ml", "m", "set", "pair"];
