import sanitizeHtml from 'sanitize-html';
import { contentId } from '../publications/adapters.ts';

// Same plain-text normalization as Nest's plainContent, before length checks.
export function plainCommentText(value: unknown, min: number, max: number): string {
  if (typeof value !== 'string') throw new Error('Texto inválido');
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
  const clean = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, entity: string) => entities[entity])
    .normalize('NFC').trim();
  if (clean.length < min || clean.length > max) throw new Error(`Escribe entre ${min} y ${max} caracteres.`);
  return clean;
}

export function commentQuery(params: URLSearchParams): URLSearchParams {
  const query = new URLSearchParams();
  for (const [key, value] of params) {
    if (query.has(key)) throw new Error('Filtro repetido');
    if (key === 'cursor') query.set(key, contentId(value));
    else if (key === 'limit' && /^(?:[1-9]|[1-4]\d|50)$/.test(value)) query.set(key, value);
    else throw new Error('Filtro inválido');
  }
  return query;
}
