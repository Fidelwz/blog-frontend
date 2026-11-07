"use client";
import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile, uploadPhoto } from "./api";
import { cacheProfile, clearInvalidProfileSession } from "./cache";
import { notifySessionChange } from "../auth/sync";
import type { Profile } from "./types";

function useProfileMutation<T extends object>(key: string, mutationFn: (data: T) => Promise<Profile>) {
  const client = useQueryClient();
  const busy = useRef(false);
  const mutation = useMutation({ mutationKey: ["profile", key], mutationFn,
    retry: false, gcTime: 0, networkMode: "always",
    onSuccess: async profile => { if (await cacheProfile(client, profile)) notifySessionChange(); },
    onError: error => clearInvalidProfileSession(client, error),
  });
  async function save(data: T): Promise<Profile | undefined> {
    if (busy.current) return;
    busy.current = true;
    try { return await mutation.mutateAsync({ ...data }); }
    catch { return undefined; }
    finally { busy.current = false; }
  }
  return { save, error: mutation.error, pending: mutation.isPending, reset: mutation.reset };
}
export function useUpdateProfile() { return useProfileMutation("update", updateProfile); }
export function useUploadPhoto() { return useProfileMutation("photo", uploadPhoto); }
