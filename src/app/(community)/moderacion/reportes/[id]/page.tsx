import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/features/auth/server';
import { groupRequest } from '@/features/groups/server';
import { contentId } from '@/features/publications/adapters';
import { safeContent } from '@/features/publications/sanitize';
import { parseReport, reportStatusLabels } from '@/features/moderation/adapters';
import { ReviewForm } from '@/features/moderation/review-form';
import { ApiError } from '@/lib/api/client';
import { conversationError } from '@/features/comments/errors';

export const metadata = { title: 'Detalle del reporte', robots: { index: false, follow: false } };
export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { contentId(id); } catch { notFound(); }
  const user = await requireUser(`/moderacion/reportes/${id}`);
  let report;
  try { report = parseReport(await (await groupRequest(`/moderation/reports/${id}`)).json()); }
  catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return <p role="alert">{conversationError(error)}</p>;
  }
  return <section className="space-y-5">
    <Link href={report.groupId ? `/grupos/${report.groupId}/moderacion` : '/moderacion'} className="back-link">Volver a moderación</Link>
    <article className="rounded-xl border bg-white p-6">
      <span className="text-sm font-semibold text-amber-700">{reportStatusLabels[report.status]}</span>
      <h1 className="my-3">Reporte de {report.type === 'comment' ? 'comentario' : 'publicación'}</h1>
      <h2>{report.title}</h2>
      <p className="my-4 rounded-lg bg-amber-50 p-4 whitespace-pre-wrap">Motivo: {report.reason}</p>
      {report.contentStatus === 'deleted' ? <p>Contenido eliminado</p> : report.type === 'comment'
        ? <p className="whitespace-pre-wrap wrap-break-word">{report.content}</p>
        : <div className="article-body" dangerouslySetInnerHTML={{ __html: safeContent(report.content) }}/>}
      {report.observation && <p className="mt-4 whitespace-pre-wrap">Observación: {report.observation}</p>}
      {report.status === 'pending' && <ReviewForm owner={String(user.id)} id={report.id} kind="report" type={report.type} version={null} globalAdmin={user.role === 'administrador'}/>}
    </article>
  </section>;
}
