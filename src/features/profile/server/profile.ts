import { parseProfile, parsePublicProfile } from "../types.ts";

export function normalizeProfileId(value: unknown): number {
  if (typeof value !== "number" && (typeof value !== "string" || value !== value.trim() || !/^[1-9]\d*$/.test(value))) throw new Error("Invalid profile id");
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid profile id");
  return id;
}
function adapt(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid profile");
  const p = value as Record<string, unknown>;
  return { ...p, id: normalizeProfileId(p.id),
    role: p.role === "user" ? "usuario" : p.role === "administrator" ? "administrador" : p.role,
    status: p.status === "active" ? "activo" : p.status === "suspended" ? "suspendido" : p.status };
}
export const parseBackendProfile = (value: unknown) => parseProfile(adapt(value));
export const parseBackendPublicProfile = (value: unknown) => parsePublicProfile(adapt(value));
