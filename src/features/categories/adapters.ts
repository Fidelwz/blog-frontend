import { contentId, record, text } from "../publications/adapters.ts";

export function parseCategories(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Catálogo inválido");
  return value.map(item => {
    const c = record(item);
    return { id: contentId(c.categoryId), name: text(c.name), description: c.description === null ? null : text(c.description) };
  });
}
export type Category = ReturnType<typeof parseCategories>[number];
