import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
export function ComingSoon({
  title,
  description,
  icon = "spark",
  features,
}: {
  title: string;
  description: string;
  icon?: IconName;
  features: string[];
}) {
  return (
    <Card className="upcoming items-center gap-0 ring-0">
      <span className="upcoming-icon">
        <Icon name={icon} size={36} />
      </span>
      <span className="eyebrow">SIGUIENTES ENTREGAS</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="upcoming-features">
        {features.map((f) => (
          <span key={f}>
            <Icon name="check" size={16} />
            {f}
          </span>
        ))}
      </div>
      <Badge
        variant="outline"
        className="my-6 max-w-full whitespace-normal border-amber-200 bg-amber-50 px-3 py-2 text-amber-800"
      >
        <span className="status-dot" />
        Módulo planificado · Aún no implementado
      </Badge>
      <Button asChild className="h-11">
        <Link href="/inicio">
          Volver a la demostración
          <Icon name="arrow" size={17} />
        </Link>
      </Button>
    </Card>
  );
}
