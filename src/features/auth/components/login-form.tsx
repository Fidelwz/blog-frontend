"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { Alert, Button, Field } from "@/components/ui/primitives";
import { isEmail } from "@/lib/validation";
import { ApiError } from "@/lib/api/client";
import { AuthFrame } from "./auth-frame";
import { useAuthUiStore } from "./auth-provider";
import { useLogin } from "../mutations";
import { useSession } from "../queries";
import type { SessionNotice } from "../store";

export function LoginForm({ returnTo, initialNotice = null }: { returnTo: string; initialNotice?: SessionNotice }) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { submit, pending, error, reset } = useLogin(returnTo);
  const { session, error: sessionError, refetch, isFetching } = useSession();
  const notice = useAuthUiStore(state => state.sessionNotice);
  const dismiss = useAuthUiStore(state => state.dismissNotice);
  const setNotice = useAuthUiStore(state => state.setNotice);
  useEffect(() => { if (initialNotice) setNotice(initialNotice); }, [initialNotice, setNotice]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const email = String(new FormData(form).get("correo") || "").trim().toLowerCase();
    const next: Record<string, string> = {};
    if (!isEmail(email)) next.correo = "Escribe un correo electrónico válido.";
    if (!password) next.contrasena = "Escribe tu contraseña.";
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) { (form.elements.namedItem(first) as HTMLElement | null)?.focus(); return; }
    await submit({ email, password });
    setPassword("");
  }

  return <AuthFrame mode="login"><form onSubmit={onSubmit} noValidate onChange={() => { if (!pending) reset(); }} aria-busy={pending}>
    {notice && <Alert kind={notice === "suspended" ? "error" : "info"}>
      {notice === "expired" ? "Tu sesión ha vencido. Inicia sesión nuevamente." : "Tu cuenta está suspendida. Comunícate con el administrador."}
      <button type="button" className="text-button" onClick={dismiss} aria-label="Descartar aviso de sesión">Cerrar aviso</button>
    </Alert>}
    {(session.status === "unavailable" || sessionError) && <Alert>No pudimos comprobar tu sesión. <button type="button" className="text-button" onClick={() => void refetch()} disabled={isFetching}>Comprobar sesión</button></Alert>}
    <Field label="Correo electrónico" name="correo" type="email" placeholder="estudiante@correo.com" autoComplete="email" maxLength={254} error={errors.correo} disabled={pending}/>
    <div className="password-wrap"><Field label="Contraseña" name="contrasena" type={showPassword ? "text" : "password"} placeholder="Escribe tu contraseña" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} error={errors.contrasena} disabled={pending}/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}><Icon name="eye" size={18}/></button></div>
    <p className="field-hint">La recuperación de contraseña estará disponible próximamente.</p>
    {error && <Alert kind="error">{error instanceof ApiError ? error.message : "No pudimos iniciar sesión. Revisa tu conexión e inténtalo de nuevo."}</Alert>}
    <Button type="submit" className="full-width" disabled={pending}>{pending ? "Iniciando sesión…" : "Iniciar sesión"}<Icon name="arrow" size={17}/></Button>
  </form></AuthFrame>;
}
