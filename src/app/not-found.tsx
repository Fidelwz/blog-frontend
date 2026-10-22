import Link from "next/link";
import { Icon } from "@/components/ui/icon";
export default function NotFound() { return <main className="standalone-state"><span className="empty-symbol"><Icon name="compass" size={36}/></span><span className="eyebrow">ERROR 404</span><h1>Este camino no lleva a una publicación.</h1><p>La página que buscas no existe o todavía no está disponible.</p><Link href="/" className="button button-primary">Volver al inicio<Icon name="arrow" size={17}/></Link></main>; }
