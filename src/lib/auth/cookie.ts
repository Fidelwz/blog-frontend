export const SESSION_COOKIE = "jwt";
export const MAX_SESSION_SECONDS = 3600;

export function validCookieValue(value: string) {
  return value.length <= 4096 && /^[A-Za-z0-9._~-]+$/.test(value);
}

/** Only relay the jwt cookie, never the upstream Domain or unrelated cookies. */
export function readSessionCookie(headers: string[], now = Date.now()) {
  const header = headers.find(value => value.trim().startsWith(`${SESSION_COOKIE}=`));
  if (!header) throw new Error("Missing session cookie");
  const [pair, ...parts] = header.split(";");
  const value = pair.trim().slice(SESSION_COOKIE.length + 1);
  if (!validCookieValue(value)) throw new Error("Invalid session cookie");
  let lifetime = MAX_SESSION_SECONDS;
  for (const part of parts) {
    const [key, ...rest] = part.trim().split("=");
    const raw = rest.join("=");
    if (key.toLowerCase() === "max-age") {
      if (!/^\d+$/.test(raw)) throw new Error("Invalid cookie lifetime");
      lifetime = Math.min(lifetime, Number(raw));
    }
    if (key.toLowerCase() === "expires") {
      const expires = Date.parse(raw);
      if (!Number.isFinite(expires)) throw new Error("Invalid cookie expiration");
      lifetime = Math.min(lifetime, Math.floor((expires - now) / 1000));
    }
  }
  if (lifetime <= 0) throw new Error("Expired session cookie");
  return { value, maxAge: lifetime, expires: new Date(now + lifetime * 1000) };
}

export function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/" };
}
