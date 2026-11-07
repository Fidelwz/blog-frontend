import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ApiError } from "../../../lib/api/client.ts";
import { accountBackend } from "../../auth/server/account-backend.ts";
import { authError } from "../../auth/server/backend.ts";
import { normalizeProfileId, parseBackendPublicProfile } from "./profile.ts";

// Share the request between metadata and the page, only within this render.
export const getPublicProfile = cache(async (rawId: string) => {
  let id: number;
  try { id = normalizeProfileId(rawId); } catch { notFound(); }
  let response: Response;
  try {
    response = await accountBackend(`/users/${id}`, { messages: { 404: "No encontramos este perfil." } });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  try {
    const profile = parseBackendPublicProfile(await response.json());
    if (profile.id !== id) throw new Error("Unexpected profile");
    return profile;
  } catch { throw authError(502, "No pudimos cargar este perfil. Inténtalo de nuevo."); }
});
