"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../lib/api/client.ts";
import { useDraftNavigation } from "../../lib/navigation/draft-navigation";
import { useSession } from "../auth/queries";
import { sessionKey } from "../auth/cache";
import type { AuthSession } from "../auth/types";
import { retainEditorDocument, refreshEditorSession } from "../auth/editor-session";
import { clearInvalidProfileSession } from "../profile/cache.ts";
import type { Category } from "../categories/adapters.ts";
import type { Post } from "./adapters.ts";
import { hasRichFormatting, htmlToText, textToHtml } from "./editor.ts";
import { createPublicationWriter, newPostOperation, uncertainWrite, type PostOperation } from "./operations.ts";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const writer = createPublicationWriter();
type Props = { categories: Category[]; post?: Post; ownerId: string };

export function PublicationForm(props: Props) {
  const { session } = useSession();
  const client = useQueryClient();
  const [discarded, setDiscarded] = useState(false);
  const differentAccount = session.status === "authenticated" && String(session.user.id) !== props.ownerId;
  // Unmount the editor (and its draft/operation) permanently on an account change.
  // A later return to the original account must not resurrect another tab's draft.
  if (differentAccount && !discarded) setDiscarded(true);
  useEffect(() => discarded ? undefined : retainEditorDocument(client), [client, discarded]);
  if (discarded || differentAccount) return <Notice>La cuenta cambió. Descartamos el borrador de la cuenta anterior. <Link href="/publicaciones/nueva">Abrir un formulario nuevo</Link></Notice>;
  return <OwnedPublicationForm {...props} active={session.status === "authenticated" && !differentAccount} suspended={session.status === "suspended"}/>;
}

