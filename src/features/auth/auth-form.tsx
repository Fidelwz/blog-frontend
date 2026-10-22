"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Logo, CommunityRules } from "@/components/layout/shell";
import { Icon } from "@/components/ui/icon";
import { Alert, Button, Field } from "@/components/ui/primitives";
import { isEmail, passwordRules, validateRegistration } from "@/lib/validation";

type Mode = "login" | "register" | "recover" | "reset";
const titles = { login: "Qué bueno verte de nuevo.", register: "Tu próxima idea empieza aquí.", recover: "Recupera tu acceso.", reset: "Una nueva contraseña." };
const labels = { login: "Iniciar sesión", register: "Crear cuenta", recover: "Recuperar contraseña", reset: "Restablecer contraseña" };
export function AuthForm({ mode }: { mode: Mode }) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) || "");
    let nextErrors: Record<string, string> = {};
    if (mode === "register") nextErrors = validateRegistration({ nombre: text("nombre"), apellido: text("apellido"), correo: text("correo"), contrasena: password, confirmacion: text("confirmacion"), acepta: data.get("acepta") === "on" });
    if ((mode === "login" || mode === "recover") && !isEmail(text("correo").trim())) nextErrors.correo = "Escribe un correo electrónico válido.";
    if (mode === "login" && !password) nextErrors.contrasena = "Escribe tu contraseña.";
    if (mode === "reset") {
      if (!passwordRules(password).every(Boolean)) nextErrors.contrasena = "Completa los cuatro requisitos de seguridad.";
      if (password !== text("confirmacion")) nextErrors.confirmacion = "Las contraseñas no coinciden.";
    }
    setErrors(nextErrors);
    setValidated(!Object.keys(nextErrors).length);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) (form.elements.namedItem(firstError) as HTMLElement | null)?.focus();
  }
  return <div className="auth-page"><header className="auth-header"><Logo/><Link href="/" className="back-link">Volver a explorar <Icon name="arrow" size={17}/></Link></header><main className="auth-main" id="contenido"><section className="auth-story"><span className="eyebrow">APRENDER ES MEJOR EN COMUNIDAD</span><h1>{titles[mode]}</h1><p>Un espacio para tus preguntas, tus apuntes y todo lo que todavía nos queda por aprender.</p><div className="auth-benefits">{[{ icon: "file", title: "Comparte lo que sabes", desc: "Apuntes y recursos que hacen la diferencia." }, { icon: "comment", title: "Haz que la conversación siga", desc: "Cada pregunta abre una nueva posibilidad." }, { icon: "users", title: "Encuentra a tu equipo", desc: "Conecta con estudiantes de tus materias." }].map(item => <div key={item.title}><span><Icon name={item.icon as "file" | "comment" | "users"} size={22}/></span><div><strong>{item.title}</strong><p>{item.desc}</p></div></div>)}</div><div className="auth-quote"><span>“</span><p>Cuando compartimos una idea,<br/>todos aprendemos algo nuevo.</p><small>BLOG INTERACTIVO · COMUNIDAD ESTUDIANTIL</small></div><div className="auth-decoration" aria-hidden="true"><Icon name="book" size={200}/></div></section><section className="auth-form-panel"><span className="form-kicker">BIENVENIDO A TU COMUNIDAD</span><h2>{labels[mode]}</h2><p className="auth-description">{mode === "login" ? "Ingresa tus datos para continuar aprendiendo." : mode === "register" ? "Conecta con estudiantes que comparten tus intereses." : mode === "recover" ? "Escribe el correo con el que te registraste." : "Elige una contraseña segura para tu cuenta."}</p><form onSubmit={submit} noValidate onChange={() => setValidated(false)}>
      {mode === "register" && <div className="field-row"><Field label="Nombre" name="nombre" placeholder="Tu nombre" autoComplete="given-name" maxLength={80} error={errors.nombre}/><Field label="Apellido" name="apellido" placeholder="Tu apellido" autoComplete="family-name" maxLength={80} error={errors.apellido}/></div>}
      {mode !== "reset" && <Field label="Correo electrónico" name="correo" type="email" placeholder="estudiante@correo.com" autoComplete="email" maxLength={254} error={errors.correo}/>}
      {mode !== "recover" && <div className="password-wrap"><Field label={mode === "reset" ? "Nueva contraseña" : "Contraseña"} name="contrasena" type={showPassword ? "text" : "password"} placeholder="Escribe tu contraseña" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} error={errors.contrasena}/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}><Icon name="eye" size={18}/></button></div>}
      {(mode === "register" || mode === "reset") && <><div className="password-strength" aria-label="Requisitos de contraseña">{["Mínimo 8 caracteres", "Una mayúscula", "Un número", "Un símbolo"].map((rule, i) => <span key={rule} className={passwordRules(password)[i] ? "met" : ""}><Icon name={passwordRules(password)[i] ? "check" : "info"} size={13}/>{rule}</span>)}</div><Field label="Confirmar contraseña" name="confirmacion" type={showPassword ? "text" : "password"} placeholder="Repite tu contraseña" autoComplete="new-password" error={errors.confirmacion}/></>}
      {mode === "login" && <Link href="/recuperar" className="forgot-link">¿Olvidaste tu contraseña?</Link>}
      {mode === "register" && <div className="consent"><label><input type="checkbox" name="acepta" aria-describedby={errors.acepta ? "acepta-error" : undefined}/>Acepto las normas de convivencia de la comunidad.</label>{errors.acepta && <p id="acepta-error" className="field-error">{errors.acepta}</p>}<CommunityRules/></div>}
      {mode === "recover" && <p className="field-hint">El flujo previsto utiliza un enlace de un solo uso con vigencia de 30 minutos.</p>}
      <Button type="submit" className="full-width">{mode === "recover" ? "Validar solicitud" : mode === "reset" ? "Validar contraseña" : labels[mode]}<Icon name="arrow" size={17}/></Button>
      {validated && <Alert kind="success"><strong>Validación completada.</strong><p>Esta es una vista previa del frontend. No se ha {mode === "register" ? "creado una cuenta" : mode === "login" ? "iniciado una sesión real" : mode === "recover" ? "enviado un correo" : "cambiado la contraseña"}. La conexión con NestJS corresponde a la siguiente entrega.</p><Link href="/inicio">Explorar la demostración →</Link></Alert>}
    </form><div className="auth-switch">{mode === "login" ? <>¿Aún no tienes cuenta? <Link href="/registro">Regístrate</Link></> : <>¿Ya tienes una cuenta? <Link href="/acceso">Iniciar sesión</Link></>}</div><div className="auth-preview-note"><Icon name="info" size={17}/><span>Vista previa · Validaciones locales. No ingreses contraseñas de cuentas reales.</span></div></section></main><footer className="auth-footer"><span>© 2026 Blog Interactivo Estudiantil</span><CommunityRules/></footer></div>;
}
