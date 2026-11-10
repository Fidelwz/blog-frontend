import { requireUser } from "@/features/auth/server";
import { PostAccessBoundary } from "@/features/publications/post-access-boundary";
import { RoomStatus } from "@/features/realtime/room-status";
import { ReportButton } from "@/features/moderation/report-button";
import Link from "next/link";
import { Conversation } from "@/features/comments/conversation";
import type { Metadata } from "next";
import { getPost } from "@/features/publications/detail-server";
import { safeContent } from "@/features/publications/sanitize";
import { Notice } from "@/components/notice";
import { Card } from "@/components/ui/card";
import { PostActions } from "@/features/publications/post-actions";
import { PublicationImages } from "@/features/publications/publication-images";

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getPost((await params).id);
  if (result.kind !== "ok" || result.post.groupId || result.post.status !== "visible") return { title: "Publicación", robots: { index: false, follow: false } };
  return { title: result.post.title };
}
export default async function Article({ params }: Props) {
  const result = await getPost((await params).id);
  if (result.kind === "forbidden") return <Notice>No tienes acceso a esta publicación. <Link href="/acceso">Iniciar sesión</Link></Notice>;
  const post = result.post;
  const owner = post.groupId || post.status !== "visible" ? String((await requireUser(`/publicaciones/${post.id}`)).id) : null;
  return <PostAccessBoundary id={post.id} owner={owner}><div className="reading-page"><Link href={post.groupId ? `/grupos/${post.groupId}` : "/buscar"} className="back-link">← {post.groupId ? "Volver al grupo" : "Volver a publicaciones"}</Link>
    <article><Card className="article-detail gap-0 ring-0">
      <Link href={`/buscar?categoryId=${post.categoryId}`}>{post.category.name}</Link><h1>{post.title}</h1>
      <p><Link href={`/usuarios/${post.author.id}`}>{post.author.firstName} {post.author.lastName}</Link> · <time dateTime={post.createdAt}>{new Intl.DateTimeFormat("es", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(post.createdAt))}</time></p>
      {post.status === "retenido" && <Notice>Esta publicación está pendiente de revisión y no aparece en el feed público.</Notice>}
      {post.permissions?.edit !== false && <PostActions id={post.id} authorId={post.authorId}/>}
      {post.status === "visible" && <ReportButton type="post" id={post.id}/>}
      <div className="article-body" dangerouslySetInnerHTML={{ __html: safeContent(post.content) }}/>
      <PublicationImages postId={post.id} authorId={post.authorId} attachments={post.attachments} editable={post.permissions?.edit !== false}/>
    </Card></article><RoomStatus room={`publicacion:${post.id}`}/><Conversation postId={post.id} enabled={post.status === "visible"}/>
  </div></PostAccessBoundary>;
}
