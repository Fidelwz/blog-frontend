"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Field as FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { UserAvatar } from "@/components/user-avatar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const initial = {
  nombre: "Fidel",
  apellido: "Contreras",
  correo: "fidel.contreras@ejemplo.edu",
  carrera: "Ingeniería en Sistemas",
  universidad: "Universidad Francisco Gavidia",
  biografia:
    "Estudiante de ingeniería. Me apasionan las bases de datos, el desarrollo web y aprender algo nuevo con mi comunidad.",
};
export function ProfileForm() {
  const router = useRouter();
  const photoInput = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [photo, setPhoto] = useState("");
  const [savedPhoto, setSavedPhoto] = useState("");
  const dirty =
    JSON.stringify(values) !== JSON.stringify(baseline) || photo !== savedPhoto;
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const leave = (e: MouseEvent) => {
      const link = (e.target as Element).closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !link ||
        link.target === "_blank" ||
        link.origin !== location.origin ||
        link.pathname === location.pathname ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(link.pathname + link.search);
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty]);
  const update = (key: keyof typeof initial, value: string) => {
    setValues({ ...values, [key]: value });
    setMessage("");
  };
  function save(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const key of ["nombre", "apellido"] as const)
      if (values[key].trim().length < 2 || values[key].trim().length > 80)
        next[key] = "Escribe entre 2 y 80 caracteres.";
    if (values.biografia.length > 500)
      next.biografia = "El máximo es de 500 caracteres.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBaseline(values);
    setSavedPhoto(photo);
    setMessage(
      "Cambios aplicados a esta vista previa. No se han enviado a un servidor; al recargar se restauran los datos de ejemplo.",
    );
  }
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">TU IDENTIDAD EN LA COMUNIDAD</span>
        <h1>Mi perfil</h1>
        <p>Cuéntanos un poco de ti y de lo que te gusta aprender.</p>
      </div>
      <div className="profile-layout">
        <Card className="profile-summary gap-0 ring-0">
          <UserAvatar initials="FC" photoUrl={photo} large />
          <h2>
            {values.nombre} {values.apellido}
          </h2>
          <Badge variant="secondary" className="mx-auto mt-3">
            Estudiante
          </Badge>
          <p>{values.carrera}</p>
          <Button
            type="button"
            variant="outline"
            className="my-4"
            onClick={() => photoInput.current?.click()}
          >
            <Icon name="camera" size={17} />
            Cambiar foto
          </Button>
          <Input
            ref={photoInput}
            type="file"
            aria-label="Foto de perfil"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (
                !["image/jpeg", "image/png"].includes(file.type) ||
                file.size > 5 * 1024 * 1024
              ) {
                setErrors({
                  foto: "Selecciona una imagen JPG o PNG de hasta 5 MB.",
                });
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                setPhoto(String(reader.result));
                setErrors({});
                setMessage("");
              };
              reader.readAsDataURL(file);
            }}
          />
          <span className="small muted">JPG o PNG · Hasta 5 MB</span>
          {errors.foto && (
            <p className="field-error" role="alert">
              {errors.foto}
            </p>
          )}
          <div className="profile-demo-note">
            <Icon name="info" size={17} />
            <p>
              Perfil de ejemplo para presentar el avance. Los cambios son
              locales a esta página.
            </p>
          </div>
        </Card>
        <Card className="profile-form gap-0 ring-0">
          <form onSubmit={save} noValidate>
            <h2>Información personal</h2>
            <p className="muted small">
              Tu presentación en la comunidad estudiantil.
            </p>
            <div className="field-row">
              <FormField
                label="Nombre"
                name="nombre"
                value={values.nombre}
                onChange={(e) => update("nombre", e.target.value)}
                maxLength={80}
                error={errors.nombre}
              />
              <FormField
                label="Apellido"
                name="apellido"
                value={values.apellido}
                onChange={(e) => update("apellido", e.target.value)}
                maxLength={80}
                error={errors.apellido}
              />
            </div>
            <FormField
              label="Correo electrónico"
              name="correo"
              type="email"
              value={values.correo}
              readOnly
              hint="El correo no se puede modificar desde el perfil."
            />
            <FormField
              label="Carrera (opcional)"
              name="carrera"
              value={values.carrera}
              onChange={(e) => update("carrera", e.target.value)}
              maxLength={100}
            />
            <FormField
              label="Universidad (opcional)"
              name="universidad"
              value={values.universidad}
              onChange={(e) => update("universidad", e.target.value)}
              maxLength={120}
            />
            <FieldGroup className="mb-5" data-invalid={!!errors.biografia}>
              <FieldLabel htmlFor="biografia">Biografía (opcional)</FieldLabel>
              <Textarea
                id="biografia"
                value={values.biografia}
                onChange={(e) => update("biografia", e.target.value)}
                maxLength={500}
                rows={4}
                aria-invalid={!!errors.biografia}
                aria-describedby={
                  errors.biografia ? "biografia-error" : "biografia-hint"
                }
              />
              {errors.biografia ? (
                <FieldError id="biografia-error">{errors.biografia}</FieldError>
              ) : (
                <FieldDescription id="biografia-hint">
                  {values.biografia.length}/500 caracteres
                </FieldDescription>
              )}
            </FieldGroup>
            {message && <Notice kind="success">{message}</Notice>}
            <div className="form-actions">
              <span className="dirty-label">
                {dirty && "Tienes cambios sin guardar"}
              </span>
              <Button
                type="button"
                variant="ghost"
                disabled={!dirty}
                onClick={() => {
                  setValues(baseline);
                  setPhoto(savedPhoto);
                  setErrors({});
                }}
              >
                Descartar
              </Button>
              <Button type="submit" disabled={!dirty}>
                Guardar cambios
                <Icon name="check" size={16} />
              </Button>
            </div>
          </form>
        </Card>
      </div>
      <AlertDialog
        open={pendingHref !== null}
        onOpenChange={(open) => {
          if (!open) setPendingHref(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Si sales de esta página perderás los cambios que todavía no has
              guardado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const href = pendingHref;
                setPendingHref(null);
                if (href) router.push(href);
              }}
            >
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
