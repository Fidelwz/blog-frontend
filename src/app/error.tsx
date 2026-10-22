"use client";
import { Button } from "@/components/ui/primitives";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="standalone-state"><h1>No pudimos cargar esta página.</h1><p>Inténtalo de nuevo en unos momentos.</p><Button onClick={reset}>Volver a intentar</Button></main>; }
