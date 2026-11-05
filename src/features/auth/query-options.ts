import { queryOptions } from "@tanstack/react-query";
import { fetchSession } from "./api.ts";
import { sessionKey } from "./cache.ts";

export const sessionOptions = () => queryOptions({
  queryKey: sessionKey,
  queryFn: ({ signal }) => fetchSession(signal),
  staleTime: 60_000,
  retry: false,
  refetchInterval: false,
  meta: { private: true },
});
