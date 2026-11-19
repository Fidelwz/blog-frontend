"use client";

import { useId, useState, type ComponentProps } from "react";
import { Eye, EyeOff, Mail, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

type FormFieldProps = ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  hint?: string;
  revealPassword?: boolean;
};

/** Shared labels, validation messages and password visibility for all forms. */
export function FormField({
  label,
  error,
  hint,
  revealPassword = false,
  className,
  ...props
}: FormFieldProps) {
  const generatedId = useId();
  const id = props.id ?? props.name ?? generatedId;
  const [visible, setVisible] = useState(false);
  const describedBy =
    [
      props["aria-describedby"],
      error ? `${id}-error` : hint ? `${id}-hint` : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <Field
      className="mb-5 gap-2"
      data-invalid={!!error}
      data-disabled={props.disabled}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        {(props.type === "email" || revealPassword) && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">{props.type === "email" ? <Mail size={18}/> : <LockKeyhole size={18}/>}</span>}
        <Input
          {...props}
          id={id}
          type={revealPassword ? (visible ? "text" : "password") : props.type}
          className={cn("h-11", (props.type === "email" || revealPassword) && "pl-10", revealPassword && "pr-12", className)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
        />
        {revealPassword && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
            onClick={() => setVisible(!visible)}
            disabled={props.disabled}
            aria-controls={id}
            aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
            aria-pressed={visible}
          >
            {visible ? <EyeOff /> : <Eye />}
          </Button>
        )}
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {hint && !error && (
        <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
      )}
    </Field>
  );
}
