import type { QueryClient } from "@tanstack/react-query";
import { replaceSession, sessionKey } from "./cache.ts";
import { sessionOptions } from "./query-options.ts";
import type { AuthSession } from "./types.ts";

// Only an explicitly registered editor can defer document replacement. Its UI
// must hide the draft without a matching authenticated owner; API guards remain.
const editors = new WeakMap<QueryClient, Set<symbol>>();
export function retainEditorDocument(client: QueryClient) {
  const token = Symbol();
  const entries = editors.get(client) ?? new Set<symbol>();
  entries.add(token); editors.set(client, entries);
  return () => { entries.delete(token); if (!entries.size) editors.delete(client); };
}
export function hasEditorDocument(client: QueryClient) { return Boolean(editors.get(client)?.size); }
const refreshing = new WeakMap<QueryClient, Promise<AuthSession | null>>();
export function refreshEditorSession(client: QueryClient) {
  const pending = refreshing.get(client);
  if (pending) return pending;
  const request = (async () => {
    await replaceSession(client, { status: "checking", user: null });
    try { return await client.fetchQuery({ ...sessionOptions(), staleTime: 0 }); }
    catch {
      // A cancelled old lookup must not erase a newer login/logout.
      if (client.getQueryData<AuthSession>(sessionKey)?.status === "checking") {
        client.setQueryData(sessionKey, { status: "unavailable", user: null });
      }
      return null;
    }
  })().finally(() => { refreshing.delete(client); });
  refreshing.set(client, request);
  return request;
}
