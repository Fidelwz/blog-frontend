import { parseAuthUser } from "../types.ts";

/** Adapt the aliases observed in Nest without changing the frontend's contract. */
export function parseBackendAuthUser(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid auth profile");
  const user = value as Record<string, unknown>;
  return parseAuthUser({
    ...user,
    role: user.role === "user" ? "usuario" : user.role === "administrator" ? "administrador" : user.role,
    status: user.status === "active" ? "activo" : user.status === "suspended" ? "suspendido" : user.status,
  });
}
