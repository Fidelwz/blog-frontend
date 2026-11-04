import { requireUser } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ui/coming-soon";
export const metadata = { title: "Grupos de estudio" };
export default async function Groups() { await requireUser("/grupos"); return <ComingSoon title="Juntos llegamos más lejos." description="Aquí encontrarás grupos de estudio por materia, con un espacio privado para compartir recursos y conversar." icon="users" features={["Grupos por materia", "Muro privado", "Miembros y moderadores"]}/>; }
