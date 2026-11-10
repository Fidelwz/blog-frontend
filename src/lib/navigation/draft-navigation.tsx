"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { installUnsavedChanges } from "./unsaved-changes.ts";

type Blocker = () => boolean;
const Context = createContext<Set<Blocker> | null>(null);
export function DraftNavigationProvider({ children }: { children: ReactNode }) {
  const [blockers] = useState(() => new Set<Blocker>());
  useEffect(() => installUnsavedChanges(window, () => [...blockers].some(blocked => blocked())), [blockers]);
  return <Context.Provider value={blockers}>{children}</Context.Provider>;
}
export function useDraftNavigation(dirty: boolean) {
  const blockers = useContext(Context);
  const allowed = useRef(false);
  useEffect(() => {
    const blocked = () => dirty && !allowed.current;
    blockers?.add(blocked);
    return () => { blockers?.delete(blocked); };
  }, [blockers, dirty]);
  return { allowNavigation: () => { allowed.current = true; } };
}
