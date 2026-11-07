"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { login, logout, register, forgotPassword, resetPassword, type LoginCredentials } from "./api";
import { acquireAuthMutation, cancelPrivateQueries, releaseAuthMutation, replaceSession } from "./cache";
import { useAuthUiStore } from "./components/auth-provider";
import { notifySessionChange } from "./sync";
import { safeReturnPath } from "./utils";

function useAccountMutation<T extends object>(key: string, mutationFn: (data: T) => Promise<void>, navigates = false) {
  const busy = useRef(false);
  const mutation = useMutation({ mutationKey: ["account", key], mutationFn, retry: false, gcTime: 0, networkMode: "always" });
  async function submit(data: T) {
    if (busy.current) return false;
    busy.current = true;
    try {
      await mutation.mutateAsync({ ...data });
      if (!navigates) busy.current = false;
      return true;
    } catch { busy.current = false; return false; }
  }
  return { submit, error: mutation.error, reset: mutation.reset, pending: mutation.isPending || (navigates && mutation.isSuccess) };
}

export function useRegister() { return useAccountMutation("register", register, true); }
export function useForgotPassword() { return useAccountMutation("forgot-password", forgotPassword); }
export function useResetPassword() { return useAccountMutation("reset-password", resetPassword, true); }

export function useLogin(returnTo: string) {
  const client = useQueryClient();
  const resetUi = useAuthUiStore(state => state.reset);
  const mutation = useMutation({
    mutationKey: ["auth", "login"],
    mutationFn: login, retry: false, gcTime: 0, networkMode: "always",
    onMutate: () => cancelPrivateQueries(client),
    onSuccess: async user => {
      await replaceSession(client, { status: "authenticated", user });
      resetUi();
      notifySessionChange();
      window.location.replace(safeReturnPath(returnTo));
    },
  });
  async function submit(credentials: LoginCredentials) {
    if (!acquireAuthMutation(client)) return false;
    try { await mutation.mutateAsync({ ...credentials }); return true; }
    catch { releaseAuthMutation(client); return false; }
    // On success keep the gate until navigation replaces this document.
  }
  return { submit, error: mutation.error, reset: mutation.reset, pending: mutation.isPending || mutation.isSuccess };
}

export function useLogout() {
  const client = useQueryClient();
  const resetUi = useAuthUiStore(state => state.reset);
  const mutation = useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: logout, retry: false, gcTime: 0, networkMode: "always",
    onMutate: () => cancelPrivateQueries(client),
    onSuccess: async () => {
      await replaceSession(client, { status: "anonymous", user: null });
      resetUi();
      notifySessionChange();
      window.location.replace("/acceso");
    },
  });
  async function signOut() {
    if (!acquireAuthMutation(client)) return false;
    try { await mutation.mutateAsync(); return true; }
    catch { releaseAuthMutation(client); return false; }
  }
  return { signOut, error: mutation.error, pending: mutation.isPending || mutation.isSuccess };
}
