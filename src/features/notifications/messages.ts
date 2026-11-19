import type { NotificationType } from './adapters';
const messages: Record<NotificationType, Record<string,string>> = {
  comment: { 'There is a new comment on your post.':'Nuevo comentario en tu publicación.' },
  reply: { 'There is a reply to your comment.':'Respondieron a tu comentario.' },
  group_post: { 'There is a new post in one of your groups.':'Nueva publicación en uno de tus grupos.' },
  report_result: {
    'One of your reports was resolved.':'Tu reporte fue revisado.',
    'Your report is awaiting review.':'Tu reporte está pendiente de revisión.',
    'Your report was reviewed and dismissed.':'Tu reporte fue revisado y desestimado.',
    'The reported content was removed.':'Se retiró el contenido reportado.',
    'The reported content was removed and its author suspended.':'Se retiró el contenido reportado y se suspendió a su autor.',
  },
  content_removed: { 'Content you published was removed.':'Se retiró un contenido que publicaste.' },
  new_report: { 'There is a report awaiting review.':'Nuevo reporte pendiente de moderación.' },
};
export function notificationMessage(type:NotificationType,original:string):string {
  return Object.hasOwn(messages[type],original) ? messages[type][original] : original;
}
