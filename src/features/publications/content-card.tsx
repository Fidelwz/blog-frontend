import Link from 'next/link';
import Image from 'next/image';
import { MessageSquare, Paperclip, LockKeyhole } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import type { Post } from './adapters';
import { excerpt } from './sanitize';
export function ContentCard({ post }: { post: Post }) {
 const cover = post.attachments.find(attachment => attachment.type === 'image');
 return <article className="publication-card">
 <div className="post-top"><UserAvatar initials={`${post.author.firstName[0] ?? ''}${post.author.lastName[0] ?? ''}`} photoUrl={post.author.photoUrl}/><div className="author"><Link href={`/usuarios/${post.author.id}`}>{post.author.firstName} {post.author.lastName}</Link><time dateTime={post.createdAt}>{new Intl.DateTimeFormat('es', {dateStyle:'medium',timeZone:'UTC'}).format(new Date(post.createdAt))}</time></div></div>
 <div className="mb-3 flex flex-wrap gap-2"><Link className="category-tag" href={`/buscar?categoryId=${post.category.id}`}>{post.category.name}</Link>{post.groupId && <Link className="inline-flex items-center gap-1 text-xs font-medium text-violet-700" href={`/grupos/${post.groupId}`}><LockKeyhole size={13}/>{post.group?.name ?? 'Grupo de estudio'}</Link>}</div>
 <Link href={`/publicaciones/${post.id}`} prefetch={false} className="article-link"><h2>{post.title}</h2><p>{excerpt(post.content)}</p></Link>
 {cover && <Link href={`/publicaciones/${post.id}`} prefetch={false}>{/* Preserve authenticated BFF media requests. */}<Image unoptimized width={760} height={280} className="post-cover" src={cover.url} alt={cover.title || 'Imagen adjunta a la publicación'} loading="lazy"/></Link>}
 <div className="post-bottom"><span><MessageSquare size={16}/>{post.commentCount} comentarios</span><span><Paperclip size={16}/>{post.attachments.length} recursos</span><Link href={`/publicaciones/${post.id}`} prefetch={false}>Ver publicación</Link></div></article>;
}
