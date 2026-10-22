"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Modal } from "@/components/ui/primitives";
import { DEMO_MODE } from "@/lib/demo";

const navigation: { href: string; label: string; icon: IconName; short: string }[] = [
  { href: "/inicio", label: "Inicio", icon: "home", short: "Inicio" },
  { href: "/buscar", label: "Explorar publicaciones", icon: "compass", short: "Buscar" },
  { href: "/mis-publicaciones", label: "Mis publicaciones", icon: "file", short: "Mis publicaciones" },
  { href: "/grupos", label: "Grupos de estudio", icon: "users", short: "Grupos" },
  { href: "/notificaciones", label: "Notificaciones", icon: "bell", short: "Avisos" },
  { href: "/perfil", label: "Mi perfil", icon: "user", short: "Perfil" },
];
export function Logo() {
  return <Link href="/" className="logo" aria-label="Blog Interactivo, inicio"><span className="logo-mark"><Icon name="book" size={23}/></span><span>Blog <strong>Interactivo</strong><small>COMUNIDAD ESTUDIANTIL</small></span></Link>;
}
export function CommunityRules() {
  const [open, setOpen] = useState(false);
  return <><button className="text-button" onClick={() => setOpen(true)}>Normas de convivencia <Icon name="arrow" size={14}/></button><Modal open={open} onClose={() => setOpen(false)} title="Aprendemos con respeto"><p>Este es un espacio para compartir conocimiento académico.</p><ul className="rules-list"><li>Trata a tus compañeros con respeto y aporta comentarios constructivos.</li><li>Cita las fuentes de los materiales que compartas.</li><li>No publiques información personal de otras personas, spam o contenido ofensivo.</li><li>Reporta el contenido que incumpla las normas.</li></ul><p className="muted small">Texto inicial para la demostración; sujeto a revisión del equipo.</p></Modal></>;
}
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isPublic = path === "/" || path === "/buscar" || path.startsWith("/publicaciones/");
  const active = (href: string) => path === href || (href === "/inicio" && path === "/");
  return <>
    <a href="#contenido" className="skip-link">Saltar al contenido</a>
    <header className="site-header"><div className="brand-area"><Logo/></div><form action="/buscar" className="header-search" role="search"><Icon name="search" size={19}/><input name="q" aria-label="Buscar publicaciones" placeholder="Busca apuntes, publicaciones o materias…"/><kbd aria-hidden="true">↵</kbd></form><div className="header-actions">{DEMO_MODE && <span className="demo-pill"><span/>Demostración</span>}{isPublic ? <><Link className="login-link" href="/acceso">Iniciar sesión</Link><Link className="button button-primary compact" href="/registro">Crear cuenta <Icon name="arrow" size={16}/></Link></> : <><Link href="/notificaciones" className="icon-button" aria-label="Ver notificaciones"><Icon name="bell"/></Link><div className="user-menu"><button className="profile-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="profile-menu"><span className="avatar avatar-blue">FC</span><span className="profile-name">Fidel Contreras<small>Vista de estudiante</small></span><Icon name="down" size={16}/></button>{menuOpen && <div className="dropdown" id="profile-menu"><Link href="/perfil" onClick={() => setMenuOpen(false)}><Icon name="user" size={17}/>Mi perfil</Link><Link href="/" onClick={() => { sessionStorage.removeItem("blog-demo-profile"); setMenuOpen(false); }}><Icon name="logout" size={17}/>Salir de la demostración</Link></div>}</div></>}</div></header>
    <aside className="sidebar"><span className="nav-caption">TU ESPACIO ACADÉMICO</span><nav aria-label="Navegación principal">{navigation.map(item => <Link key={item.href} href={item.href} className={`nav-item ${active(item.href) ? "active" : ""}`} aria-current={active(item.href) ? "page" : undefined}><Icon name={item.icon} size={20}/><span>{item.label}</span></Link>)}</nav><div className="sidebar-bottom"><div className="community-note"><span className="note-icon"><Icon name="spark" size={20}/></span><strong>Tu conocimiento suma.</strong><p>Una duda compartida puede ser el inicio de una gran idea.</p><Link href="/registro">Sé parte de la comunidad <Icon name="arrow" size={14}/></Link></div><CommunityRules/><span className="sidebar-copyright">© 2026 Blog Interactivo</span></div></aside>
    <main id="contenido" className="main-area"><div className="page-inner">{DEMO_MODE && <div className="demo-notice"><Icon name="info" size={14}/><span>Demostración · Datos de ejemplo, sin conexión al backend.</span></div>}{children}<footer className="page-footer"><span>Hecho para aprender, creado para compartir.</span><span>Blog Interactivo · 2026</span></footer></div></main>
    <nav className="mobile-nav" aria-label="Navegación móvil">{navigation.filter(n => n.href !== "/mis-publicaciones").map(item => <Link key={item.href} href={item.href} className={active(item.href) ? "active" : ""} aria-current={active(item.href) ? "page" : undefined}><Icon name={item.icon} size={21}/><span>{item.short}</span></Link>)}</nav>
  </>;
}
