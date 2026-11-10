import Link from "next/link";
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
  return <div className="reading-page"><Link href="/buscar" className="back-link">← Volver a publicaciones</Link>
    <article><Card className="article-detail gap-0 ring-0">
      <Link href={`/buscar?categoryId=${post.categoryId}`}>{post.category.name}</Link><h1>{post.title}</h1>
      <p><Link href={`/usuarios/${post.author.id}`}>{post.author.firstName} {post.author.lastName}</Link> · <time dateTime={post.createdAt}>{new Intl.DateTimeFormat("es", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(post.createdAt))}</time></p>
      {post.status === "retenido" && <Notice>Esta publicación está pendiente de revisión y no aparece en el feed público.</Notice>}
      <PostActions id={post.id} authorId={post.authorId}/>
      <div className="article-body" dangerouslySetInnerHTML={{ __html: safeContent(post.content) }}/>
      {post.groupId === null && <PublicationImages postId={post.id} authorId={post.authorId} attachments={post.attachments}/>}
      {post.attachments.some(a => post.groupId !== null || a.type !== "image") && <section aria-label="Recursos"><h2>Recursos</h2><ul>{post.attachments.filter(a => post.groupId !== null || a.type !== "image").map(a => <li key={a.id}><a href={a.url} target="_blank" rel="noopener noreferrer">{a.title} ({a.type === "image" ? "Imagen" : a.type === "document" ? "Documento" : "Enlace"})</a></li>)}</ul></section>}
    </Card></article><Notice>La conversación estará disponible cuando se integre el módulo de comentarios.</Notice>
  </div>;
}
