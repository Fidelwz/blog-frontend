import { Hero, Explorer, CommunityAside } from "@/features/publications/explorer";
import { Alert } from "@/components/ui/primitives";
import { DEMO_MODE } from "@/lib/demo";
import { requireUser } from "@/lib/auth/session";
export const metadata = { title: "Inicio" };
export default async function Home() {
  const user = await requireUser("/inicio");
  return <><Hero student firstName={user.firstName}/>{DEMO_MODE ? <div className="content-grid feed-page"><section aria-label="Publicaciones de ejemplo"><Explorer/></section><CommunityAside/></div> : <Alert>Las publicaciones de la comunidad estarán disponibles próximamente.</Alert>}</>;
}
