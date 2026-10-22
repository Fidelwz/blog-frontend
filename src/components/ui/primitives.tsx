"use client";

import { useEffect, useRef, useId, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";
import { Icon } from "./icon";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button {...props} className={`button button-${variant} ${className}`} />;
}
export function Field({ label, error, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = props.id || props.name;
  return <div className="field"><label htmlFor={id}>{label}</label><input {...props} id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}/>{error && <p id={`${id}-error`} className="field-error">{error}</p>}{hint && !error && <p id={`${id}-hint`} className="field-hint">{hint}</p>}</div>;
}
export function Alert({ children, kind = "info" }: { children: ReactNode; kind?: "info" | "success" | "error" }) {
  return <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}><Icon name={kind === "success" ? "check" : "info"} size={19}/><div>{children}</div></div>;
}
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = dialog.current;
    if (open) el?.showModal(); else el?.close();
    return () => { el?.close(); };
  }, [open]);
  return <dialog ref={dialog} className="modal" aria-labelledby={titleId} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-head"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Cerrar diálogo" onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><span className="empty-symbol"><Icon name="search" size={30}/></span><h2>{title}</h2><p>{children}</p></div>;
}
