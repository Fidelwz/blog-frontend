"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";
import { createAuthUiStore, type AuthUiState, type AuthUiStore } from "../store";
import { clearPrivateData, isAuthMutationActive, replaceSession, sessionKey } from "../cache";
import { useSession } from "../queries";
import { onSessionChange } from "../sync";
import { isPrivatePath, safeReturnPath } from "../utils";
import type { AuthSession } from "../types";
import { hasEditorDocument, refreshEditorSession } from "../editor-session";

const StoreContext = createContext<AuthUiStore | null>(null);
export function useAuthUiStore<T>(selector: (state: AuthUiState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error("AuthProvider is missing");
  return useStore(store, selector);
}

function SessionLifecycle({ store }: { store: AuthUiStore }) {
  const client = useQueryClient();
  const { session } = useSession();
  const mutating = useIsMutating({ mutationKey: ["auth"] }) > 0;
  const path = usePathname();
  const previous = useRef(session);

  useEffect(() => {
    const old = previous.current;
    previous.current = session;
    // A successful mutation owns navigation until the document is replaced,
    // including the interval after isPending becomes false.
    if (isAuthMutationActive(client)) return;
    if (old.user?.id !== session.user?.id || session.status === "suspended" || session.status === "expired") {
      void clearPrivateData(client);
      store.getState().reset();
      if (session.status === "suspended") store.getState().setNotice("suspended");
      else if (session.status === "expired" || (old.user && session.status === "anonymous")) store.getState().setNotice("expired");
    }
    if (!mutating && !hasEditorDocument(client) && ["anonymous", "expired", "suspended"].includes(session.status) && isPrivatePath(path)) {
      const notice = session.status === "suspended" ? "suspended" : "expired";
      window.location.replace(`/acceso?next=${encodeURIComponent(safeReturnPath(path))}&notice=${notice}`);
    }
    if (!mutating && session.status === "authenticated" && path === "/acceso") {
      window.location.replace(safeReturnPath(new URL(window.location.href).searchParams.get("next")));
    }
  }, [client, path, session, store, mutating]);

  useEffect(() => { store.getState().setMenuOpen(false); }, [path, store]);
  useEffect(() => {
    let reloading = false;
    const unsubscribe = onSessionChange(() => {
      if (reloading) return;
      reloading = true;
      store.getState().reset();
      if (hasEditorDocument(client)) {
        void refreshEditorSession(client).finally(() => { reloading = false; });
        return;
      }
      // The message contains no identity. SSR checks the actual shared cookie.
      void replaceSession(client, { status: "checking", user: null }).then(() => window.location.reload());
    });
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        if (hasEditorDocument(client)) void refreshEditorSession(client);
        else window.location.reload();
      }
    };
    window.addEventListener("pageshow", restore);
    return () => { unsubscribe(); window.removeEventListener("pageshow", restore); };
  }, [client, store]);
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [store] = useState(() => {
    const status = client.getQueryData<AuthSession>(sessionKey)?.status;
    return createAuthUiStore(status === "expired" || status === "suspended" ? status : null);
  });
  return <StoreContext.Provider value={store}><SessionLifecycle store={store}/>{children}</StoreContext.Provider>;
}
