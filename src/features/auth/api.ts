import { ApiError, createApiClient } from "../../lib/api/client.ts";
import { parseAuthUser, type AuthSession } from "./types.ts";

export interface LoginCredentials { email: string; password: string }
function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(20_000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export function createAuthApi(transport: typeof fetch = fetch) {
  const request = createApiClient("/api/auth", transport);
  /** Mutation variables are a disposable copy, scrubbed on both success and error. */
  async function login(credentials: LoginCredentials) {
    try {
      return parseAuthUser(await request("/login", {
        method: "POST", body: JSON.stringify(credentials), signal: requestSignal(),
      }));
    } finally {
      credentials.password = "";
      credentials.email = "";
    }
  }

  async function fetchSession(signal?: AbortSignal): Promise<AuthSession> {
    try {
      return { status: "authenticated", user: parseAuthUser(await request("/me", { signal: requestSignal(signal) })) };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return { status: "anonymous", user: null };
      if (error instanceof ApiError && error.status === 403) return { status: "suspended", user: null };
      throw error;
    }
  }

  async function logout() {
    await request("/logout", { method: "POST", signal: requestSignal() });
  }
  return { login, fetchSession, logout };
}

export const { login, fetchSession, logout } = createAuthApi();
