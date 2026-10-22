import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Blog Interactivo · Aprendamos juntos", template: "%s | Blog Interactivo" }, description: "Apuntes, ideas y conversaciones para tu comunidad estudiantil. Comparte conocimiento y aprende en equipo.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
