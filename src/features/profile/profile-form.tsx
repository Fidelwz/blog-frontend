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
import { Field as FieldGroup, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { UserAvatar } from "@/components/user-avatar";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api/client";
import type { Profile } from "./types";
import { buildProfilePatch, profileValues, validateProfile, type ProfileValues } from "./validation";
import { useUpdateProfile, useUploadPhoto } from "./mutations";
import { photoError } from "./photo";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const saving = useRef(false);
  const mutation = useUpdateProfile();
  const photoMutation = useUploadPhoto();
  const photoInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const pending = mutation.pending || photoMutation.pending;
  const [source, setSource] = useState(profile);
  const [values, setValues] = useState(() => profileValues(profile));
  const [baseline, setBaseline] = useState(() => profileValues(profile));
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const dirtyValues = JSON.stringify(values) !== JSON.stringify(baseline);
  const dirty = dirtyValues || photo !== null;
  // Refresh pristine fields without overwriting an edit when a query revalidates.
  if (source !== profile) {
    setSource(profile);
    setBaseline(profileValues(profile));
    if (!dirtyValues) setValues(profileValues(profile));
  }
  useEffect(() => { return () => { if (photo) URL.revokeObjectURL(photo.url); }; }, [photo]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const leave = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.origin !== location.origin ||
          link.pathname === location.pathname || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(link.pathname + link.search);
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leave, true); };
  }, [dirty]);

  const update = (key: keyof ProfileValues, value: string) => {
    setValues({ ...values, [key]: value });
    setMessage("");
    mutation.reset();
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const next = validateProfile(values);
    setErrors(next);
    const firstError = Object.keys(next)[0];
    if (firstError) { (event.currentTarget.elements.namedItem(firstError) as HTMLElement | null)?.focus(); return; }
    const patch = buildProfilePatch(baseline, values);
    if (!Object.keys(patch).length) { setValues(baseline); return; }
    saving.current = true;
    setMessage("");
    try {
      const updated = await mutation.save(patch);
      if (!updated) return;
      setValues(profileValues(updated));
      setBaseline(profileValues(updated));
      setMessage("Perfil actualizado");
    } finally { saving.current = false; }
  }

  async function savePhoto() {
    if (!photo || saving.current) return;
    saving.current = true;
    setMessage("");
    try {
      const updated = await photoMutation.save({ file: photo.file });
      if (updated) { setPhoto(null); setMessage("Foto de perfil actualizada"); }
    } finally { saving.current = false; }
  }

  return <>
    <div className="page-heading">
      <span className="eyebrow">TU IDENTIDAD EN LA COMUNIDAD</span>
      <h1>Mi perfil</h1>
      <p>Cuéntanos un poco de ti y de lo que te gusta aprender.</p>
    </div>
    <div className="profile-layout">
      <Card className="profile-summary gap-0 ring-0">
        <UserAvatar initials={`${values.firstName.trim().slice(0, 1)}${values.lastName.trim().slice(0, 1)}`.toUpperCase()} photoUrl={photo?.url ?? profile.photoUrl} large/>
        <h2>{values.firstName} {values.lastName}</h2>
        <Badge variant="secondary" className="mx-auto mt-3">{profile.role === "administrador" ? "Administrador" : "Miembro de la comunidad"}</Badge>
        <p>{values.major || "Agrega tu carrera a tu perfil."}</p>
        <Button type="button" variant="outline" className="my-4" disabled={pending} onClick={() => photoInput.current?.click()}><Icon name="camera" size={17}/>Cambiar foto</Button>
        <Input ref={photoInput} type="file" aria-label="Foto de perfil" accept="image/jpeg,image/png" className="sr-only" disabled={pending} onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          const invalid = photoError(file);
          photoMutation.reset();
          setMessage("");
          if (invalid) { setErrors({ ...errors, foto: invalid.message }); setPhoto(null); return; }
          setErrors({ ...errors, foto: "" });
          setPhoto({ file, url: URL.createObjectURL(file) });
        }}/>
        <span className="small muted">JPG o PNG · Hasta 4 MB</span>
        {errors.foto && <p className="field-error" role="alert">{errors.foto}</p>}
        {photo && <>
          <p className="small muted">Vista previa. Pulsa Guardar foto para subirla.</p>
          <Button type="button" disabled={pending} onClick={() => void savePhoto()}>{photoMutation.pending ? "Subiendo…" : "Guardar foto"}</Button>
        </>}
        {photoMutation.error && <Notice kind="error">{photoMutation.error instanceof ApiError ? photoMutation.error.message : "No pudimos guardar la imagen, inténtalo de nuevo."}</Notice>}
      </Card>
      <Card className="profile-form gap-0 ring-0">
        <form onSubmit={save} noValidate aria-busy={pending}>
          <fieldset disabled={pending} className="min-w-0">
            <h2>Información personal</h2>
            <p className="muted small">Tu presentación en la comunidad estudiantil.</p>
            <div className="field-row">
              <FormField label="Nombre" name="firstName" value={values.firstName} onChange={e => update("firstName", e.target.value)} maxLength={80} error={errors.firstName}/>
              <FormField label="Apellido" name="lastName" value={values.lastName} onChange={e => update("lastName", e.target.value)} maxLength={80} error={errors.lastName}/>
            </div>
            <FormField label="Correo electrónico" name="email" type="email" value={profile.email} readOnly hint="El correo no se puede modificar desde el perfil."/>
            <FormField label="Carrera (opcional)" name="major" value={values.major} onChange={e => update("major", e.target.value)} maxLength={100} error={errors.major}/>
            <FormField label="Universidad (opcional)" name="university" value={values.university} onChange={e => update("university", e.target.value)} maxLength={120} error={errors.university}/>
            <FieldGroup className="mb-5" data-invalid={!!errors.bio}>
              <FieldLabel htmlFor="bio">Biografía (opcional)</FieldLabel>
              <Textarea id="bio" name="bio" value={values.bio} onChange={e => update("bio", e.target.value)} maxLength={500} rows={4}
                aria-invalid={!!errors.bio} aria-describedby={errors.bio ? "bio-error" : "bio-hint"}/>
              {errors.bio ? <FieldError id="bio-error">{errors.bio}</FieldError> : <FieldDescription id="bio-hint">{values.bio.length}/500 caracteres</FieldDescription>}
            </FieldGroup>
            {mutation.error && <Notice kind="error">{mutation.error instanceof ApiError ? mutation.error.message : "No pudimos guardar el perfil. Inténtalo de nuevo."}</Notice>}
            {message && <Notice kind="success">{message}</Notice>}
            <div className="form-actions">
              <span className="dirty-label">{dirty && "Tienes cambios sin guardar"}</span>
              <Button type="button" variant="ghost" disabled={!dirty || pending} onClick={() => { setValues(baseline); setPhoto(null); setErrors({}); setMessage(""); mutation.reset(); photoMutation.reset(); }}>Descartar</Button>
              <Button type="submit" disabled={!dirtyValues || pending}>{mutation.pending ? "Guardando…" : "Guardar cambios"}<Icon name="check" size={16}/></Button>
            </div>
          </fieldset>
        </form>
      </Card>
    </div>
    <AlertDialog open={pendingHref !== null} onOpenChange={open => { if (!open) setPendingHref(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
          <AlertDialogDescription>Si sales de esta página perderás los cambios que todavía no has guardado.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Seguir editando</AlertDialogCancel>
          <AlertDialogAction onClick={() => { const href = pendingHref; setPendingHref(null); if (href) router.push(href); }}>Salir sin guardar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
