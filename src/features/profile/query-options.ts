import { queryOptions } from "@tanstack/react-query";
import { fetchProfile } from "./api.ts";
export const profileKey = ["profile", "me"] as const;
export const profileOptions = () => queryOptions({
  queryKey: profileKey, queryFn: ({ signal }) => fetchProfile(signal),
  staleTime: 60_000, retry: false, meta: { private: true },
});
