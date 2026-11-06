import {
  Hero,
  Explorer,
  CommunityAside,
} from "@/features/publications/explorer";
import { DEMO_MODE } from "@/lib/demo";
import { Notice } from "@/components/notice";
export default function Home() {
  return (
    <>
      <Hero />
      {DEMO_MODE ? (
        <>
          <div className="section-intro">
            <h2>Un espacio para compartir lo que sabes</h2>
            <p>Descubre las ideas de nuestra comunidad.</p>
          </div>
          <div className="content-grid">
            <section aria-label="Publicaciones de ejemplo">
              <Explorer />
            </section>
            <CommunityAside />
          </div>
        </>
      ) : (
        <Notice>
          La API de publicaciones aún no está integrada. Activa el modo de
          demostración local para revisar el avance.
        </Notice>
      )}
    </>
  );
}
