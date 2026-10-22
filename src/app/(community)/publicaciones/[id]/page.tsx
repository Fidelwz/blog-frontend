import Link from "next/link";
import { notFound } from "next/navigation";
import { publications } from "@/mocks/publications";
import { ArticleArt } from "@/features/publications/explorer";
import { Icon } from "@/components/ui/icon";
import { DEMO_MODE } from "@/lib/demo";
export default async function Article({ params }: { params: Promise<{ id: string }> }) {
  if (!DEMO_MODE) notFound();
  const { id } = await params;
  const post = publications.find(p => p.id === id);
  if (!post) notFound();
  return <div className="reading-page"><Link href="/" className="back-link">← Volver a publicaciones</Link><article className="article-detail"><span className={`category-tag tag-${post.color}`}>{post.category}</span><h1>{post.title}</h1><div className="post-top"><span className={`avatar avatar-${post.color}`}>{post.initials}</span><div className="author"><strong>{post.author}</strong><span>{post.career} · {post.date}</span></div></div>{post.art && <ArticleArt type={post.art}/>}<div className="article-body">{post.paragraphs.map(p => <p key={p}>{p}</p>)}</div><div className="reading-note"><Icon name="info" size={19}/><p>Publicación de ejemplo. Los adjuntos y la conversación en tiempo real se integrarán en las siguientes entregas.</p></div></article><div className="discussion-preview"><Icon name="comment" size={26}/><h2>El aprendizaje sigue en la conversación.</h2><p>La estructura del blog está lista. Pronto podrás compartir tus preguntas y responder a tus compañeros.</p><Link href="/registro" className="button button-primary">Conoce el registro <Icon name="arrow" size={16}/></Link></div></div>;
}
