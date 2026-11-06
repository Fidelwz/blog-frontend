"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/features/auth";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AvatarGroup } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/user-avatar";
import {
  categories,
  listDemoPublications,
  type Publication,
} from "@/mocks/publications";

export function ArticleArt({ type }: { type: "database" | "math" | "code" }) {
  if (type === "database")
    return (
      <div
        className="article-art database-art"
        role="img"
        aria-label="Ejemplo de un esquema relacional: Estudiante se relaciona con Inscripción y Materia"
      >
        <div className="art-label">
          <Icon name="database" size={15} /> DISEÑO DE BASES DE DATOS
        </div>
        <div className="schema">
          <div className="schema-table">
            <strong>Estudiante</strong>
            <span>
              <b>PK</b> id_estudiante
            </span>
            <span>nombre</span>
            <span>correo</span>
          </div>
          <div className="schema-connector">
            1 <span /> N
          </div>
          <div className="schema-table">
            <strong>Inscripción</strong>
            <span>
              <b>FK</b> id_estudiante
            </span>
            <span>
              <b>FK</b> id_materia
            </span>
            <span>fecha</span>
          </div>
          <div className="schema-connector">
            N <span /> 1
          </div>
          <div className="schema-table">
            <strong>Materia</strong>
            <span>
              <b>PK</b> id_materia
            </span>
            <span>nombre</span>
            <span>créditos</span>
          </div>
        </div>
        <span className="art-footnote">Menos redundancia. Más claridad.</span>
      </div>
    );
  if (type === "code")
    return (
      <div
        className="article-art code-art"
        role="img"
        aria-label="Ejemplo de una función recursiva factorial"
      >
        <div className="code-dots">
          <i />
          <i />
          <i />
          <span>recursividad.ts</span>
        </div>
        <pre>
          <span>function</span> factorial(n: number): number {"{"}
          {"\n"} <span>if</span> (n &lt;= 1) <b>return 1</b>;{"\n"}{" "}
          <b>return</b> n * factorial(n - 1);{"\n"}
          {"}"}
        </pre>
        <span className="code-note">Un problema. Una versión más pequeña.</span>
      </div>
    );
  return (
    <div
      className="article-art math-art"
      role="img"
      aria-label="Apuntes de límites y continuidad"
    >
      <div className="math-formula">
        <span>lim</span>
        <small>x → 0</small>
      </div>
      <span className="fraction">
        <span>sen x</span>
        <span>x</span>
      </span>
      <span className="math-result">= 1</span>
      <div className="math-sticker">
        Un paso a la vez.
        <Icon name="spark" size={18} />
      </div>
    </div>
  );
}
export function PublicationCard({ post }: { post: Publication }) {
  return (
    <article>
      <Card className="publication-card gap-0 ring-0">
        <div className="post-top">
          <UserAvatar initials={post.initials} color={post.color} />
          <div className="author">
            <strong>{post.author}</strong>
            <span>
              {post.career} <i /> {post.date}
            </span>
          </div>
          <Badge
            variant="secondary"
            className={`category-tag tag-${post.color}`}
          >
            {post.category}
          </Badge>
        </div>
        <Link
          prefetch={false}
          href={`/publicaciones/${post.id}`}
          className="article-link"
        >
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          {post.art && <ArticleArt type={post.art} />}
        </Link>
        <div className="post-bottom">
          <span>
            <Icon name="comment" size={17} />
            {post.comments} comentarios
          </span>
          <span>
            <Icon name="paperclip" size={16} />
            {post.resources} recursos
          </span>
          <Link prefetch={false} href={`/publicaciones/${post.id}`}>
            Leer publicación <Icon name="arrow" size={16} />
          </Link>
        </div>
      </Card>
    </article>
  );
}
export function Explorer({
  query = "",
  initialCategory = "Todas",
}: {
  query?: string;
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(
    categories.includes(initialCategory) ? initialCategory : "Todas",
  );
  const [limit, setLimit] = useState(3);
  const page = listDemoPublications({ query, category, limit });
  return (
    <>
      <ToggleGroup
        type="single"
        value={category}
        onValueChange={(value) => {
          if (value) {
            setCategory(value);
            setLimit(3);
          }
        }}
        className="category-tabs max-w-full justify-start"
        aria-label="Filtrar por materia"
      >
        {categories.map((c) => (
          <ToggleGroupItem
            key={c}
            value={c}
            className="rounded-full px-4 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {c}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="feed-label">
        <h2>
          {query ? "Resultados de búsqueda" : "Lo más reciente en la comunidad"}
        </h2>
        <span>
          <Icon name="down" size={14} /> Más recientes
        </span>
      </div>
      <div className="feed" aria-live="polite">
        {page.elementos.length ? (
          page.elementos.map((post) => (
            <PublicationCard key={post.id} post={post} />
          ))
        ) : (
          <EmptyState title="Todavía no encontramos coincidencias">
            Prueba con otra materia o una palabra más general.
          </EmptyState>
        )}
      </div>
      {page.siguienteCursor && (
        <Button
          variant="outline"
          className="load-more"
          onClick={() => setLimit(limit + 3)}
        >
          Cargar más publicaciones <Icon name="down" size={17} />
        </Button>
      )}
    </>
  );
}
export function CommunityAside() {
  return (
    <aside className="community-aside" aria-label="Información de la comunidad">
      <Card className="aside-card gap-0 ring-0">
        <div className="aside-title">
          <span className="icon-tint">
            <Icon name="compass" size={18} />
          </span>
          <h2>Explora por materia</h2>
        </div>
        <p>Encuentra tu próximo aprendizaje.</p>
        <div className="subject-list">
          {[
            { name: "Bases de Datos", icon: "database", color: "cyan" },
            { name: "Programación II", icon: "code", color: "violet" },
            { name: "Cálculo I", icon: "math", color: "amber" },
            { name: "Ingeniería de Software", icon: "file", color: "blue" },
          ].map((s) => (
            <Link
              prefetch={false}
              key={s.name}
              href={`/buscar?categoria=${encodeURIComponent(s.name)}`}
            >
              <span className={`subject-icon avatar-${s.color}`}>
                <Icon
                  name={s.icon as "database" | "code" | "math" | "file"}
                  size={17}
                />
              </span>
              <strong>{s.name}</strong>
              <Icon name="chevron" size={14} />
            </Link>
          ))}
        </div>
      </Card>
      <Card className="aside-card study-card gap-0 ring-0">
        <span className="study-icon">
          <Icon name="users" size={28} />
        </span>
        <h2>
          Tu grupo de estudio
          <br />
          te está esperando.
        </h2>
        <p>
          Conecta con compañeros que comparten tus materias y aprende en equipo.
        </p>
        <Button asChild variant="outline" className="h-10">
          <Link prefetch={false} href="/grupos">
            Explorar grupos <Icon name="arrow" size={16} />
          </Link>
        </Button>
        <div className="mini-community">
          <AvatarGroup>
            {["AM", "GS", "JV"].map((initials) => (
              <UserAvatar key={initials} initials={initials} />
            ))}
          </AvatarGroup>
          <span>Ideas que nos unen</span>
        </div>
      </Card>
      <div className="aside-note">
        <Icon name="shield" size={19} />
        <p>Una comunidad segura comienza con una conversación respetuosa.</p>
      </div>
    </aside>
  );
}
export function Hero({ student = false }: { student?: boolean }) {
  const { session } = useSession();
  const firstName = session.user?.firstName;
  return (
    <section className={`hero ${student ? "hero-student" : ""}`}>
      <div className="hero-copy">
        <span className="eyebrow">
          <span />
          {student
            ? "TU ESPACIO PARA SEGUIR APRENDIENDO"
            : "EL CONOCIMIENTO CRECE CUANDO SE COMPARTE"}
        </span>
        <h1>
          {student ? (
            <>
              ¡Hola, {firstName || "estudiante"}!<br />
              ¿Qué aprenderemos hoy?
            </>
          ) : (
            <>
              Comparte, conecta.
              <br />
              <span>Aprendamos juntos.</span>
            </>
          )}
        </h1>
        <p>
          Apuntes, ideas y conversaciones que te ayudan a llegar más lejos. Tu
          comunidad estudiantil, en un solo lugar.
        </p>
        <div className="hero-buttons">
          <Button asChild className="h-11 px-4">
            <Link
              prefetch={false}
              href={student ? "/publicaciones/nueva" : "/acceso"}
            >
              {student ? "Crear publicación" : "Únete a la comunidad"}
              <Icon name={student ? "plus" : "arrow"} size={17} />
            </Link>
          </Button>
          {!student && (
            <Link prefetch={false} href="/buscar" className="hero-demo">
              Explorar publicaciones <Icon name="chevron" size={15} />
            </Link>
          )}
        </div>
      </div>
      <div className="hero-illustration" aria-hidden="true">
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <div className="floating-note note-code">
          <Icon name="code" size={28} />
        </div>
        <div className="notebook">
          <div className="notebook-binding" />
          <span className="notebook-label">IDEAS QUE CONECTAN</span>
          <Icon name="book" size={44} />
          <strong>
            El próximo
            <br />
            gran aprendizaje
            <br />
            <em>empieza contigo.</em>
          </strong>
          <div className="notebook-line" />
          <div className="notebook-line short" />
        </div>
        <div className="floating-note note-chat">
          <Icon name="comment" size={26} />
          <i>+ una buena idea</i>
        </div>
        <span className="hero-star">✦</span>
      </div>
    </section>
  );
}
