"use client";

import { useIsMutating, useQuery } from "@tanstack/react-query";
import { sessionOptions } from "./query-options";
import type { AuthSession } from "./types";

const checking: AuthSession = { status: "checking", user: null };
export function useSession() {
  const mutating = useIsMutating({ mutationKey: ["auth"] }) > 0;
  const query = useQuery({ ...sessionOptions(), enabled: !mutating });
  return { ...query, session: query.data ?? checking };
}
