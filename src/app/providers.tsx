"use client";
import { HydrationBoundary, QueryClientProvider, type DehydratedState } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import { AuthProvider } from "@/features/auth/components/auth-provider";
import type { ReactNode } from "react";
import { DraftNavigationProvider } from "@/lib/navigation/draft-navigation";

export function AppProviders({ state, children }: { state: DehydratedState; children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}><HydrationBoundary state={state}><DraftNavigationProvider><AuthProvider>{children}</AuthProvider></DraftNavigationProvider></HydrationBoundary></QueryClientProvider>;
}
