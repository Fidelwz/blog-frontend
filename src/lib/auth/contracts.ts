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
  | { status: "anonymous" | "expired" | "suspended" | "unavailable"; user: null };

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

export function userInitials(user: AuthUser) {
  return `${user.firstName.trim().slice(0, 1)}${user.lastName.trim().slice(0, 1)}`.toUpperCase();
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\s\u0000-\u001f]/.test(value)) return "/inicio";
  try {
    const url = new URL(value, "https://frontend.invalid");
    // Avoid login loops and navigation to API endpoints (including encoded paths).
    const path = decodeURIComponent(url.pathname);
    if (url.origin !== "https://frontend.invalid" || /[\\\s\u0000-\u001f]/.test(path) || path.startsWith("//") ||
        /^\/(api|acceso|registro|recuperar)(\/|$)/.test(path)) return "/inicio";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/inicio"; }
}
