/* eslint-disable @next/next/no-img-element -- Local previews and stored media keep their original aspect ratio. */
"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../auth";
import { clearInvalidProfileSession } from "../profile/cache.ts";
import { resourceFileError, compressResourceImage } from "./resource-file.ts";
import { ApiError, createApiClient } from "../../lib/api/client.ts";
import type { Post } from "./adapters.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/notice";

const api = createApiClient("/api");
type Attachment = Post["attachments"][number];
type Props = { postId: string; authorId: string; attachments: Attachment[]; editable?: boolean };
export function PublicationImages(props: Props) {
  const { session } = useSession();
  const owner = session.status === 'authenticated' ? String(session.user.id) : session.status;
  return <OwnedResources key={`${owner}:${props.postId}`} {...props}/>;
}
function OwnedResources({ postId, authorId, attachments, editable = true }: Props) {
  const { session } = useSession();
  const canEdit = editable && session.status === "authenticated" && String(session.user.id) === authorId;
  const [resourceType, setResourceType] = useState<"image" | "document" | "link">("image");
  const [link, setLink] = useState("");
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => { lifetime.current = new AbortController(); return () => lifetime.current?.abort(); }, []);
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
    if (lifetime.current?.signal.aborted) return;
    await clearInvalidProfileSession(client, e);
    const unknownResult = !(e instanceof ApiError) || [502, 503, 504].includes(e.status);
    const configurationMissing = e instanceof ApiError && e.code === "MediaStorageNotConfigured";
    setUncertain(unknownResult && !configurationMissing);
    setError(e instanceof ApiError ? e.message : "No pudimos confirmar la subida. Recarga los recursos antes de repetirla.");
  }
  async function upload(event: FormEvent) {
    event.preventDefault();
    if ((resourceType !== "link" && !file) || busy.current || uncertain || !canEdit) return;
    const invalid = file && resourceType !== "link" ? resourceFileError(file, resourceType) : null;
    if (invalid) { setError(invalid); return; }
    if (!title.trim() || title.trim().length > 150) { setError("Describe la imagen con un título de 1 a 150 caracteres."); return; }
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      let body: FormData | string;
      if (resourceType === "link") {
        const url = new URL(link);
        if (!["http:","https:"].includes(url.protocol) || url.username || url.password || link.length > 1024) throw new Error("Usa un enlace HTTP o HTTPS válido.");
        body = JSON.stringify({ type: "link", title: title.trim(), url: link });
      } else {
        const upload = resourceType === "image" ? await compressResourceImage(file!) : file!;
        body = new FormData(); body.set("file",upload); body.set("title",title.trim()); body.set("type",resourceType);
      }
      await api<Attachment>(`/posts/${postId}/attachments`, { method: "POST", body, headers: { "X-Post-Owner":authorId,...(resourceType === "link" ? { "Content-Type": "application/json" } : {}) }, signal: AbortSignal.any([AbortSignal.timeout(45000),lifetime.current!.signal]) });
      if (lifetime.current?.signal.aborted) return;
      setSelection(null); setTitle(""); if (input.current) input.current.value = "";
      setMessage(resourceType === "image" ? "Imagen guardada." : "Recurso guardado."); setLink("");
      await client.invalidateQueries({ queryKey: ["posts"] }); router.refresh();
    } catch (e) { await failure(e); }
    finally { busy.current = false; setPending(false); }
  }
  async function remove(id: string) {
    if (!canEdit || busy.current || !window.confirm("¿Eliminar este recurso de la publicación?")) return;
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await api(`/posts/${postId}/attachments/${id}`, { method: "DELETE", headers:{ "X-Post-Owner":authorId }, signal: AbortSignal.any([AbortSignal.timeout(45000), lifetime.current!.signal]) });
      if (lifetime.current?.signal.aborted) return;
      setMessage("Recurso eliminado."); await client.invalidateQueries({ queryKey: ["posts"] }); router.refresh();
    } catch (e) { await failure(e); }
    finally { busy.current = false; setPending(false); }
  }
  async function reorder(index: number, direction: -1 | 1) {
    if (busy.current || uncertain || !canEdit) return;
    const ids = attachments.map(a => Number(a.id));
    if (ids.some(id => !Number.isSafeInteger(id))) { setError("No se puede ordenar este recurso desde la web."); return; }
    [ids[index],ids[index + direction]] = [ids[index + direction],ids[index]];
    busy.current = true; setPending(true); setError("");
    try {
      await api(`/posts/${postId}/attachments/order`, { method: "PATCH", body: JSON.stringify({ attachmentIds: ids }), headers: { "Content-Type": "application/json", "X-Post-Owner":authorId }, signal: AbortSignal.any([AbortSignal.timeout(20000),lifetime.current!.signal]) });
      if (lifetime.current?.signal.aborted) return;
      setMessage("Orden guardado."); router.refresh();
    } catch (e) { await failure(e); }
    finally { busy.current = false; setPending(false); }
  }
  if (!canEdit && !attachments.length) return null;
  return <section id="recursos" aria-label="Recursos de la publicación" className="my-6 grid gap-4" aria-busy={pending}>
    <h2>Recursos</h2>
    {attachments.map((a,index) => <figure key={a.id} className="grid gap-3 rounded-xl border p-4"><a href={a.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary">{a.type === "image" ? <img src={a.url} alt={a.title} loading="lazy" referrerPolicy="no-referrer" className="max-h-[36rem] max-w-full rounded-md object-contain"/> : `${a.type === "document" ? 'PDF' : 'Enlace'} · ${a.title} ↗`}</a><figcaption>{a.title}</figcaption>{canEdit && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={pending || uncertain} onClick={() => void remove(a.id)}>Eliminar {a.type === 'image' ? 'imagen' : 'recurso'}: {a.title}</Button><Button variant="ghost" disabled={pending || uncertain || index === 0} aria-label={`Subir recurso ${a.title}`} onClick={() => void reorder(index,-1)}>↑ Subir</Button><Button variant="ghost" disabled={pending || uncertain || index === attachments.length-1} aria-label={`Bajar recurso ${a.title}`} onClick={() => void reorder(index,1)}>↓ Bajar</Button></div>}</figure>)}
    {canEdit && <form onSubmit={upload} className="grid gap-3 rounded-xl border border-dashed p-5">
      <p>Añade imágenes JPG/PNG o PDF de hasta 4 MB, o un enlace. La publicación ya está guardada; un fallo de subida no la elimina.</p>
      <label htmlFor="resource-type">Tipo de recurso</label><select id="resource-type" className="rounded-lg border p-3" value={resourceType} disabled={pending || uncertain} onChange={e => { setResourceType(e.target.value as typeof resourceType); setSelection(null); setError(""); if (input.current) input.current.value = ""; }}><option value="image">Imagen</option><option value="document">Documento PDF</option><option value="link">Enlace</option></select>
      {resourceType === 'link' ? <><label htmlFor="resource-link">Dirección del enlace</label><Input id="resource-link" type="url" value={link} onChange={e => setLink(e.target.value)} maxLength={1024} required disabled={pending || uncertain}/></> : <><label htmlFor="publication-image">{resourceType === 'image' ? 'Imagen de la publicación' : 'Documento de la publicación'}</label>
      <Input ref={input} id="publication-image" type="file" accept={resourceType === 'image' ? 'image/jpeg,image/png' : 'application/pdf'} disabled={pending || uncertain} onChange={event => {
        const selected = event.target.files?.[0]; setError(""); setMessage(""); setSelection(null);
        if (!selected) return;
        const invalid = resourceFileError(selected, resourceType);
        if (invalid) { setError(invalid); event.target.value = ""; return; }
        setSelection({ file: selected, url: URL.createObjectURL(selected) }); setTitle(selected.name.replace(/\.[^.]+$/, "").slice(0, 150));
      }}/></>}
      {resourceType === 'image' && file && preview && <img src={preview} alt="Vista previa de la imagen seleccionada" className="max-h-64 max-w-full rounded-md object-contain"/>}
      <label htmlFor="publication-image-title">{resourceType === 'image' ? 'Descripción de la imagen' : 'Título del recurso'}</label><Input id="publication-image-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={150} required disabled={pending || uncertain}/>
      <Button type="submit" disabled={(resourceType === 'link' ? !link : !file) || pending || uncertain}>{pending ? "Guardando…" : resourceType === 'image' ? "Subir imagen" : "Guardar recurso"}</Button>
    </form>}
    {error && <Notice kind="error">{error} La publicación se conserva.</Notice>}
    {uncertain && <Notice>Comprueba los recursos guardados antes de repetir la operación. <Button variant="outline" onClick={() => window.location.reload()}>Recargar recursos</Button></Notice>}
    {message && <Notice kind="success">{message}</Notice>}
  </section>;
}
