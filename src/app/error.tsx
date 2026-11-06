"use client";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="standalone-state">
      <Empty>
        <EmptyHeader>
          <h1>No pudimos cargar esta página.</h1>
          <EmptyDescription>
            Inténtalo de nuevo en unos momentos.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={reset}>Volver a intentar</Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
