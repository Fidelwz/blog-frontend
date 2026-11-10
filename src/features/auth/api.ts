import { ApiError, createApiClient } from "../../lib/api/client.ts";
import { parseAuthUser, type AuthSession } from "./types.ts";

export interface LoginCredentials { email: string; password: string }
export interface RegisterCredentials extends LoginCredentials { firstName: string; lastName: string }
export interface ResetCredentials { token: string; newPassword: string }
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
      if (error instanceof ApiError && error.status === 403 && error.code === "AccountSuspended") return { status: "suspended", user: null };
      throw error;
    }
  }

  async function logout() {
    await request("/logout", { method: "POST", signal: requestSignal() });
  }
  async function register(credentials: RegisterCredentials) {
    try {
      await request("/register", { method: "POST", body: JSON.stringify({
        firstName: credentials.firstName, lastName: credentials.lastName,
        email: credentials.email, password: credentials.password,
      }), signal: requestSignal() });
    } finally {
      credentials.password = "";
      credentials.email = "";
      credentials.firstName = "";
      credentials.lastName = "";
    }
  }
  async function forgotPassword(data: { email: string }) {
    try {
      await request("/forgot-password", { method: "POST", body: JSON.stringify({ email: data.email }), signal: requestSignal() });
    } finally { data.email = ""; }
  }
  async function resetPassword(data: ResetCredentials) {
    try {
      await request("/reset-password", { method: "POST", body: JSON.stringify({ token: data.token, newPassword: data.newPassword }), signal: requestSignal() });
    } finally { data.token = ""; data.newPassword = ""; }
  }
  return { login, fetchSession, logout, register, forgotPassword, resetPassword };
}

export const { login, fetchSession, logout, register, forgotPassword, resetPassword } = createAuthApi();
