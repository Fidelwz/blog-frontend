import Link from "next/link";
import { Icon, type IconName } from "./icon";
export function ComingSoon({ title, description, icon = "spark", features }: { title: string; description: string; icon?: IconName; features: string[] }) {
  return <section className="upcoming"><span className="upcoming-icon"><Icon name={icon} size={36}/></span><span className="eyebrow">SIGUIENTES ENTREGAS</span><h1>{title}</h1><p>{description}</p><div className="upcoming-features">{features.map(f => <span key={f}><Icon name="check" size={16}/>{f}</span>)}</div><div className="upcoming-status"><span className="status-dot"/>Módulo planificado · Aún no implementado</div><Link href="/inicio" className="button button-primary">Volver a la demostración<Icon name="arrow" size={17}/></Link></section>;
}
