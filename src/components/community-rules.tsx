"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/primitives";

export function CommunityRules() {
  const [open, setOpen] = useState(false);
  return <><button className="text-button" onClick={() => setOpen(true)}>Normas de convivencia <Icon name="arrow" size={14}/></button><Modal open={open} onClose={() => setOpen(false)} title="Aprendemos con respeto"><p>Este es un espacio para compartir conocimiento académico.</p><ul className="rules-list"><li>Trata a tus compañeros con respeto y aporta comentarios constructivos.</li><li>Cita las fuentes de los materiales que compartas.</li><li>No publiques información personal de otras personas, spam o contenido ofensivo.</li><li>Reporta el contenido que incumpla las normas.</li></ul><p className="muted small">Texto inicial para la demostración; sujeto a revisión del equipo.</p></Modal></>;
}
