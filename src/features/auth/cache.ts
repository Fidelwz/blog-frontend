import type { Query, QueryClient } from "@tanstack/react-query";
import type { AuthSession } from "./types.ts";

export const sessionKey = ["auth", "session"] as const;
const isSession = (query: Query) => query.queryKey.length === 2 && query.queryKey[0] === "auth" && query.queryKey[1] === "session";
const isPrivate = (query: Query) => query.queryKey[0] === "auth" || query.meta?.private === true;

export async function cancelPrivateQueries(client: QueryClient) {
  await client.cancelQueries({ predicate: isPrivate });
}

/** Keep the observed session query and public data; discard all other private data. */
export async function clearPrivateData(client: QueryClient) {
  await client.cancelQueries({ predicate: query => isPrivate(query) && !isSession(query) });
  client.removeQueries({ predicate: query => isPrivate(query) && !isSession(query) });
}

export async function replaceSession(client: QueryClient, session: AuthSession) {
  await cancelPrivateQueries(client);
  await clearPrivateData(client);
  client.setQueryData<AuthSession>(sessionKey, session);
}

// A synchronous gate also covers two events before React renders isPending.
const authMutations = new WeakSet<QueryClient>();
export function isAuthMutationActive(client: QueryClient) { return authMutations.has(client); }
export function acquireAuthMutation(client: QueryClient) {
  if (authMutations.has(client)) return false;
  authMutations.add(client);
  return true;
}
export function releaseAuthMutation(client: QueryClient) { authMutations.delete(client); }
