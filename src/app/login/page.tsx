"use client";
import { LoginPage } from "@/features/auth";

/** The main sign-in page. Not guest-only: someone signed in to one workspace can sign in to another here too. */
export default function Page() {
  return <LoginPage />;
}
