import type { AuthUser } from "./types.ts";

export function userInitials(user: AuthUser) {
  return `${user.firstName.trim().slice(0, 1)}${user.lastName.trim().slice(0, 1)}`.toUpperCase();
}

export function isPrivatePath(path: string) {
  if (/^\/publicaciones\/[^/]+\/editar(?:\/|$)/.test(path)) return true;
  return ["/admin", "/moderacion", "/inicio", "/perfil", "/grupos", "/mis-publicaciones", "/notificaciones", "/publicaciones/nueva"]
    .some(prefix => path === prefix || path.startsWith(`${prefix}/`));
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
