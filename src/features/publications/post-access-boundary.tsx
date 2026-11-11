'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth';
import { useRoom } from '@/features/realtime/provider';
import { Conversation } from '@/features/comments/conversation';
import { PostActions } from './post-actions';
import { useQueryClient } from '@tanstack/react-query';
import { hasEditorDocument } from '@/features/auth/editor-session';
export function PostAccessBoundary({id,owner,children,conversationEnabled,canModerate,authorId,editable}: {id:string;owner:string|null;children:ReactNode;conversationEnabled:boolean;canModerate:boolean;authorId:string;editable:boolean}) {
  const {session} = useSession(), router = useRouter();
  const client = useQueryClient();
  const [revoked,setRevoked] = useState(false);
  const [verifiedOwner,setVerifiedOwner] = useState(owner);
  const active = owner === null || (session.status === 'authenticated' && String(session.user.id) === owner);
  if (!active && verifiedOwner !== null) setVerifiedOwner(null);
  useEffect(() => {
    if (!owner || !active || verifiedOwner || revoked) return;
    const abort = new AbortController();
    void fetch(`/api/posts/${id}`,{cache:'no-store',signal:abort.signal}).then(response => {
      if (abort.signal.aborted) return;
      if (response.ok) { setVerifiedOwner(owner); router.refresh(); }
      else if ([403,404].includes(response.status)) setRevoked(true);
    }).catch(() => {});
    return () => abort.abort();
  },[id,owner,active,verifiedOwner,revoked,router]);
  useRoom(`publicacion:${id}`,event => {
    if (event.event === 'acceso:revocado') setRevoked(true);
    if (event.event === 'publicacion:actualizada' && !hasEditorDocument(client)) router.refresh();
  });
  const allowed = !revoked && active && (owner === null || verifiedOwner === owner);
  return <div className="reading-page"><PostActions id={id} authorId={authorId} accessAllowed={allowed && editable}/>{allowed ? children : <p role="status" className="rounded-xl border bg-white p-6">El acceso a esta publicación cambió. <a className="underline" href={`/publicaciones/${id}`}>Comprobar acceso</a></p>}
    <Conversation postId={id} enabled={conversationEnabled} accessAllowed={allowed} canModerate={allowed && canModerate}/>
  </div>;
}
