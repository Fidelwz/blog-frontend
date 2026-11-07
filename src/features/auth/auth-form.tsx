"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CommunityRules } from "@/components/community-rules";
import { AuthFrame } from "./components/auth-frame";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field as FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { isEmail, isResetToken, passwordRules, validateRegistration } from "@/lib/validation";
import { useRegister, useForgotPassword, useResetPassword } from "@/features/auth";
import { ApiError } from "@/lib/api/client";

type Mode = "register" | "recover" | "reset";
const labels = {
  register: "Crear cuenta",
  recover: "Recuperar contraseña",
  reset: "Restablecer contraseña",
};
export function AuthForm({ mode, token = "" }: { mode: Mode; token?: string }) {
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState(false);
  const registration = useRegister();
  const recovery = useForgotPassword();
  const reset = useResetPassword();
  const mutation = mode === "register" ? registration : mode === "recover" ? recovery : reset;
  const pending = mutation.pending;
  const invalidLink = mode === "reset" && (!isResetToken(token) || (reset.error instanceof ApiError && reset.error.status === 410));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || invalidLink) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) || "");
    let nextErrors: Record<string, string> = {};
    if (mode === "register")
      nextErrors = validateRegistration({
        nombre: text("nombre"),
        apellido: text("apellido"),
        correo: text("correo"),
        contrasena: password,
        confirmacion: text("confirmacion"),
        acepta: data.get("acepta") === "on",
      });
    if (mode === "recover" && !isEmail(text("correo").trim()))
      nextErrors.correo = "Escribe un correo electrónico válido.";
    if (mode === "reset") {
      if (!passwordRules(password).every(Boolean))
        nextErrors.contrasena = "Completa los cuatro requisitos de seguridad.";
      if (password !== text("confirmacion"))
        nextErrors.confirmacion = "Las contraseñas no coinciden.";
    }
    setErrors(nextErrors);
    setValidated(false);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      (
        document.getElementById(firstError) ??
        (form.elements.namedItem(firstError) as HTMLElement | null)
      )?.focus();
      return;
    }
    if (mode === "register") {
      const success = await registration.submit({ firstName: text("nombre").trim(), lastName: text("apellido").trim(),
        email: text("correo").trim().toLowerCase(), password });
      setPassword("");
      const confirmation = form.elements.namedItem("confirmacion") as HTMLInputElement | null;
      if (confirmation) confirmation.value = "";
      if (success) { form.reset(); window.location.replace("/acceso?registro=ok"); }
    } else if (mode === "recover") {
      const success = await recovery.submit({ email: text("correo").trim().toLowerCase() });
      setValidated(success);
      if (success) form.reset();
    } else {
      const success = await reset.submit({ token, newPassword: password });
      setPassword("");
      const confirmation = form.elements.namedItem("confirmacion") as HTMLInputElement | null;
      if (confirmation) confirmation.value = "";
      if (success) { form.reset(); window.location.replace("/acceso?restablecida=ok"); }
    }
  }
  if (invalidLink) return <AuthFrame mode="reset"><Notice kind="error">
    <p>El enlace no es válido o ya venció. Solicita uno nuevo.</p>
    <Link href="/recuperar">Solicitar un nuevo enlace</Link>
  </Notice></AuthFrame>;
  return (
    <AuthFrame mode={mode}>
      <form onSubmit={submit} noValidate aria-busy={pending} onChange={() => { setValidated(false); if (!pending) mutation.reset(); }}>
        <fieldset disabled={pending} className="min-w-0">
        {mode === "register" && (
          <div className="field-row">
            <FormField
              label="Nombre"
              name="nombre"
              placeholder="Tu nombre"
              autoComplete="given-name"
              maxLength={80}
              error={errors.nombre}
            />
            <FormField
              label="Apellido"
              name="apellido"
              placeholder="Tu apellido"
              autoComplete="family-name"
              maxLength={80}
              error={errors.apellido}
            />
          </div>
        )}
        {mode !== "reset" && (
          <FormField
            label="Correo electrónico"
            name="correo"
            type="email"
            placeholder="estudiante@correo.com"
            autoComplete="email"
            maxLength={254}
            error={errors.correo}
          />
        )}
        {mode !== "recover" && (
          <FormField
            label={mode === "reset" ? "Nueva contraseña" : "Contraseña"}
            name="contrasena"
            type="password"
            revealPassword
            placeholder="Escribe tu contraseña"
            autoComplete="new-password"
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.contrasena}
          />
        )}
        {(mode === "register" || mode === "reset") && (
          <>
            <div
              className="password-strength"
              aria-label="Requisitos de contraseña"
            >
              {[
                "De 8 a 72 caracteres (máx. 72 bytes)",
                "Una mayúscula",
                "Un número",
                "Un símbolo",
              ].map((rule, i) => (
                <span
                  key={rule}
                  className={passwordRules(password)[i] ? "met" : ""}
                >
                  <Icon
                    name={passwordRules(password)[i] ? "check" : "info"}
                    size={13}
                  />
                  {rule}
                </span>
              ))}
            </div>
            <FormField
              label="Confirmar contraseña"
              name="confirmacion"
              type="password"
              revealPassword
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              maxLength={72}
              error={errors.confirmacion}
            />
          </>
        )}
        {mode === "register" && (
          <div className="mb-5 space-y-2">
            <FieldGroup orientation="horizontal" data-invalid={!!errors.acepta}>
              <Checkbox
                id="acepta"
                name="acepta"
                value="on"
                className="mt-0.5"
                aria-invalid={!!errors.acepta}
                aria-describedby={errors.acepta ? "acepta-error" : undefined}
                onCheckedChange={() => setValidated(false)}
              />
              <FieldLabel htmlFor="acepta" className="text-xs font-normal">
                Acepto las normas de convivencia de la comunidad.
              </FieldLabel>
            </FieldGroup>
            {errors.acepta && (
              <FieldError id="acepta-error">{errors.acepta}</FieldError>
            )}
            <CommunityRules />
          </div>
        )}
        {mode === "recover" && (
          <p className="field-hint">
            Recibirás un enlace de un solo uso con vigencia de
            30 minutos.
          </p>
        )}
        {mutation.error && <Notice kind="error">{mutation.error instanceof ApiError ? mutation.error.message : "No pudimos completar la solicitud. Inténtalo de nuevo."}</Notice>}
        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? "Enviando…" : mode === "recover"
            ? "Enviar instrucciones"
            : mode === "reset"
              ? "Restablecer contraseña"
              : labels[mode]}
          <Icon name="arrow" size={17} />
        </Button>
        {validated && (
          <Notice kind="success">
            Si existe una cuenta con ese correo, recibirás instrucciones.
          </Notice>
        )}
        </fieldset>
      </form>
    </AuthFrame>
  );
}
