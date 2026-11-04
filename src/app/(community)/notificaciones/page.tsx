import { requireUser } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ui/coming-soon";
export default async function Notifications() { await requireUser("/notificaciones"); return <ComingSoon title="No te pierdas una buena conversación." description="Este espacio reunirá las respuestas a tus comentarios y la actividad de tus grupos de estudio." icon="bell" features={["Avisos en tiempo real", "Lecturas sincronizadas", "Actividad de tus grupos"]}/>; }
