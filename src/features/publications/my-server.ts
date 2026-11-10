import "server-only";
import { backendFetch } from "../../lib/server/backend-fetch.ts";
import { parseMyPostPage } from "./adapters.ts";
import { parseMyPostsQuery } from "./validation.ts";
import { excerpt } from "./sanitize.ts";

export async function getMyPosts(params: URLSearchParams, cookie: string, signal?: AbortSignal) {
  const query = parseMyPostsQuery(params);
  const response = await backendFetch(`/users/me/posts?${query}`, { cookie, signal });
  const page = parseMyPostPage(await response.json());
  return { ...page, elementos: page.elementos.map(({ content, ...post }) => ({ ...post, excerpt: excerpt(content) })) };
}
export type MyPostPage = Awaited<ReturnType<typeof getMyPosts>>;
