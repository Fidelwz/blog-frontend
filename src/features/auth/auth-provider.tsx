"use client";

import { createContext, useContext, useEffect } from "react";
import type { AuthSession } from "@/lib/auth/contracts";

const AuthContext = createContext<AuthSession>({ status: "anonymous", user: null });

export function AuthProvider({ session, children }: { session: AuthSession; children: React.ReactNode }) {
  useEffect(() => {
    // A restored browser snapshot must not display a session that was closed.
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
