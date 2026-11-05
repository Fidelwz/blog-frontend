"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CommunityRules } from "@/components/community-rules";
import { AuthFrame } from "./components/auth-frame";
import { Icon } from "@/components/ui/icon";
import { Alert, Button, Field } from "@/components/ui/primitives";
import { isEmail, passwordRules, validateRegistration } from "@/lib/validation";

type Mode = "register" | "recover" | "reset";
const labels = { register: "Crear cuenta", recover: "Recuperar contraseña", reset: "Restablecer contraseña" };
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
    if (mode === "recover" && !isEmail(text("correo").trim())) nextErrors.correo = "Escribe un correo electrónico válido.";
    if (mode === "reset") {
      if (!passwordRules(password).every(Boolean)) nextErrors.contrasena = "Completa los cuatro requisitos de seguridad.";
      if (password !== text("confirmacion")) nextErrors.confirmacion = "Las contraseñas no coinciden.";
    }
    setErrors(nextErrors);
    setValidated(!Object.keys(nextErrors).length);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) { (form.elements.namedItem(firstError) as HTMLElement | null)?.focus(); return; }
  }
  return <AuthFrame mode={mode}><form onSubmit={submit} noValidate onChange={() => setValidated(false)}>
      {mode === "register" && <div className="field-row"><Field label="Nombre" name="nombre" placeholder="Tu nombre" autoComplete="given-name" maxLength={80} error={errors.nombre}/><Field label="Apellido" name="apellido" placeholder="Tu apellido" autoComplete="family-name" maxLength={80} error={errors.apellido}/></div>}
      {mode !== "reset" && <Field label="Correo electrónico" name="correo" type="email" placeholder="estudiante@correo.com" autoComplete="email" maxLength={254} error={errors.correo}/>}
      {mode !== "recover" && <div className="password-wrap"><Field label={mode === "reset" ? "Nueva contraseña" : "Contraseña"} name="contrasena" type={showPassword ? "text" : "password"} placeholder="Escribe tu contraseña" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} error={errors.contrasena}/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}><Icon name="eye" size={18}/></button></div>}
      {(mode === "register" || mode === "reset") && <><div className="password-strength" aria-label="Requisitos de contraseña">{["Mínimo 8 caracteres", "Una mayúscula", "Un número", "Un símbolo"].map((rule, i) => <span key={rule} className={passwordRules(password)[i] ? "met" : ""}><Icon name={passwordRules(password)[i] ? "check" : "info"} size={13}/>{rule}</span>)}</div><Field label="Confirmar contraseña" name="confirmacion" type={showPassword ? "text" : "password"} placeholder="Repite tu contraseña" autoComplete="new-password" error={errors.confirmacion}/></>}
      {mode === "register" && <div className="consent"><label><input type="checkbox" name="acepta" aria-describedby={errors.acepta ? "acepta-error" : undefined}/>Acepto las normas de convivencia de la comunidad.</label>{errors.acepta && <p id="acepta-error" className="field-error">{errors.acepta}</p>}<CommunityRules/></div>}
      {mode === "recover" && <p className="field-hint">El flujo previsto utiliza un enlace de un solo uso con vigencia de 30 minutos.</p>}
      <Button type="submit" className="full-width">{mode === "recover" ? "Validar solicitud" : mode === "reset" ? "Validar contraseña" : labels[mode]}<Icon name="arrow" size={17}/></Button>
      {validated && <Alert kind="success"><strong>Validación completada.</strong><p>Esta es una vista previa del frontend. No se ha {mode === "register" ? "creado una cuenta" : mode === "recover" ? "enviado un correo" : "cambiado la contraseña"}. La conexión con NestJS corresponde a la siguiente entrega.</p><Link href="/">Explorar publicaciones de ejemplo →</Link></Alert>}
    </form></AuthFrame>;
}
