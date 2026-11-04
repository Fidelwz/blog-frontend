import { AuthForm } from "@/features/auth/auth-form";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { safeReturnPath } from "@/lib/auth/contracts";
export const metadata = { title: "Iniciar sesión" };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeReturnPath((await searchParams).next);
  const session = await getSession();
  if (session.status === "authenticated") redirect(next);
  return <AuthForm mode="login" returnTo={next} sessionStatus={session.status}/>;
}
