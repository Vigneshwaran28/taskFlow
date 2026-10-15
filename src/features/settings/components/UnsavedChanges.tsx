"use client";
// Unsaved changes on the Settings page: forms report whether they have any, and the page asks before switching tabs
// (and the browser before leaving) while something is unsaved.
import { createContext, useContext, useEffect, type ReactNode } from "react";

type Report = (id: string, dirty: boolean) => void;

const UnsavedContext = createContext<Report>(() => {});

export function UnsavedChangesProvider({ report, children }: { report: Report; children: ReactNode }) {
  return <UnsavedContext.Provider value={report}>{children}</UnsavedContext.Provider>;
}

/** The reporter itself, for components that pass it on (e.g. to a panel's onDirtyChange). */
export const useUnsavedReporter = () => useContext(UnsavedContext);

/** Tells the page whether the form `id` has unsaved changes; cleared when the form goes away. */
export function useReportUnsaved(id: string, dirty: boolean) {
  const report = useContext(UnsavedContext);
  useEffect(() => {
    report(id, dirty);
  }, [report, id, dirty]);
  useEffect(() => () => report(id, false), [report, id]);
}
