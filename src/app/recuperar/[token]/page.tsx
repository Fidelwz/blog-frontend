import { AuthForm } from "@/features/auth/auth-form";
export const metadata = { title: "Restablecer contraseña", referrer: "no-referrer" as const };
export default async function Reset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AuthForm mode="reset" token={token}/>;
}
