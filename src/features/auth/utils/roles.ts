import type { Tone } from "@/components/ui/Badge";
import type { RoleRef } from "@/types/session";

/** Badge styles for the built-in roles (custom roles use the neutral style). */
export const ROLE_META: Record<string, { label: string; tone: Tone }> = Object.freeze({
  owner: { label: "Owner", tone: "warning" },
  admin: { label: "Admin", tone: "primary" },
  agent: { label: "Agent", tone: "info" },
  member: { label: "Member", tone: "neutral" },
});

/** Badge tone for a role: built-in roles have their own colour. */
export const roleTone = (role: Pick<RoleRef, "key"> | null | undefined): Tone => (role?.key ? ROLE_META[role.key]?.tone : undefined) ?? "neutral";
