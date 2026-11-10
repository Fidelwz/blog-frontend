export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Contrato de contenido inválido");
  return value as Record<string, unknown>;
}
export function text(value: unknown): string {
  if (typeof value !== "string") throw new Error("Texto inválido");
  return value;
}
export function contentId(value: unknown): string {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || value.length > 19 || BigInt(value) > 9223372036854775807n) throw new Error("ID inválido");
  return value;
}
function integer(value: unknown, min = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) throw new Error("Número inválido");
  return value;
}
function date(value: unknown): string {
  const result = text(value);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(result) || !Number.isFinite(Date.parse(result))) throw new Error("Fecha inválida");
  return result;
}
function url(value: unknown): string {
  const result = text(value);
  const parsed = new URL(result);
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error("URL inválida");
  return result;
}
export function parsePost(value: unknown) {
  const p = record(value), author = record(p.author), category = record(p.category);
  const status = p.status === "visible" ? "visible" : p.status === "retained" ? "retenido" : p.status === "deleted" ? "eliminado" : null;
  if (!status || !Array.isArray(p.attachments)) throw new Error("Estado o adjuntos inválidos");
  return {
    id: contentId(p.id), authorId: contentId(p.authorId), categoryId: contentId(p.categoryId),
    groupId: p.groupId === null ? null : contentId(p.groupId), title: text(p.title), content: text(p.content), status,
    version: integer(p.version, 1), createdAt: date(p.createdAt), updatedAt: p.updatedAt === null ? null : date(p.updatedAt),
    author: { id: contentId(author.id), firstName: text(author.firstName), lastName: text(author.lastName), photoUrl: author.photoUrl === null ? null : url(author.photoUrl) },
    category: { id: contentId(category.id), name: text(category.name) },
    commentCount: integer(p.commentCount),
    attachments: p.attachments.map(parseAttachment),
  };
}
export function parseAttachment(value: unknown) {
  const a = record(value);
  if (!["image", "document", "link"].includes(text(a.type))) throw new Error("Tipo de adjunto inválido");
  return { id: contentId(a.id), type: text(a.type), title: text(a.title), url: url(a.url), order: integer(a.order, 1) };
}
export type Post = ReturnType<typeof parsePost>;
export function parsePostPage(value: unknown) {
  const page = record(value);
  if (!Array.isArray(page.items)) throw new Error("Página inválida");
  return { elementos: page.items.map(parsePost), siguienteCursor: page.nextCursor === null ? null : contentId(page.nextCursor) };
}

// /users/me/posts uses a different DTO from /posts (including held and _count).
export function parseMyPostPage(value: unknown) {
  const page = record(value);
  if (!Array.isArray(page.items)) throw new Error("Página inválida");
  return {
    siguienteCursor: page.nextCursor === null ? null : contentId(page.nextCursor),
    elementos: page.items.map(value => {
      const p = record(value), category = record(p.category), counts = record(p._count);
      const status: "visible" | "retenido" | "eliminado" | null = p.status === "visible" ? "visible" : p.status === "held" ? "retenido" : p.status === "deleted" ? "eliminado" : null;
      if (!status) throw new Error("Estado inválido");
      return {
        id: contentId(p.postId), authorId: contentId(p.authorId),
        groupId: p.groupId === null ? null : contentId(p.groupId),
        title: text(p.title), content: text(p.content), status,
        category: { id: contentId(category.categoryId), name: text(category.name) },
        createdAt: date(p.createdAt), updatedAt: p.updatedAt === null ? null : date(p.updatedAt),
        commentCount: integer(counts.comments), attachmentCount: integer(counts.attachments),
      };
    }),
  };
}
