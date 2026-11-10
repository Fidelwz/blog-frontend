"use client";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createApiClient } from "../../lib/api/client.ts";
import type { FeedPage } from "./server.ts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/notice";
import { UserAvatar } from "@/components/user-avatar";

const api = createApiClient("/api");
export function PublicFeed({ query, categoryId, initialPage }: { query: string; categoryId: string; initialPage?: FeedPage }) {
  const feed = useInfiniteQuery({
    queryKey: ["posts", "public", query, categoryId], initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (categoryId) params.set("categoryId", categoryId);
      if (pageParam) params.set("cursor", pageParam);
      const result = await api<FeedPage>(`/posts?${params}`, { signal });
      if (!result) throw new Error("Respuesta vacía del servicio.");
      return result;
    },
    getNextPageParam: page => page.siguienteCursor ?? undefined,
    initialData: initialPage ? { pages: [initialPage], pageParams: [null] } : undefined,
    staleTime: 30000, retry: false,
  });
  const unique = new Map(feed.data?.pages.flatMap(page => page.elementos).map(p => [p.id, p]));
  return <section aria-label="Publicaciones" aria-busy={feed.isFetching}>
    <h2 className="feed-label">{query ? "Resultados de búsqueda" : "Lo más reciente en la comunidad"}</h2>
    {feed.isPending && <Notice>Cargando publicaciones…</Notice>}
    {feed.error && <Notice kind="error">{feed.error.message} <Button variant="outline" onClick={() => feed.isFetchNextPageError ? void feed.fetchNextPage() : void feed.refetch()}>Reintentar</Button></Notice>}
    {!feed.isPending && !feed.error && unique.size === 0 && <Notice>No encontramos publicaciones para estos filtros.</Notice>}
    <div className="feed">{[...unique.values()].map(post => <article key={post.id}><Card className="publication-card gap-0 ring-0">
      <div className="post-top flex-wrap"><UserAvatar initials={`${post.author.firstName[0] ?? ""}${post.author.lastName[0] ?? ""}`} photoUrl={post.author.photoUrl}/>
        <div className="author"><Link href={`/usuarios/${post.author.id}`}>{post.author.firstName} {post.author.lastName}</Link><time dateTime={post.createdAt}>{new Intl.DateTimeFormat("es", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(post.createdAt))}</time></div>
        <Link href={`/buscar?categoryId=${post.category.id}`}>{post.category.name}</Link></div>
      <Link href={`/publicaciones/${post.id}`} className="article-link" prefetch={false}><h2>{post.title}</h2><p>{post.excerpt}</p></Link>
      <div className="post-bottom"><span>{post.commentCount} comentarios</span><span>{post.attachmentCount} recursos</span><Link href={`/publicaciones/${post.id}`} prefetch={false}>Leer publicación →</Link></div>
    </Card></article>)}</div>
    {feed.hasNextPage && <Button variant="outline" className="load-more" disabled={feed.isFetching} onClick={() => void feed.fetchNextPage()}>{feed.isFetchingNextPage ? "Cargando…" : "Cargar más publicaciones"}</Button>}
  </section>;
}
