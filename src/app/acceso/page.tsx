import { LoginForm } from "@/features/auth";
import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/server";
import { safeReturnPath } from "@/features/auth/utils";
export const metadata = { title: "Iniciar sesión" };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string; registro?: string; restablecida?: string }> }) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const session = await getSession();
  if (session.status === "authenticated") redirect(next);
  const notice = params.notice === "expired" || params.notice === "suspended" ? params.notice : null;
  const successMessage = params.registro === "ok" ? "Cuenta creada. Inicia sesión."
    : params.restablecida === "ok" ? "Contraseña actualizada. Inicia sesión." : undefined;
  return <LoginForm returnTo={next} initialNotice={notice} successMessage={successMessage}/>;
}
