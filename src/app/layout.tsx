/* eslint-disable @next/next/no-page-custom-font -- App Router root layout persists this stylesheet across every route. */
import type { Metadata } from "next";
import "./globals.css";
import { dehydrate } from "@tanstack/react-query";
import { getSessionSnapshot } from "@/features/auth/server";
import { createQueryClient } from "@/lib/query/client";
import { sessionKey } from "@/features/auth/cache";
import { AppProviders } from "./providers";
export const metadata: Metadata = { title: { default: "Blog Interactivo · Aprendamos juntos", template: "%s | Blog Interactivo" }, description: "Apuntes, ideas y conversaciones para tu comunidad estudiantil. Comparte conocimiento y aprende en equipo.", robots: { index: false, follow: false } };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { session, updatedAt } = await getSessionSnapshot();
  const client = createQueryClient();
  client.setQueryData(sessionKey, session, { updatedAt });
  return <html lang="es"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/></head><body><AppProviders state={dehydrate(client)}>{children}</AppProviders></body></html>;
}
