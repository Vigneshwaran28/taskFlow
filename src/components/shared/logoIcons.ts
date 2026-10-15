// Logo icons a workspace can pick (server/src/services/moduleSettings.js LOGO_ICONS): shown on the brand colour in the
// sidebar, on the sign-in page, and as the browser tab's icon.
import { createElement, type ComponentType } from "react";
import {
  Briefcase,
  Building2,
  Check,
  Coffee,
  Globe,
  GraduationCap,
  HeartPulse,
  Landmark,
  Layers,
  Leaf,
  Package,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";

type IconComponent = ComponentType<{ className?: string; strokeWidth?: number; color?: string; size?: number }>;

export const LOGO_ICONS: Readonly<Record<string, { icon: IconComponent; label: string }>> = Object.freeze({
  check: { icon: Check, label: "Tick" },
  briefcase: { icon: Briefcase, label: "Briefcase" },
  building: { icon: Building2, label: "Building" },
  store: { icon: Store, label: "Store" },
  rocket: { icon: Rocket, label: "Rocket" },
  zap: { icon: Zap, label: "Lightning" },
  star: { icon: Star, label: "Star" },
  "heart-pulse": { icon: HeartPulse, label: "Health" },
  stethoscope: { icon: Stethoscope, label: "Clinic" },
  truck: { icon: Truck, label: "Truck" },
  package: { icon: Package, label: "Package" },
  "graduation-cap": { icon: GraduationCap, label: "Education" },
  leaf: { icon: Leaf, label: "Leaf" },
  globe: { icon: Globe, label: "Globe" },
  shield: { icon: Shield, label: "Shield" },
  layers: { icon: Layers, label: "Layers" },
  sparkles: { icon: Sparkles, label: "Sparkles" },
  coffee: { icon: Coffee, label: "Coffee" },
  wrench: { icon: Wrench, label: "Tools" },
  landmark: { icon: Landmark, label: "Institution" },
});

export const LOGO_ICON_KEYS = Object.freeze(Object.keys(LOGO_ICONS));

/** The icon component for a key (the tick for unknown keys). */
export const logoIcon = (key: string | null | undefined) => (LOGO_ICONS[key ?? ""] ?? LOGO_ICONS.check).icon;

/** Renders a logo icon by name (a stable component, so callers don't pick a component during render). */
export function LogoGlyph({ name, ...props }: { name?: string | null; className?: string; strokeWidth?: number; color?: string; size?: number }) {
  return createElement(logoIcon(name), props);
}
