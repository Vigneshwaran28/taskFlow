"use client";
import { useState, useSyncExternalStore } from "react";
import { BellRing } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type PermissionState = NotificationPermission | "unsupported";

const STATUS: Record<PermissionState, { label: string; tone: Tone }> = {
  granted: { label: "Enabled", tone: "success" },
  denied: { label: "Blocked", tone: "danger" },
  default: { label: "Not enabled", tone: "neutral" },
  unsupported: { label: "Not supported", tone: "neutral" },
};

const readPermission = (): PermissionState => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);
const subscribeNever = () => () => {};

export function NotificationSettings() {
  // The browser's permission (read after hydration); `requested` holds the answer to our own prompt.
  const browserPermission = useSyncExternalStore(subscribeNever, readPermission, () => "unsupported" as const);
  const [requested, setRequested] = useState<NotificationPermission | null>(null);
  const permission = requested ?? browserPermission;

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setRequested(result);
    if (result === "granted") new Notification("TaskFlow reminders are on", { body: "You'll be notified when a reminder is due." });
  }

  const status = STATUS[permission];

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <BellRing className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Desktop notifications</p>
            <p className="text-xs text-muted-foreground">Pop-up alerts when a reminder is due, even in another tab.</p>
          </div>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {permission === "default" && (
        <div>
          <Button variant="secondary" onClick={() => void requestPermission()}>
            Enable desktop notifications
          </Button>
        </div>
      )}
      {permission === "denied" && <p className="text-sm text-muted-foreground">Notifications are blocked. Allow them for this site in your browser settings.</p>}
      <p className="text-xs text-muted-foreground">In-app reminders always appear under the bell icon while TaskFlow is open.</p>
    </div>
  );
}
