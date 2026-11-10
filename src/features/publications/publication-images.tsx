/* eslint-disable @next/next/no-img-element -- Local previews and stored media keep their original aspect ratio. */
"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../auth";
import { clearInvalidProfileSession } from "../profile/cache.ts";
import { photoError } from "../profile/photo.ts";
import { ApiError, createApiClient } from "../../lib/api/client.ts";
import type { Post } from "./adapters.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/notice";

const api = createApiClient("/api");
type Attachment = Post["attachments"][number];
export function PublicationImages({ postId, authorId, attachments }: { postId: string; authorId: string; attachments: Attachment[] }) {
  const { session } = useSession();
  const canEdit = session.status === "authenticated" && String(session.user.id) === authorId;
  const [selection, setSelection] = useState<{ file: File; url: string } | null>(null);
  const file = selection?.file ?? null;
  const preview = selection?.url ?? "";
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const client = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    return () => { if (selection) URL.revokeObjectURL(selection.url); };
  }, [selection]);
  async function failure(e: unknown) {
    await clearInvalidProfileSession(client, e);
    const unknownResult = !(e instanceof ApiError) || [502, 503, 504].includes(e.status);
    const configurationMissing = e instanceof ApiError && e.code === "MediaStorageNotConfigured";
    setUncertain(unknownResult && !configurationMissing);
    setError(e instanceof ApiError ? e.message : "No pudimos confirmar la subida. Recarga los recursos antes de repetirla.");
  }
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file || busy.current || uncertain || !canEdit) return;
    const invalid = photoError(file);
    if (invalid) { setError(invalid.message); return; }
    if (!title.trim() || title.trim().length > 150) { setError("Describe la imagen con un título de 1 a 150 caracteres."); return; }
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      const body = new FormData(); body.set("file", file); body.set("title", title.trim());
      await api<Attachment>(`/posts/${postId}/attachments`, { method: "POST", body, signal: AbortSignal.timeout(20000) });
      setSelection(null); setTitle(""); if (input.current) input.current.value = "";
      setMessage("Imagen guardada.");
      await client.invalidateQueries({ queryKey: ["posts"] }); router.refresh();
    } catch (e) { await failure(e); }
    finally { busy.current = false; setPending(false); }
  }
  async function remove(id: string) {
    if (!canEdit || busy.current || !window.confirm("¿Eliminar esta imagen de la publicación?")) return;
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await api(`/posts/${postId}/attachments/${id}`, { method: "DELETE", signal: AbortSignal.timeout(20000) });
      setMessage("Imagen eliminada."); await client.invalidateQueries({ queryKey: ["posts"] }); router.refresh();
    } catch (e) { await failure(e); }
    finally { busy.current = false; setPending(false); }
  }
  const images = attachments.filter(a => a.type === "image");
  if (!canEdit && !images.length) return null;
  return <section id="imagenes" aria-label="Imágenes de la publicación" className="my-6 grid gap-4" aria-busy={pending}>
    <h2>Imágenes</h2>
    {images.map(a => <figure key={a.id} className="grid gap-2"><a href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={a.title} loading="lazy" referrerPolicy="no-referrer" className="max-h-[36rem] max-w-full rounded-md object-contain"/></a><figcaption>{a.title}</figcaption>{canEdit && <Button variant="outline" disabled={pending} onClick={() => void remove(a.id)}>Eliminar imagen: {a.title}</Button>}</figure>)}
    {canEdit && <form onSubmit={upload} className="grid gap-3">
      <p>Añade imágenes JPG o PNG de hasta 4 MB. La publicación ya está guardada; un fallo de subida no la elimina.</p>
      <label htmlFor="publication-image">Imagen de la publicación</label>
      <Input ref={input} id="publication-image" type="file" accept="image/jpeg,image/png" disabled={pending || uncertain} onChange={event => {
        const selected = event.target.files?.[0]; setError(""); setMessage(""); setSelection(null);
        if (!selected) return;
        const invalid = photoError(selected);
        if (invalid) { setError(invalid.message); event.target.value = ""; return; }
        setSelection({ file: selected, url: URL.createObjectURL(selected) }); setTitle(selected.name.replace(/\.[^.]+$/, "").slice(0, 150));
      }}/>
      {file && preview && <img src={preview} alt="Vista previa de la imagen seleccionada" className="max-h-64 max-w-full rounded-md object-contain"/>}
      <label htmlFor="publication-image-title">Descripción de la imagen</label><Input id="publication-image-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={150} required disabled={pending || uncertain}/>
      <Button type="submit" disabled={!file || pending || uncertain}>{pending ? "Guardando…" : "Subir imagen"}</Button>
    </form>}
    {error && <Notice kind="error">{error} La publicación se conserva.</Notice>}
    {uncertain && <Notice>Comprueba los recursos guardados antes de repetir la operación. <Button variant="outline" onClick={() => window.location.reload()}>Recargar recursos</Button></Notice>}
    {message && <Notice kind="success">{message}</Notice>}
  </section>;
}
