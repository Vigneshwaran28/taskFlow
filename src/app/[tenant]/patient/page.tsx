"use client";
import { PatientPortalPage } from "@/features/clinic";

/** The clinic's patient portal (/<workspace>/patient): its own sign-in (patient number + PIN), no staff session or app shell. */
export default function Page() {
  return <PatientPortalPage />;
}
