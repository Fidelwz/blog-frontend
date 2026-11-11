"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../auth/queries";
import { sessionKey } from "../auth/cache";
import type { AuthSession } from "../auth/types";
import { retainEditorDocument, refreshEditorSession } from "../auth/editor-session";
import { ApiError } from "../../lib/api/client.ts";
import { useDraftNavigation } from "../../lib/navigation/draft-navigation";
import { clearInvalidProfileSession } from "../profile/cache.ts";
import { createPublicationWriter, newPostOperation, uncertainWrite, type PostOperation } from "./operations.ts";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/notice";

type Props = { id: string; authorId: string; returnTo?: "/inicio" | "/mis-publicaciones"; accessAllowed?:boolean };
const writer = createPublicationWriter();

export function PostActions(props: Props) {
  const { session } = useSession();
  const [owned, setOwned] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const active = session.status === "authenticated" && String(session.user.id) === props.authorId;
  if (active && !owned) setOwned(true);
  const differentAccount = owned && session.status === "authenticated" && !active;
  if (differentAccount && !discarded) setDiscarded(true);
  if ((!owned && !active) || differentAccount || discarded) return null;
  return <OwnedPostActions {...props} active={active}/>;
}

function OwnedPostActions({ id, authorId, returnTo = "/inicio", active, accessAllowed = true }: Props & { active: boolean }) {
  const client = useQueryClient();
  const busy = useRef(false);
  const alive = useRef(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [operation, setOperation] = useState<PostOperation | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { allowNavigation } = useDraftNavigation(!confirmed && (pending || uncertain));
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => operation ? retainEditorDocument(client) : undefined, [client, operation]);
  const sameOwner = () => {
    const session = client.getQueryData<AuthSession>(sessionKey);
    return session?.status === "authenticated" && String(session.user.id) === authorId;
  };
  async function remove(attempt?: PostOperation, check = false) {
    if (busy.current || !sameOwner() || (!attempt && !accessAllowed)) return;
    if (!attempt && !window.confirm("¿Eliminar esta publicación? Dejará de estar disponible.")) return;
    const next = attempt ?? newPostOperation(authorId, "DELETE", undefined, id);
    busy.current = true; setPending(true); setError(null); setOperation(next);
    const wasUncertain = uncertain;
    try {
      const result = check ? await writer.reconcile(next) : await writer.send(next);
      if (!alive.current) return;
      if (!("postId" in result)) {
        setUncertain(true);
        setError(new Error("La eliminación aún no está confirmada. Comprueba de nuevo o reintenta la misma eliminación."));
        return;
      }
      setConfirmed(true); setUncertain(false); setOperation(null);
      await client.invalidateQueries({ queryKey: ["posts"] });
      if (alive.current && sameOwner()) { allowNavigation(); window.location.assign(returnTo); }
    } catch (e) {
      if (!alive.current) return;
      const unknown = uncertainWrite(e, wasUncertain || check);
      setUncertain(unknown);
      if (!unknown) setOperation(null);
      setError(e instanceof Error ? e : new Error("No pudimos eliminar la publicación."));
      if (sameOwner()) {
        await clearInvalidProfileSession(client, e);
        if (e instanceof ApiError && e.code === "OperationOwnerChanged") await refreshEditorSession(client);
      }
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }
  if (!active) return operation ? <Notice>Comprueba tu sesión con la misma cuenta para resolver la eliminación pendiente.
    <Button asChild variant="outline"><a href="/acceso?next=%2Finicio" target="_blank" rel="noopener noreferrer">Iniciar sesión en otra pestaña</a></Button>
    <Button type="button" onClick={() => void refreshEditorSession(client)}>Comprobar sesión</Button>
  </Notice> : null;
  if (confirmed) return <Notice kind="success">Eliminación confirmada. <Link href={returnTo}>Volver a publicaciones</Link></Notice>;
  if (!accessAllowed && !operation) return null;
  return <div className="my-4 flex flex-wrap gap-3" aria-busy={pending}>
    {accessAllowed && !pending && !uncertain && <Button asChild variant="outline"><Link href={`/publicaciones/${id}/editar`}>Editar</Link></Button>}
    <Button variant="destructive" disabled={!accessAllowed || pending || uncertain} onClick={() => void remove()}>{pending ? "Comprobando o eliminando…" : "Eliminar"}</Button>
    {error && <Notice kind="error">{error instanceof ApiError && error.status === 404 && !uncertain ? <>La publicación ya no está disponible. <Link href={returnTo}>Volver a publicaciones</Link></> : error.message}</Notice>}
    {uncertain && operation && <Notice>No sabemos si se eliminó. Evitamos una operación nueva hasta comprobarlo.
      <div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" disabled={pending} onClick={() => void remove(operation, true)}>Comprobar eliminación</Button>
      <Button disabled={pending} onClick={() => void remove(operation)}>Reintentar misma eliminación</Button></div>
    </Notice>}
  </div>;
}