function OwnedPublicationForm({ categories, post, ownerId, active, suspended }: Props & { active: boolean; suspended: boolean }) {
  const rich = post ? hasRichFormatting(post.content) : false;
  const initialText = post && !rich ? htmlToText(post.content) : "";
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(initialText);
  const [category, setCategory] = useState(post?.categoryId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [operation, setOperation] = useState<PostOperation | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const client = useQueryClient();
  const dirty = title !== (post?.title ?? "") || content !== initialText || category !== (post?.categoryId ?? "");
  const { allowNavigation } = useDraftNavigation(!confirmed && (dirty || pending || uncertain));
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const sameOwner = () => {
    const session = client.getQueryData<AuthSession>(sessionKey);
    return session?.status === "authenticated" && String(session.user.id) === ownerId;
  };
  async function perform(attempt: PostOperation, check = false) {
    if (busy.current || !sameOwner()) return;
    busy.current = true; setPending(true); setError(null); setOperation(attempt);
    const wasUncertain = uncertain;
    try {
      const result = check ? await writer.reconcile(attempt) : await writer.send(attempt);
      if (!alive.current) return;
      if (!("postId" in result)) {
        setUncertain(true);
        setError(new Error("El servidor aún no confirma este guardado. Puedes comprobar de nuevo o reintentar el mismo guardado sin crear una operación nueva."));
        return;
      }
      setConfirmed(result.postId); setUncertain(false); setOperation(null);
      await client.invalidateQueries({ queryKey: ["posts"] });
      // Reconciliation stays on the form: another tab may have edited/deleted
      // the post since this receipt. The user opens the CURRENT version explicitly.
      if (!check && alive.current && sameOwner()) {
        allowNavigation(); window.location.assign(`/publicaciones/${result.postId}`);
      }
    } catch (e) {
      if (!alive.current) return;
      const unknown = uncertainWrite(e, wasUncertain || check);
      setUncertain(unknown);
      if (!unknown) setOperation(null);
      setError(e instanceof Error ? e : new Error("No pudimos completar el guardado."));
      if (sameOwner()) {
        await clearInvalidProfileSession(client, e);
        if (e instanceof ApiError && e.code === "OperationOwnerChanged") await refreshEditorSession(client);
      }
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current || uncertain || confirmed || !active) return;
    const html = textToHtml(content);
    if (title.trim().length < 3 || title.trim().length > 150 || !categories.some(c => c.id === category) || !Number.isSafeInteger(Number(category)) || Number(category) <= 0 || (!rich && (!html || html.length > 20000))) {
      setError(new Error("Revisa el título (3–150), la materia y el contenido (máximo 20 000 caracteres de HTML).")); return;
    }
    const body: Record<string, unknown> = post ? { version: post.version } : { title: title.trim(), content: html, categoryId: Number(category) };
    if (post) {
      if (title.trim() !== post.title) body.title = title.trim();
      if (category !== post.categoryId) body.categoryId = Number(category);
      if (!rich && content !== initialText) body.content = html;
    }
    await perform(newPostOperation(ownerId, post ? "PATCH" : "POST", body, post?.id));
  }
  if (!active) return <section aria-label="Recuperar sesión de edición">
    <h1>{suspended ? "Tu cuenta está suspendida" : "Comprueba tu sesión para continuar"}</h1>
    <Notice>El borrador se conserva únicamente en la memoria de esta pestaña y permanece oculto. Vuelve con la misma cuenta; recargar o cerrar la pestaña lo descarta.</Notice>
    <Button asChild variant="outline"><a href="/acceso?next=%2Finicio" target="_blank" rel="noopener noreferrer">Iniciar sesión en otra pestaña</a></Button>
    <Button type="button" onClick={() => void refreshEditorSession(client)}>Comprobar sesión</Button>
  </section>;
  const locked = pending || uncertain || Boolean(confirmed);
  return <form onSubmit={submit} className="grid gap-4" aria-busy={pending} data-draft-form>
    <h1>{post ? "Editar publicación" : "Crear publicación"}</h1>
    {!post && <Notice>Después de guardar, podrás añadir imágenes desde la sección Imágenes de tu publicación.</Notice>}
    {confirmed && <Notice kind="success">El servidor confirmó el guardado. La publicación pudo cambiar después en otra pestaña. <Button type="button" onClick={() => { allowNavigation(); window.location.assign(`/publicaciones/${confirmed}`); }}>Ver versión actual</Button></Notice>}
    {error && <Notice kind="error">{error.message} {error instanceof ApiError && error.status === 409 && error.code !== "OperationKeyConflict" && <Button type="button" variant="outline" onClick={() => { if (window.confirm("Recargar descartará este borrador. ¿Continuar?")) { allowNavigation(); window.location.reload(); } }}>Cargar versión actual</Button>}</Notice>}
    {uncertain && operation && <Notice>No sabemos si se guardó. Conservamos el borrador y evitamos un envío nuevo hasta comprobarlo.
      <div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => void perform(operation, true)}>Comprobar guardado</Button>
      <Button type="button" disabled={pending} onClick={() => void perform(operation)}>Reintentar mismo guardado</Button></div>
    </Notice>}
    <label htmlFor="publication-title">Título</label><Input id="publication-title" value={title} onChange={e => setTitle(e.target.value)} minLength={3} maxLength={150} required disabled={locked}/>
    <label htmlFor="publication-category">Materia</label><select id="publication-category" className="rounded-md border p-2" value={category} onChange={e => setCategory(e.target.value)} required disabled={locked}><option value="">Selecciona una materia</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    {rich ? <Notice>Esta publicación tiene formato enriquecido. Se conservará intacto; este editor permite cambiar su título y materia.</Notice> : <><label htmlFor="publication-content">Contenido</label><Textarea id="publication-content" value={content} onChange={e => setContent(e.target.value)} required rows={12} disabled={locked}/><p>{textToHtml(content).length} / 20 000 caracteres de HTML</p></>}
    <Button type="submit" disabled={locked || !categories.length || (Boolean(post) && !dirty)}>{pending ? "Comprobando o guardando…" : "Guardar publicación"}</Button>
  </form>;
}
