export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "usuario" | "administrador";
  status: "activo" | "suspendido";
  photoUrl: string | null;
}

export type AuthSession =
  | { status: "authenticated"; user: AuthUser }
  | { status: "anonymous" | "expired" | "suspended" | "unavailable" | "checking"; user: null };

/** Pick only public fields, even if an upstream response accidentally includes secrets. */
export function parseAuthUser(value: unknown): AuthUser {
  if (!value || typeof value !== "object") throw new Error("Invalid auth profile");
  const u = value as Record<string, unknown>;
  if (!Number.isSafeInteger(u.id) || Number(u.id) < 1 ||
      typeof u.firstName !== "string" || typeof u.lastName !== "string" || typeof u.email !== "string" ||
      (u.role !== "usuario" && u.role !== "administrador") ||
      (u.status !== "activo" && u.status !== "suspendido") ||
      (u.photoUrl !== null && typeof u.photoUrl !== "string")) {
    throw new Error("Invalid auth profile");
  }
  return { id: u.id as number, firstName: u.firstName, lastName: u.lastName,
    email: u.email, role: u.role, status: u.status, photoUrl: u.photoUrl };
}

