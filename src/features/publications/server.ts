import "server-only";
import { backendFetch } from "../../lib/server/backend-fetch.ts";
import { parsePostPage } from "./adapters.ts";
import { parseFeedQuery } from "./validation.ts";
import { excerpt } from "./sanitize.ts";
import { parseCategories } from "../categories/adapters.ts";

export async function getCategories() {
  const response = await backendFetch("/categories", { publicCache: true });
  return parseCategories(await response.json());
}
export async function getPublicFeed(params: URLSearchParams, signal?: AbortSignal) {
  const query = parseFeedQuery(params);
  const response = await backendFetch(`${query.has("q") ? "/posts/search" : "/posts"}?${query}`, { signal });
  const page = parsePostPage(await response.json());
  if (page.elementos.some(p => p.groupId !== null || p.status !== "visible")) throw new Error("El feed público contiene datos privados");
  return { ...page, elementos: page.elementos.map(p => ({
    id: p.id, title: p.title, excerpt: excerpt(p.content), author: p.author, category: p.category,
    createdAt: p.createdAt, commentCount: p.commentCount, attachmentCount: p.attachments.length,
  })) };
}
export type FeedPage = Awaited<ReturnType<typeof getPublicFeed>>;
