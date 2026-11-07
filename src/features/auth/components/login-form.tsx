"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { isEmail } from "@/lib/validation";
import { ApiError } from "@/lib/api/client";
import { AuthFrame } from "./auth-frame";
import { useAuthUiStore } from "./auth-provider";
import { useLogin } from "../mutations";
import { useSession } from "../queries";
import type { SessionNotice } from "../store";

export function LoginForm({
  returnTo,
  initialNotice = null,
  successMessage,
}: {
  returnTo: string;
  initialNotice?: SessionNotice;
  successMessage?: string;
}) {
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { submit, pending, error, reset } = useLogin(returnTo);
  const { session, error: sessionError, refetch, isFetching } = useSession();
  const notice = useAuthUiStore((state) => state.sessionNotice);
  const dismiss = useAuthUiStore((state) => state.dismissNotice);
  const setNotice = useAuthUiStore((state) => state.setNotice);
  useEffect(() => {
    if (initialNotice) setNotice(initialNotice);
  }, [initialNotice, setNotice]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const email = String(new FormData(form).get("correo") || "")
      .trim()
      .toLowerCase();
    const next: Record<string, string> = {};
    if (!isEmail(email)) next.correo = "Escribe un correo electrónico válido.";
    if (!password) next.contrasena = "Escribe tu contraseña.";
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    await submit({ email, password });
    setPassword("");
  }

  return (
    <AuthFrame mode="login">
      <form
        onSubmit={onSubmit}
        noValidate
        onChange={() => {
          if (!pending) reset();
        }}
        aria-busy={pending}
      >
        {successMessage && <Notice kind="success">{successMessage}</Notice>}
        {notice && (
          <Notice kind={notice === "suspended" ? "error" : "info"}>
            {notice === "expired"
              ? "Tu sesión ha vencido. Inicia sesión nuevamente."
              : "Tu cuenta está suspendida. Comunícate con el administrador."}
            <Button
              type="button"
              variant="link"
              className="h-auto px-1 py-0 text-xs"
              onClick={dismiss}
              aria-label="Descartar aviso de sesión"
            >
              Cerrar aviso
            </Button>
          </Notice>
        )}
        {(session.status === "unavailable" || sessionError) && (
          <Notice>
            No pudimos comprobar tu sesión.{" "}
            <Button
              type="button"
              variant="link"
              className="h-auto px-1 py-0 text-xs"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Comprobar sesión
            </Button>
          </Notice>
        )}
        <FormField
          label="Correo electrónico"
          name="correo"
          type="email"
          placeholder="estudiante@correo.com"
          autoComplete="email"
          maxLength={254}
          error={errors.correo}
          disabled={pending}
        />
        <FormField
          label="Contraseña"
          name="contrasena"
          type="password"
          revealPassword
          placeholder="Escribe tu contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.contrasena}
          disabled={pending}
        />
        <p className="field-hint">
          <Link href="/recuperar">¿Olvidaste tu contraseña?</Link>
        </p>
        {error && (
          <Notice kind="error">
            {error instanceof ApiError
              ? error.message
              : "No pudimos iniciar sesión. Revisa tu conexión e inténtalo de nuevo."}
          </Notice>
        )}
        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? "Iniciando sesión…" : "Iniciar sesión"}
          <Icon name="arrow" size={17} />
        </Button>
      </form>
    </AuthFrame>
  );
}
