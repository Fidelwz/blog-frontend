import "server-only";
import { headers } from "next/headers";
import { ApiError } from "../api/client.ts";
import { selectClientIp, signClientIdentity } from "./client-identity.ts";

export async function forwardedIdentity(url: string, method = "GET") {
  const source = process.env.BFF_CLIENT_IP_SOURCE ?? "none";
  if (source === "none") return new Headers();
  const secret = process.env.BFF_IDENTITY_SECRET;
  const ip = selectClientIp(await headers(), source, process.env.VERCEL === "1");
  if (!secret || secret.length < 32 || !ip) throw new ApiError({ statusCode: 503, error: "ProxyConfigurationError", mensaje: "No pudimos verificar la conexión del sitio con el servicio. Contacta al administrador." });
  // Discard any inbound x-blog-* headers. They are never copied from the caller.
  return signClientIdentity(ip, url, method, secret);
}
