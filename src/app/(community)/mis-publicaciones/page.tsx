import { requireUser } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ui/coming-soon";
export default async function MyPublications() { await requireUser("/mis-publicaciones"); return <ComingSoon title="Tus ideas, en un solo lugar." description="El módulo de autoría permitirá consultar, editar y organizar tus aportes a la comunidad." icon="file" features={["Publicaciones propias", "Edición con control de versión", "Estados de moderación"]}/>; }
