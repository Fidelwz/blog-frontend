"use client";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CommunityRules } from "@/components/community-rules";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

type Mode = "login" | "register" | "recover" | "reset";
const titles = {
  login: "Qué bueno verte de nuevo.",
  register: "Tu próxima idea empieza aquí.",
  recover: "Recupera tu acceso.",
  reset: "Una nueva contraseña.",
};
const labels = {
  login: "Iniciar sesión",
  register: "Crear cuenta",
  recover: "Recuperar contraseña",
  reset: "Restablecer contraseña",
};
export function AuthFrame({
  mode,
  children,
}: {
  mode: Mode;
  children: ReactNode;
}) {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Logo />
        <Link href="/" className="back-link">
          Volver a explorar <Icon name="arrow" size={17} />
        </Link>
      </header>
      <main className="auth-main" id="contenido">
        <section className="auth-story">
          <span className="eyebrow">APRENDER ES MEJOR EN COMUNIDAD</span>
          <h1>{titles[mode]}</h1>
          <p>
            Un espacio para tus preguntas, tus apuntes y todo lo que todavía nos
            queda por aprender.
          </p>
          <div className="auth-benefits">
            {[
              {
                icon: "file",
                title: "Comparte lo que sabes",
                desc: "Apuntes y recursos que hacen la diferencia.",
              },
              {
                icon: "comment",
                title: "Haz que la conversación siga",
                desc: "Cada pregunta abre una nueva posibilidad.",
              },
              {
                icon: "users",
                title: "Encuentra a tu equipo",
                desc: "Conecta con estudiantes de tus materias.",
              },
            ].map((item) => (
              <div key={item.title}>
                <span>
                  <Icon
                    name={item.icon as "file" | "comment" | "users"}
                    size={22}
                  />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="auth-quote">
            <span>“</span>
            <p>
              Cuando compartimos una idea,
              <br />
              todos aprendemos algo nuevo.
            </p>
            <small>BLOG INTERACTIVO · COMUNIDAD ESTUDIANTIL</small>
          </div>
          <div className="auth-decoration" aria-hidden="true">
            <Icon name="book" size={200} />
          </div>
        </section>
        <Card className="auth-form-panel gap-0 rounded-none border-0 bg-transparent shadow-none ring-0">
          <span className="form-kicker">BIENVENIDO A TU COMUNIDAD</span>
          <h2>{labels[mode]}</h2>
          <p className="auth-description">
            {mode === "login"
              ? "Ingresa tus datos para continuar aprendiendo."
              : mode === "register"
                ? "Conecta con estudiantes que comparten tus intereses."
                : mode === "recover"
                  ? "Escribe el correo con el que te registraste."
                  : "Elige una contraseña segura para tu cuenta."}
          </p>
          {children}
          <div className="auth-switch">
            {mode === "login" ? (
              <>¿Aún no tienes cuenta? <Link href="/registro">Crear cuenta</Link></>
            ) : (
              <>
                ¿Ya tienes una cuenta?{" "}
                <Link href="/acceso">Iniciar sesión</Link>
              </>
            )}
          </div>
        </Card>
      </main>
      <footer className="auth-footer">
        <span>© 2026 Blog Interactivo Estudiantil</span>
        <CommunityRules />
      </footer>
    </div>
  );
}
