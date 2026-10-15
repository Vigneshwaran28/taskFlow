// The maintenance window the API reported (503 MAINTENANCE), shared by the API client and the maintenance gate.
// Outside React on purpose: any request can report it, and the gate (app/providers.tsx) shows the maintenance page.
import { useSyncExternalStore } from "react";

export interface MaintenanceWindow {
  /** platform = every workspace; workspace = only this one */
  scope: "platform" | "workspace";
  message: string;
  startsAt: string | null;
  /** Expected end (the window ends by itself then); null = until the provider switches it off */
  endsAt: string | null;
  /** Workspace owners and admins can still sign in */
  allowAdmins: boolean;
}

/** { active, upcoming } as the session, sign-in page, and status endpoint report it. */
export interface MaintenanceInfo {
  active: MaintenanceWindow | null;
  upcoming: MaintenanceWindow | null;
}

let current: MaintenanceWindow | null = null;
const listeners = new Set<() => void>();

export function reportMaintenance(window: MaintenanceWindow | null) {
  if (JSON.stringify(window) === JSON.stringify(current)) return;
  current = window;
  listeners.forEach(listener => listener());
}

export const getMaintenance = () => current;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The window that closed the app, or null. */
export const useReportedMaintenance = () => useSyncExternalStore(subscribe, getMaintenance, () => null);
