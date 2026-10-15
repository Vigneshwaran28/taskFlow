"use client";
import { GuestOnly } from "@/app-shell/guards";
import { WorkspaceLoginPage } from "@/features/auth";

/** A workspace's own sign-in page (/<workspace>/login). Signed-in people go straight to their workspace. */
export default function Page() {
  return (
    <GuestOnly>
      <WorkspaceLoginPage />
    </GuestOnly>
  );
}
