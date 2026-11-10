import Link from 'next/link';
import { groupRequest } from '@/features/groups/server';
import { contentId, record, text } from '@/features/publications/adapters';
import { safeContent } from '@/features/publications/sanitize';
import { ReviewForm } from './review-form';
export async function ModerationQueue({ owner, globalAdmin, groupId, params }: { owner:string; globalAdmin:boolean; groupId?:string; params:Record<string,string|string[]|undefined> }) {
  const base = groupId ? `/grupos/${groupId}/moderacion` : '/moderacion';
  const query = new URLSearchParams(); if (groupId) query.set('groupId',groupId);
  let error = '', kind: 'report'|'retained' = 'report', page:Record<string,unknown>|undefined;
  let items: { id:string; type:string; title:string; content:string; reason:string|null; status:string; version:number|null }[] = [];
  let nextCursor:string|null = null;
  try {
    for (const [key,value] of Object.entries(params)) {
      if (typeof value !== 'string' || !['view','type','cursor','status'].includes(key)) throw new Error();
      if (key === 'view') { if (!['report','retained'].includes(value)) throw new Error(); kind = value as 'report'|'retained'; }
      else if (key === 'cursor') query.set(key,contentId(value));
      else query.set(key,value);
    }
    page = record(await (await groupRequest(`/moderation/${kind === 'report' ? 'reports' : 'retained'}?${query}`)).json());
    if (!Array.isArray(page.items)) throw new Error();
    items = page.items.map(value => { const row = record(value); return { id:contentId(row.id),type:text(row.type),title:text(row.title),content:text(row.content),reason:kind === 'report' ? text(row.reason) : null,status:kind === 'report' ? text(row.status) : 'retenido',version:typeof row.version === 'number' ? row.version : null }; });
    nextCursor = page.nextCursor === null ? null : contentId(page.nextCursor);
  } catch { error = 'No pudimos cargar la cola. Revisa tus permisos y los filtros.'; }
  const next = new URLSearchParams(query); next.delete('groupId'); next.set('view',kind); if (nextCursor) next.set('cursor',nextCursor);
  return <div className="space-y-6"><nav className="flex flex-wrap gap-4 border-b pb-4"><Link className={kind === 'report' ? 'font-bold text-violet-700' : ''} href={base}>Reportes</Link><Link className={kind === 'retained' ? 'font-bold text-violet-700' : ''} href={`${base}?view=retained`}>Contenido retenido</Link></nav>
    <form className="flex flex-wrap gap-3 rounded-xl border bg-white p-4"><input type="hidden" name="view" value={kind}/><label>Contenido<select className="ml-2 rounded border p-2" name="type" defaultValue={query.get('type') ?? 'post'}><option value="post">Publicaciones</option><option value="comment">Comentarios</option></select></label>{kind === 'report' && <label>Estado<select className="ml-2 rounded border p-2" name="status" defaultValue={query.get('status') ?? 'pendiente'}><option value="pendiente">Pendiente</option><option value="desestimado">Desestimado</option><option value="contenido_retirado">Contenido retirado</option><option value="usuario_suspendido">Usuario suspendido</option></select></label>}<button className="rounded border px-4 py-2">Filtrar</button></form>
    {error && <p role="alert">{error} <a href={base}>Recargar</a></p>}{!error && !items.length && <div className="rounded-xl border bg-white p-8 text-center text-slate-500">No hay contenido pendiente con estos filtros.</div>}
    {items.map(item => <article key={item.id} className="rounded-2xl border bg-white p-6"><span className="text-xs font-semibold text-amber-700">{item.type === 'post' ? 'Publicación' : 'Comentario'} · {item.status.replaceAll('_',' ')}</span><h2 className="mt-2 text-xl font-bold">{item.title}</h2>{item.reason && <p className="my-3 rounded-lg bg-amber-50 p-3 text-sm">Motivo del reporte: {item.reason}</p>}<div className="article-body max-h-64 overflow-y-auto" dangerouslySetInnerHTML={{ __html:safeContent(item.content) }}/>{['pendiente','retenido'].includes(item.status) && <ReviewForm owner={owner} globalAdmin={globalAdmin} id={item.id} type={item.type} kind={kind} version={item.version}/>}</article>)}
    {nextCursor && <Link className="inline-block rounded-lg border bg-white px-4 py-2" href={`${base}?${next}`}>Siguiente página</Link>}
  </div>;
}
