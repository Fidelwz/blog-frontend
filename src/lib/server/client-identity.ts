import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export function normalizedIp(value: string): string | undefined {
  if (!isIP(value)) return;
  if (value.startsWith("::ffff:") && isIP(value.slice(7)) === 4) return value.slice(7);
  return isIP(value) === 6 ? new URL(`http://[${value}]/`).hostname.slice(1, -1) : value;
}

export function selectClientIp(incoming: Pick<Headers, "get">, source: string, vercel: boolean) {
  if (source === "none") return undefined;
  if (source === "vercel" && vercel) return normalizedIp(incoming.get("x-vercel-forwarded-for") ?? "");
  // Only opt in when a private Next origin is reachable solely through a proxy
  // that OVERWRITES this header. Merely naming a header never makes it trustworthy.
  if (source === "trusted-proxy") return normalizedIp(incoming.get("x-real-ip") ?? "");
  return undefined;
}

export function signClientIdentity(ip: string, url: string, method: string, secret: string, now = Date.now()) {
  const canonical = normalizedIp(ip);
  if (!canonical || secret.length < 32) throw new Error("Invalid BFF identity configuration");
  const target = new URL(url);
  const timestamp = String(now);
  const signature = createHmac("sha256", secret).update(`v1\n${canonical}\n${timestamp}\n${method.toUpperCase()}\n${target.pathname}${target.search}`).digest("hex");
  return new Headers({ "x-blog-client-ip": canonical, "x-blog-client-time": timestamp, "x-blog-client-signature": signature });
}
