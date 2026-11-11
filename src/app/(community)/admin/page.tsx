import { groupRequest } from '@/features/groups/server';
export default async function AdminSummary({searchParams}:{searchParams:Promise<{days?:string}>}) {
  const days=(await searchParams).days==='30'?'30':'7';
  const data:Record<string,number> = await (await groupRequest(`/admin/summary?days=${days}`)).json();
  const labels:Record<string,string>={users:'Usuarios registrados',suspended:'Cuentas suspendidas',posts:'Publicaciones visibles del período',comments:'Comentarios visibles del período',reports:'Reportes pendientes',groups:'Grupos de estudio'};
  return <><form className="flex gap-3"><label>Período <select name="days" defaultValue={days} className="rounded border p-2"><option value="7">7 días</option><option value="30">30 días</option></select></label><button className="rounded border px-4">Aplicar</button></form><p className="text-sm text-slate-500">Publicaciones y comentarios se cuentan por fecha de creación y estado visible actual. Los demás indicadores son totales actuales.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(labels).map(([key,label])=><article key={key} className="rounded-xl border bg-white p-6"><h2>{label}</h2><p className="mt-3 text-3xl font-bold">{data[key]}</p></article>)}</div></>;
}
