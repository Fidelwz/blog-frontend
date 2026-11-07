export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
export const isResetToken = (value: string) => value.length === 43 && /^[A-Za-z0-9_-]{43}$/.test(value);
export function passwordRules(value: string) {
  return [value.length >= 8 && value.length <= 72 && new TextEncoder().encode(value).length <= 72,
    /\p{Lu}/u.test(value), /\d/.test(value), /[^\p{L}\p{N}\s]/u.test(value)];
}
export function validateRegistration(data: { nombre: string; apellido: string; correo: string; contrasena: string; confirmacion: string; acepta: boolean }) {
  const errors: Record<string, string> = {};
  for (const key of ["nombre", "apellido"] as const) {
    if (data[key].trim().length < 2 || data[key].trim().length > 80) errors[key] = "Escribe entre 2 y 80 caracteres.";
  }
  if (!isEmail(data.correo.trim())) errors.correo = "Escribe un correo electrónico válido.";
  if (!passwordRules(data.contrasena).every(Boolean)) errors.contrasena = "Completa los cuatro requisitos de seguridad.";
  if (data.contrasena !== data.confirmacion) errors.confirmacion = "Las contraseñas no coinciden.";
  if (!data.acepta) errors.acepta = "Acepta las normas de convivencia para continuar.";
  return errors;
}
