"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../auth";
import { clearInvalidProfileSession } from "../profile/cache.ts";
import { createApiClient } from "../../lib/api/client.ts";
import type { MyPostPage } from "./my-server.ts";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/notice";
import { Card } from "@/components/ui/card";

const api = createApiClient("/api");
const labels = { visible: "Visible", retenido: "Retenida", eliminado: "Eliminada" };
export function MyPublications({ ownerId, status }: { ownerId: string; status: string }) {
  const { session } = useSession();
  const client = useQueryClient();
  const active = session.status === "authenticated" && String(session.user.id) === ownerId;
  const feed = useInfiniteQuery({
    queryKey: ["posts", "mine", ownerId, status], meta: { private: true }, enabled: active,
    initialPageParam: null as string | null, retry: false, staleTime: 0,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (pageParam) params.set("cursor", pageParam);
      const result = await api<MyPostPage>(`/users/me/posts?${params}`, { signal });
      if (!result || result.elementos.some(post => post.authorId !== ownerId)) throw new Error("No pudimos comprobar tus publicaciones.");
      return result;
    },
    getNextPageParam: page => page.siguienteCursor ?? undefined,
  });
  useEffect(() => { if (feed.error) void clearInvalidProfileSession(client, feed.error); }, [client, feed.error]);
  if (!active) return <Notice>Inicia sesión para consultar tus publicaciones.</Notice>;
  const posts = new Map(feed.data?.pages.flatMap(page => page.elementos).map(post => [post.id, post]));
  return <section aria-label="Mis publicaciones" aria-busy={feed.isFetching}>
    <h1>Mis publicaciones</h1>
    <Button asChild><Link href="/publicaciones/nueva">Crear publicación</Link></Button>
    <form action="/mis-publicaciones" className="my-4 flex flex-wrap items-center gap-3">
      <label htmlFor="my-posts-status">Estado</label>
      <select id="my-posts-status" name="status" defaultValue={status} className="rounded-md border p-2"><option value="">Todos</option><option value="visible">Visibles</option><option value="held">Retenidas</option><option value="deleted">Eliminadas</option></select>
      <Button type="submit" variant="outline">Filtrar</Button>
    </form>
    {feed.isPending && <Notice>Cargando tus publicaciones…</Notice>}
    {feed.error && <Notice kind="error">{feed.error.message} <Button variant="outline" onClick={() => feed.isFetchNextPageError ? void feed.fetchNextPage() : void feed.refetch()}>Reintentar</Button></Notice>}
    {!feed.isPending && !feed.error && !posts.size && <Notice>No tienes publicaciones en este estado.</Notice>}
    <div className="feed">{[...posts.values()].map(post => <article key={post.id}><Card className="publication-card gap-3 p-5">
      <p>{labels[post.status]} · {post.category.name} · {post.groupId ? "Publicación de grupo" : "Pública"}</p>
      <h2>{post.status === "eliminado" ? post.title : <Link href={`/publicaciones/${post.id}`} prefetch={false}>{post.title}</Link>}</h2>
      <p>{post.excerpt}</p><time dateTime={post.createdAt}>{new Intl.DateTimeFormat("es", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(post.createdAt))}</time>
      <p>{post.commentCount} comentarios registrados · {post.attachmentCount} recursos</p>
      {post.status === "retenido" && <p>Pendiente de revisión; no aparece en el feed público.</p>}
      {/* The detail owns pending writes. Clearing this private list on session
          expiry must not destroy an uncertain deletion's operation identity. */}
      {post.status !== "eliminado" && <Button asChild variant="outline"><Link href={`/publicaciones/${post.id}`} prefetch={false}>Ver y gestionar</Link></Button>}
    </Card></article>)}</div>
    {feed.hasNextPage && <Button variant="outline" disabled={feed.isFetching} onClick={() => void feed.fetchNextPage()}>Cargar más publicaciones propias</Button>}
  </section>;
}
