import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/auth-provider";
import { getSession } from "@/lib/auth/session";
export const metadata: Metadata = { title: { default: "Blog Interactivo · Aprendamos juntos", template: "%s | Blog Interactivo" }, description: "Apuntes, ideas y conversaciones para tu comunidad estudiantil. Comparte conocimiento y aprende en equipo.", robots: { index: false, follow: false } };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  return <html lang="es"><body><AuthProvider session={session}>{children}</AuthProvider></body></html>;
}
