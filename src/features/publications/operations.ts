import { ApiError, createApiClient } from "../../lib/api/client.ts";
import { contentId, record } from "./adapters.ts";

export type PostMethod = "POST" | "PATCH" | "DELETE";
export type PostOperation = Readonly<{
  key: string;
  ownerId: string;
  method: PostMethod;
  postId?: string;
  body?: string;
}>;
export type WriteReceipt = { status: "confirmed"; key: string; method: PostMethod; postId: string; version: number };

export function operationKey(value: unknown): string {
  if (typeof value !== "string" || value.length !== 36 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) throw new Error("Identificador de guardado inválido.");
  return value;
}

export function parseReceipt(value: unknown): WriteReceipt | { status: "unknown" } {
  const data = record(value);
  if (data.status === "unknown") return { status: "unknown" };
  if (data.status !== "confirmed" || !["POST", "PATCH", "DELETE"].includes(String(data.method)) ||
      typeof data.version !== "number" || !Number.isSafeInteger(data.version) || data.version < 1) throw new Error("No pudimos comprobar el resultado del guardado.");
  return { status: "confirmed", key: operationKey(data.key), method: data.method as PostMethod, postId: contentId(data.postId), version: data.version };
}

export function newPostOperation(ownerId: string, method: PostMethod, body?: Record<string, unknown>, postId?: string): PostOperation {
  return Object.freeze({ key: crypto.randomUUID(), ownerId: contentId(ownerId), method,
    ...(postId ? { postId: contentId(postId) } : {}), ...(body ? { body: JSON.stringify(body) } : {}) });
}

/** Once a response was lost, a later rejection cannot disprove the earlier commit. */
export function uncertainWrite(error: unknown, alreadyUncertain = false): boolean {
  return alreadyUncertain || !(error instanceof ApiError && [400, 401, 403, 404, 409, 410, 413, 415, 429].includes(error.status));
}

export function createPublicationWriter(transport: typeof fetch = fetch) {
  const api = createApiClient("/api", transport);
  const check = (value: unknown, operation: PostOperation) => {
    const receipt = parseReceipt(value);
    if (receipt.status !== "confirmed" || receipt.key !== operation.key || receipt.method !== operation.method ||
        (operation.postId && receipt.postId !== operation.postId)) throw new Error("La respuesta no corresponde a este guardado.");
    return receipt;
  };
  return {
    async send(operation: PostOperation) {
      const result = await api(operation.postId ? `/posts/${operation.postId}` : "/posts", {
        method: operation.method, body: operation.body, signal: AbortSignal.timeout(20_000),
        headers: { "Idempotency-Key": operation.key, "X-Post-Owner": operation.ownerId },
      });
      if (operation.method === "DELETE" && result === undefined) return { postId: operation.postId! };
      return check(result, operation);
    },
    async reconcile(operation: PostOperation) {
      const result = parseReceipt(await api(`/posts/operations/${operation.key}`, {
        headers: { "X-Post-Owner": operation.ownerId }, signal: AbortSignal.timeout(20_000),
      }));
      if (result.status === "confirmed") return check(result, operation);
      // Unknown can mean a request is still in flight. Only replay its SAME key/body.
      return result;
    },
  };
}
