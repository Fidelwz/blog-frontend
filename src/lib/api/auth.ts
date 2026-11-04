import { createApiClient } from "./client.ts";
import { parseAuthUser } from "../auth/contracts.ts";

const request = createApiClient("/api/auth");
export async function login(email: string, password: string) {
  return parseAuthUser(await request("/login", { method: "POST", body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(20_000) }));
}
export async function getCurrentUser() {
  return parseAuthUser(await request("/me", { signal: AbortSignal.timeout(20_000) }));
}
export async function logout() {
  await request("/logout", { method: "POST", signal: AbortSignal.timeout(20_000) });
}
