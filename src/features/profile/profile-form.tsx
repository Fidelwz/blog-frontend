"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Alert, Button, Field, Modal } from "@/components/ui/primitives";

const initial = { nombre: "Fidel", apellido: "Contreras", correo: "fidel.contreras@ejemplo.edu", carrera: "Ingeniería en Sistemas", universidad: "Universidad Francisco Gavidia", biografia: "Estudiante de ingeniería. Me apasionan las bases de datos, el desarrollo web y aprender algo nuevo con mi comunidad." };
export function ProfileForm() {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [photo, setPhoto] = useState("");
  const [savedPhoto, setSavedPhoto] = useState("");
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline) || photo !== savedPhoto;
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const leave = (e: MouseEvent) => {
      const link = (e.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.origin !== location.origin || link.pathname === location.pathname || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault(); e.stopPropagation(); setPendingHref(link.pathname + link.search);
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leave, true); };
  }, [dirty]);
  const update = (key: keyof typeof initial, value: string) => { setValues({ ...values, [key]: value }); setMessage(""); };
  function save(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const key of ["nombre", "apellido"] as const) if (values[key].trim().length < 2 || values[key].trim().length > 80) next[key] = "Escribe entre 2 y 80 caracteres.";
    if (values.biografia.length > 500) next.biografia = "El máximo es de 500 caracteres.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBaseline(values); setSavedPhoto(photo); setMessage("Cambios aplicados a esta vista previa. No se han enviado a un servidor; al recargar se restauran los datos de ejemplo.");
  }
  return <><div className="page-heading"><span className="eyebrow">TU IDENTIDAD EN LA COMUNIDAD</span><h1>Mi perfil</h1><p>Cuéntanos un poco de ti y de lo que te gusta aprender.</p></div><div className="profile-layout"><aside className="profile-summary"><div className="large-avatar" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: "cover" } : undefined}>{!photo && "FC"}</div><h2>{values.nombre} {values.apellido}</h2><span className="category-tag tag-blue">Estudiante</span><p>{values.carrera}</p><label className="button button-secondary photo-label"><Icon name="camera" size={17}/>Cambiar foto<input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) { setErrors({ foto: "Selecciona una imagen JPG o PNG de hasta 5 MB." }); return; } const reader = new FileReader(); reader.onload = () => { setPhoto(String(reader.result)); setErrors({}); setMessage(""); }; reader.readAsDataURL(file); }}/></label><span className="small muted">JPG o PNG · Hasta 5 MB</span>{errors.foto && <p className="field-error" role="alert">{errors.foto}</p>}<div className="profile-demo-note"><Icon name="info" size={17}/><p>Perfil de ejemplo para presentar el avance. Los cambios son locales a esta página.</p></div></aside><form className="profile-form" onSubmit={save} noValidate><h2>Información personal</h2><p className="muted small">Tu presentación en la comunidad estudiantil.</p><div className="field-row"><Field label="Nombre" name="nombre" value={values.nombre} onChange={e => update("nombre", e.target.value)} maxLength={80} error={errors.nombre}/><Field label="Apellido" name="apellido" value={values.apellido} onChange={e => update("apellido", e.target.value)} maxLength={80} error={errors.apellido}/></div><Field label="Correo electrónico" name="correo" type="email" value={values.correo} readOnly hint="El correo no se puede modificar desde el perfil."/><Field label="Carrera (opcional)" name="carrera" value={values.carrera} onChange={e => update("carrera", e.target.value)} maxLength={100}/><Field label="Universidad (opcional)" name="universidad" value={values.universidad} onChange={e => update("universidad", e.target.value)} maxLength={120}/><div className="field"><label htmlFor="biografia">Biografía <span className="muted">(opcional)</span><span className="character-count">{values.biografia.length}/500</span></label><textarea id="biografia" value={values.biografia} onChange={e => update("biografia", e.target.value)} maxLength={500} rows={4}/></div>{message && <Alert kind="success">{message}</Alert>}<div className="form-actions"><span className="dirty-label">{dirty && "Tienes cambios sin guardar"}</span><Button type="button" variant="ghost" disabled={!dirty} onClick={() => { setValues(baseline); setPhoto(savedPhoto); setErrors({}); }}>Descartar</Button><Button type="submit" disabled={!dirty}>Guardar cambios<Icon name="check" size={16}/></Button></div></form></div><Modal open={pendingHref !== null} onClose={() => setPendingHref(null)} title="Tienes cambios sin guardar"><p>Si sales de esta página perderás los cambios que todavía no has guardado.</p><div className="form-actions"><Button variant="secondary" onClick={() => setPendingHref(null)}>Seguir editando</Button><Button onClick={() => { const href = pendingHref; setPendingHref(null); if (href) router.push(href); }}>Salir sin guardar</Button></div></Modal></>;
}
