import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
export default function NotFound() {
  return (
    <main className="standalone-state">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-16 text-primary">
            <Icon name="compass" size={36} />
          </EmptyMedia>
          <span className="eyebrow">ERROR 404</span>
          <h1>Este camino no lleva a una publicación.</h1>
          <EmptyDescription>
            La página que buscas no existe o todavía no está disponible.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/">
              Volver al inicio
              <Icon name="arrow" size={17} />
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
