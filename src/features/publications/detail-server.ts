import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ApiError } from "../../lib/api/client.ts";
import { backendFetch } from "../../lib/server/backend-fetch.ts";
import { SESSION_COOKIE } from "../auth/server/cookie.ts";
import { contentId, parsePost } from "./adapters.ts";

export const getPost = cache(async (rawId: string) => {
  let id: string;
  try { id = contentId(rawId); } catch { notFound(); }
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    let response: Response;
    try { response = await backendFetch(`/posts/${id}`, { cookie }); }
    catch (error) {
      if (cookie && error instanceof ApiError && (error.status === 401 || error.code === "AccountSuspended")) response = await backendFetch(`/posts/${id}`);
      else throw error;
    }
    return { kind: "ok" as const, post: parsePost(await response.json()) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) return { kind: "forbidden" as const };
    throw error;
  }
});
