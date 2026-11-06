import {
  Hero,
  Explorer,
  CommunityAside,
} from "@/features/publications/explorer";
import { Notice } from "@/components/notice";
import { DEMO_MODE } from "@/lib/demo";
import { requireUser } from "@/features/auth/server";
export const metadata = { title: "Inicio" };
export default async function Home() {
  await requireUser("/inicio");
  return (
    <>
      <Hero student />
      {DEMO_MODE ? (
        <div className="content-grid feed-page">
          <section aria-label="Publicaciones de ejemplo">
            <Explorer />
          </section>
          <CommunityAside />
        </div>
      ) : (
        <Notice>
          Las publicaciones de la comunidad estarán disponibles próximamente.
        </Notice>
      )}
    </>
  );
}
