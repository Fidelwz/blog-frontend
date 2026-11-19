"use client";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CommunityRules } from "@/components/community-rules";
import { Icon } from "@/components/ui/icon";
import type { ReactNode } from "react";
type Mode = "login" | "register" | "recover" | "reset";
const labels = { login: "Iniciar sesión", register: "Crear cuenta", recover: "Recuperar contraseña", reset: "Restablecer contraseña" };
export function AuthFrame({ mode, children }: { mode: Mode; children: ReactNode }) {
 const recovery = mode === "recover" || mode === "reset";
 return <div className={`auth-page ${recovery ? "auth-recovery" : ""}`}>
 <a href="#contenido" className="skip-link">Saltar al contenido</a>
 <header className="auth-header"><Logo/><Link href="/" className="back-link">Volver a explorar</Link></header>
 <main className="auth-main" id="contenido">
 {!recovery && <section className="auth-story"><Logo/>
 <h1>{mode === "register" ? "Únete a la comunidad estudiantil" : "Aprende y conversa con tu comunidad estudiantil"}</h1>
 <p>El espacio académico para estudiantes universitarios en El Salvador. Comparte experiencias, debate materias y potencia tu aprendizaje colaborativo.</p>
 <div className="auth-benefits">{([
 ["file", "Publica apuntes y recursos académicos", "Comparte guías, resúmenes y material de tus materias."],
 ["comment", "Comenta y responde en tiempo real", "Resuelve dudas y conversa con tus compañeros."],
 ["users", "Únete a grupos de estudio por materia", "Encuentra un espacio para aprender en equipo."],
 ] as const).map(([icon,title,description]) => <div key={icon}><span><Icon name={icon} size={24}/></span><div><h2>{title}</h2><p>{description}</p></div></div>)}</div>
 <p className="auth-community-note">Conectando mentes universitarias.</p></section>}
 <div className="auth-form-container"><section className="auth-form-panel">
 {recovery && <span className="auth-recovery-icon"><Icon name="shield" size={28}/></span>}
 <h2>{labels[mode]}</h2><p className="auth-description">{mode === "login" ? "Ingresa con tu correo institucional o personal" : mode === "register" ? "Crea tu cuenta y comienza a compartir conocimiento." : mode === "recover" ? "Escribe el correo con el que te registraste. Te enviaremos un enlace para recuperar tu acceso." : "Elige una contraseña segura para tu cuenta."}</p>
 {children}<div className="auth-switch">{mode === "login" ? <>¿No tienes cuenta? <Link href="/registro">Regístrate</Link></> : <>¿Ya tienes una cuenta? <Link href="/acceso">Iniciar sesión</Link></>}</div>
 </section></div></main><footer className="auth-footer"><span>© 2026 Blog Interactivo Estudiantil · El Salvador</span><CommunityRules/></footer></div>;
}
