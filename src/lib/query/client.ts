import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, retry: false },
      mutations: { retry: false, gcTime: 0, networkMode: "always" },
    },
  });
}

let browserClient: QueryClient | undefined;
export function getQueryClient() {
  if (typeof window === "undefined") return createQueryClient();
  return browserClient ??= createQueryClient();
}
