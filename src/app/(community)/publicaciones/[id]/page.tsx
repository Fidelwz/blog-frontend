import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { Notice } from "@/components/notice";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publications } from "@/mocks/publications";
import { ArticleArt } from "@/features/publications/explorer";
import { Icon } from "@/components/ui/icon";
import { DEMO_MODE } from "@/lib/demo";
export default async function Article({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!DEMO_MODE) notFound();
  const { id } = await params;
  const post = publications.find((p) => p.id === id);
  if (!post) notFound();
  return (
    <div className="reading-page">
      <Link href="/" className="back-link">
        ← Volver a publicaciones
      </Link>
      <article>
        <Card className="article-detail gap-0 ring-0">
          <Badge
            variant="secondary"
            className={`category-tag w-fit tag-${post.color}`}
          >
            {post.category}
          </Badge>
          <h1>{post.title}</h1>
          <div className="post-top">
            <UserAvatar initials={post.initials} color={post.color} />
            <div className="author">
              <strong>{post.author}</strong>
              <span>
                {post.career} · {post.date}
              </span>
            </div>
          </div>
          {post.art && <ArticleArt type={post.art} />}
          <div className="article-body">
            {post.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <Notice>
            <p>
              Publicación de ejemplo. Los adjuntos y la conversación en tiempo
              real se integrarán en las siguientes entregas.
            </p>
          </Notice>
        </Card>
      </article>
      <Card className="discussion-preview items-center gap-0 ring-0">
        <Icon name="comment" size={26} />
        <h2>El aprendizaje sigue en la conversación.</h2>
        <p>
          La estructura del blog está lista. Pronto podrás compartir tus
          preguntas y responder a tus compañeros.
        </p>
        <Button asChild className="h-11">
          <Link href="/registro">
            Conoce el registro <Icon name="arrow" size={16} />
          </Link>
        </Button>
      </Card>
    </div>
  );
}
