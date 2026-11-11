import Link from 'next/link';
import { groupRequest } from '@/features/groups/server';
import { ReviewForm } from '@/features/moderation/review-form';
import { RemoveContentButton } from '@/features/moderation/remove-content-button';
import { requireUser } from '@/features/auth/server';
export default async function Posts({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
 const user=await requireUser('/admin/publicaciones');const params=await searchParams;const q=new URLSearchParams();
 for(const key of ['q','status','scope','categoryId','cursor'])if(params[key])q.set(key,params[key]!);
 const page:{items:{id_publicacion:string;titulo:string;estado:string;version:number;id_autor:string}[];nextCursor:string|null}=await(await groupRequest(`/admin/posts?${q}`)).json();
 const next=new URLSearchParams(q);if(page.nextCursor)next.set('cursor',page.nextCursor);
 return <><h2 className="text-xl font-bold">Publicaciones</h2><form className="flex flex-wrap gap-3"><label>Título <input name="q" maxLength={254} defaultValue={params.q}/></label><label>Estado <select name="status" defaultValue={params.status??''}><option value="">Todos</option>{['visible','retenido','eliminado'].map(s=><option key={s}>{s}</option>)}</select></label><label>Ámbito <select name="scope" defaultValue={params.scope??''}><option value="">Todos</option><option value="public">Público</option><option value="group">Grupos</option></select></label><label>ID de materia <input name="categoryId" inputMode="numeric" defaultValue={params.categoryId}/></label><button>Filtrar</button></form>{page.items.map(post=><article key={post.id_publicacion} className="rounded-xl border bg-white p-5"><h3>{post.titulo}</h3><p>{post.estado}</p>{post.estado!=='eliminado'&&<Link href={`/publicaciones/${post.id_publicacion}`}>Ver publicación</Link>}{post.estado==='retenido'?<ReviewForm owner={String(user.id)} id={post.id_publicacion} kind="retained" type="post" version={post.version} globalAdmin/>:post.estado==='visible'?<RemoveContentButton type="post" id={post.id_publicacion} authorId={post.id_autor}/>:null}</article>)}{!page.items.length&&<p>No hay publicaciones con estos filtros.</p>}{page.nextCursor&&<Link href={`/admin/publicaciones?${next}`}>Siguiente página</Link>}</>;
}
