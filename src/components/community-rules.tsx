"use client";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export function CommunityRules() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="link"
          className="h-auto px-0 text-xs text-muted-foreground"
        >
          Normas de convivencia <Icon name="arrow" size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6 text-xl">
            Aprendemos con respeto
          </DialogTitle>
          <DialogDescription>
            Este es un espacio para compartir conocimiento académico.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-3 pl-5 text-sm text-muted-foreground">
          <li>
            Trata a tus compañeros con respeto y aporta comentarios
            constructivos.
          </li>
          <li>Cita las fuentes de los materiales que compartas.</li>
          <li>
            No publiques información personal de otras personas, spam o
            contenido ofensivo.
          </li>
          <li>Reporta el contenido que incumpla las normas.</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Texto inicial para la demostración; sujeto a revisión del equipo.
        </p>
      </DialogContent>
    </Dialog>
  );
}
