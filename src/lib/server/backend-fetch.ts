import "server-only";
import { transportBackend, type BackendOptions } from "./backend-transport.ts";
import { forwardedIdentity } from "./forwarded-identity.ts";

export async function backendFetch(path: string, options: BackendOptions = {}) {
  const configured = process.env.BACKEND_API_URL;
  const identityHeaders = !options.publicCache && configured ? await forwardedIdentity(`${configured.replace(/\/$/, "")}${path}`, options.method ?? "GET") : undefined;
  return transportBackend(configured, path, { ...options, identityHeaders });
}
