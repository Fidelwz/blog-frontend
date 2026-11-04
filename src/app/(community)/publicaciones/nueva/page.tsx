import { requireUser } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ui/coming-soon";
export default async function CreatePublication() { await requireUser("/publicaciones/nueva"); return <ComingSoon title="Hay algo que solo tú puedes compartir." description="El editor de publicaciones llegará con herramientas para dar forma a tus ideas y adjuntar recursos académicos." icon="file" features={["Título y contenido", "Categorías académicas", "Imágenes, PDF y enlaces"]}/>; }
