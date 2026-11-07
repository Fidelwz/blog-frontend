"use client";
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth";
import { profileKey, profileOptions } from "./query-options";
import { clearInvalidProfileSession } from "./cache";

export function useProfile() {
  const client = useQueryClient();
  const { session } = useSession();
  const previousId = useRef(session.user?.id);
  const query = useQuery({ ...profileOptions(), enabled: session.status === "authenticated" });
  const { refetch } = query;
  useEffect(() => {
    const id = session.user?.id;
    if (previousId.current === id) return;
    previousId.current = id;
    if (!id) return;
    // The session lifecycle removes private queries. Reattach this observer after
    // cancellation so the fixed ['profile','me'] key cannot retain the old account.
    let current = true;
    void client.cancelQueries({ queryKey: profileKey, exact: true }).then(() => {
      if (!current) return;
      client.removeQueries({ queryKey: profileKey, exact: true });
      void refetch();
    });
    return () => { current = false; };
  }, [client, refetch, session.user?.id]);
  useEffect(() => { if (query.error) void clearInvalidProfileSession(client, query.error); }, [client, query.error]);
  return { ...query, data: session.user?.id === query.data?.id ? query.data : undefined };
}
