import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "../../../lib/api/client.ts";
import { backendAuth, backendUser } from "./backend.ts";
import type { AuthSession } from "../types.ts";
import { SESSION_COOKIE, validCookieValue } from "./cookie.ts";

// React cache deduplicates /me only within this render, never between users.
async function readSession(): Promise<AuthSession> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return { status: "anonymous", user: null };
  if (!validCookieValue(cookie)) return { status: "expired", user: null };
  try {
    return { status: "authenticated", user: await backendUser(await backendAuth("me", { cookie })) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { status: "expired", user: null };
    if (error instanceof ApiError && error.status === 403) return { status: "suspended", user: null };
    return { status: "unavailable", user: null };
  }
}

export const getSessionSnapshot = cache(async () => {
  // Timestamp the start so a slow old render cannot outrank a newer mutation.
  const updatedAt = Date.now();
  return { session: await readSession(), updatedAt };
});
export async function getSession() { return (await getSessionSnapshot()).session; }

export async function requireUser(path: string) {
  const session = await getSession();
  if (session.status === "unavailable") throw new Error("No pudimos comprobar tu sesión. Inténtalo de nuevo.");
  if (session.status !== "authenticated") redirect(`/acceso?next=${encodeURIComponent(path)}`);
  return session.user;
}
