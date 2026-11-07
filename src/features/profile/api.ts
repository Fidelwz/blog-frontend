import { createApiClient } from "../../lib/api/client.ts";
import { parseProfile, type ProfilePatch } from "./types.ts";
import { ApiError } from "../../lib/api/client.ts";
import { photoError } from "./photo.ts";

export interface PhotoUpload { file: File | null }

export function createProfileApi(transport: typeof fetch = fetch) {
  const request = createApiClient("/api/users", transport);
  async function fetchProfile(signal?: AbortSignal) {
    const timeout = AbortSignal.timeout(20_000);
    return parseProfile(await request("/me", { signal: signal ? AbortSignal.any([signal, timeout]) : timeout }));
  }
  async function updateProfile(patch: ProfilePatch) {
    return parseProfile(await request("/me", { method: "PATCH", body: JSON.stringify(patch), signal: AbortSignal.timeout(20_000) }));
  }
  async function uploadPhoto(data: PhotoUpload) {
    const body = new FormData();
    try {
      if (!data.file) throw new Error("Selecciona una imagen.");
      const invalid = photoError(data.file);
      if (invalid) throw new ApiError({ statusCode: invalid.status, error: "PhotoError", mensaje: invalid.message });
      body.set("file", data.file);
      return parseProfile(await request("/me/photo", { method: "PUT", body, signal: AbortSignal.timeout(20_000) }));
    } finally { data.file = null; body.delete("file"); }
  }
  return { fetchProfile, updateProfile, uploadPhoto };
}
export const { fetchProfile, updateProfile, uploadPhoto } = createProfileApi();
