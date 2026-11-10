import { ApiError } from "../../lib/api/client.ts";
import { contentId } from "./adapters.ts";

export function parseMyPostsQuery(params: URLSearchParams) {
  try {
    if ([...params.keys()].some(key => !["status", "cursor"].includes(key) || params.getAll(key).length !== 1)) throw new Error();
    const result = new URLSearchParams();
    const status = params.get("status");
    if (status) {
      if (!["visible", "held", "deleted"].includes(status)) throw new Error();
      result.set("status", status);
    }
    const cursor = params.get("cursor");
    if (cursor) result.set("cursor", contentId(cursor));
    return result;
  } catch { throw new ApiError({ statusCode: 400, error: "InvalidQuery", mensaje: "Revisa el estado y la página solicitados." }); }
}

export function parseFeedQuery(params: URLSearchParams) {
  try {
    if ([...params.keys()].some(key => !["q", "categoryId", "cursor", "limit"].includes(key))) throw new Error();
    for (const key of params.keys()) if (params.getAll(key).length > 1) throw new Error();
    const q = params.get("q")?.trim() ?? "";
    if (q && (q.length < 2 || q.length > 254)) throw new Error();
    const result = new URLSearchParams();
    if (q) result.set("q", q);
    for (const key of ["categoryId", "cursor"]) {
      const value = params.get(key);
      if (value) {
        const id = contentId(value);
        if (key === "categoryId" && !Number.isSafeInteger(Number(id))) throw new Error();
        result.set(key, id);
      }
    }
    const raw = params.get("limit") ?? "20";
    if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 50) throw new Error();
    result.set("limit", raw);
    return result;
  } catch { throw new ApiError({ statusCode: 400, error: "InvalidQuery", mensaje: "Revisa la búsqueda y los filtros. Escribe entre 2 y 254 caracteres." }); }
}
