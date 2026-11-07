import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../../lib/api/client.ts";
import { replaceSession, sessionKey } from "../auth/cache.ts";
import type { AuthSession } from "../auth/types.ts";
import { profileKey } from "./query-options.ts";
import type { Profile } from "./types.ts";

export async function clearInvalidProfileSession(client: QueryClient, error: unknown) {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    await replaceSession(client, { status: error.status === 403 ? "suspended" : "expired", user: null });
  }
}
export async function cacheProfile(client: QueryClient, profile: Profile) {
  await Promise.all([
    client.cancelQueries({ queryKey: sessionKey, exact: true }),
    client.cancelQueries({ queryKey: profileKey, exact: true }),
  ]);
  const session = client.getQueryData<AuthSession>(sessionKey);
  // A response started by a previous account must not restore its private data.
  if (session?.status !== "authenticated" || session.user.id !== profile.id) return false;
  client.setQueryDefaults(profileKey, { meta: { private: true } });
  client.setQueryData(profileKey, profile);
  client.setQueryData<AuthSession>(sessionKey, { status: "authenticated", user: {
    id: profile.id, firstName: profile.firstName, lastName: profile.lastName,
    email: profile.email, role: profile.role, status: profile.status, photoUrl: profile.photoUrl,
  } });
  return true;
}
