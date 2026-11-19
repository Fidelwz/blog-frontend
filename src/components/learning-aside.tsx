import Link from "next/link";
import { BookOpen, ShieldCheck, Users } from "lucide-react";

/** Supporting navigation without fabricated group, activity or member data. */
export function LearningAside() {
  return <aside className="community-aside" aria-label="Comunidad estudiantil">
    <section className="aside-card study-card"><Users className="mb-3" size={28}/><h2>Aprende en comunidad</h2><p>Encuentra grupos de tus materias para compartir dudas, apuntes y recursos.</p><Link href="/grupos" prefetch={false}>Explorar grupos de estudio</Link></section>
    <section className="aside-card"><BookOpen className="mb-3 text-cyan-700" size={24}/><h2>Comparte conocimiento</h2><p>Una buena pregunta o un recurso útil puede ayudar a tus compañeros.</p><Link href="/publicaciones/nueva" prefetch={false}>Crear publicación</Link></section>
    <section className="aside-card"><ShieldCheck className="mb-3 text-primary" size={24}/><h2>Una comunidad respetuosa</h2><p>Cita tus fuentes, protege los datos personales y participa con respeto.</p></section>
  </aside>;
}
