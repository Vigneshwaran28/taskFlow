"use client";
// "?action=<name>" in the URL opens a page's create dialog once (the command palette's quick actions link here),
// then the parameter is dropped so a refresh or the back button doesn't reopen it.
import { useEffect, useRef } from "react";
import { useSearchParamsState } from "./navigation";

export function useActionParam(action: string, trigger: () => void, enabled = true) {
  const [params, setParams] = useSearchParamsState();
  const wanted = enabled && params.get("action") === action;
  const triggerRef = useRef(trigger);
  const handled = useRef(false);
  useEffect(() => {
    triggerRef.current = trigger;
  });
  // Reacting to the URL (an external system) once per arrival.
  useEffect(() => {
    if (!wanted) {
      handled.current = false;
      return;
    }
    if (handled.current) return; // the URL hasn't caught up with the removal yet
    handled.current = true;
    triggerRef.current();
    setParams(current => {
      current.delete("action");
      return current;
    });
  }, [wanted, setParams]);
}
