"use client";

import { NotificationCount } from "@/features/notifications/inbox";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { hasEditorDocument } from "@/features/auth/editor-session";
import { Logo } from "@/components/brand/logo";
import { CommunityRules } from "@/components/community-rules";
import { Icon, type IconName } from "@/components/ui/icon";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEMO_MODE } from "@/lib/demo";
import {
  useSession,
  useLogout,
  useAuthUiStore,
  userInitials,
  isPrivatePath,
} from "@/features/auth";
import { ApiError } from "@/lib/api/client";

const navigation: {
  href: string;
  label: string;
  icon: IconName;
  short: string;
}[] = [
  { href: "/inicio", label: "Inicio", icon: "home", short: "Inicio" },
  {
    href: "/buscar",
    label: "Explorar publicaciones",
    icon: "compass",
    short: "Buscar",
  },
  {
    href: "/mis-publicaciones",
    label: "Mis publicaciones",
    icon: "file",
    short: "Mis publicaciones",
  },
  {
    href: "/grupos",
    label: "Grupos de estudio",
    icon: "users",
    short: "Grupos",
  },
  {
    href: "/notificaciones",
    label: "Notificaciones",
    icon: "bell",
    short: "Avisos",
  },
  { href: "/perfil", label: "Mi perfil", icon: "user", short: "Perfil" },
];
export function Shell({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const path = usePathname();
  const menuOpen = useAuthUiStore((state) => state.userMenuOpen);
  const setMenuOpen = useAuthUiStore((state) => state.setMenuOpen);
  const { session, error: sessionError, refetch, isFetching } = useSession();
  const user = session.user;
  const notice = useAuthUiStore((state) => state.sessionNotice);
  const dismissNotice = useAuthUiStore((state) => state.dismissNotice);
  const { signOut, pending, error } = useLogout();
  const logoutError = error
    ? error instanceof ApiError
      ? error.message
      : "No pudimos cerrar la sesión. Revisa tu conexión e inténtalo de nuevo."
    : "";
  const hidePrivateContent =
    isPrivatePath(path) && !user && session.status !== "unavailable" && !hasEditorDocument(client);
  const active = (href: string) =>
    path === href || (href === "/inicio" && path === "/");
  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header className="site-header">
        <div className="brand-area">
          <Logo />
        </div>
        <form action="/buscar" className="header-search" role="search">
          <Icon name="search" size={19} />
          <Input
            className="border-0 bg-transparent shadow-none"
            name="q"
            aria-label="Buscar publicaciones"
            placeholder="Busca apuntes, publicaciones o materias…"
          />
          <kbd aria-hidden="true">↵</kbd>
        </form>
        <div className="header-actions">
          {DEMO_MODE && (
            <Badge variant="secondary" className="demo-pill">
              <span />
              Publicaciones de ejemplo
            </Badge>
          )}
          {!user ? (
            <>
              <Link prefetch={false} className="login-link" href="/acceso">
                Iniciar sesión
              </Link>
              <Button asChild>
                <Link prefetch={false} href="/acceso">
                  Acceder <Icon name="arrow" size={16} />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="icon">
                <Link
                  prefetch={false}
                  href="/notificaciones"
                  aria-label="Ver notificaciones"
                >
                  <Icon name="bell" />
                </Link>
              </Button>
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto gap-2 px-2 py-1 text-left"
                    aria-label={
                      "Menú de " + user.firstName + " " + user.lastName
                    }
                  >
                    <UserAvatar
                      initials={userInitials(user)}
                      photoUrl={user.photoUrl}
                    />
                    <span className="profile-name">
                      {user.firstName} {user.lastName}
                      <small>
                        {user.role === "administrador"
                          ? "Administrador"
                          : "Miembro de la comunidad"}
                      </small>
                    </span>
                    <Icon name="down" size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="min-w-0">
                    <span className="block truncate">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link prefetch={false} href="/perfil">
                      <Icon name="user" size={17} />
                      Mi perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={pending}
                    onSelect={(event) => {
                      event.preventDefault();
                      void signOut();
                    }}
                  >
                    <Icon name="logout" size={17} />
                    {pending ? "Cerrando sesión…" : "Cerrar sesión"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>
      <aside className="sidebar">
        <span className="nav-caption">TU ESPACIO ACADÉMICO</span>
        <nav aria-label="Navegación principal">
          {navigation.map((item) => (
            <Link
              prefetch={false}
              key={item.href}
              href={item.href}
              className={`nav-item ${active(item.href) ? "active" : ""}`}
              aria-current={active(item.href) ? "page" : undefined}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}{item.href === "/notificaciones" && <NotificationCount/>}</span>
            </Link>
          ))}
          {user?.role === "administrador" && <Link href="/moderacion" className="nav-item"><Icon name="shield" size={20}/>Moderación</Link>}
        </nav>
        <div className="sidebar-bottom">
          <div className="community-note">
            <span className="note-icon">
              <Icon name="spark" size={20} />
            </span>
            <strong>Tu conocimiento suma.</strong>
            <p>Una duda compartida puede ser el inicio de una gran idea.</p>
            <Link prefetch={false} href={user ? "/inicio" : "/acceso"}>
              Sé parte de la comunidad <Icon name="arrow" size={14} />
            </Link>
          </div>
          <CommunityRules />
          <span className="sidebar-copyright">© 2026 Blog Interactivo</span>
        </div>
      </aside>
      <main id="contenido" className="main-area">
        <div className="page-inner">
          {DEMO_MODE && (
            <div className="demo-notice">
              <Icon name="info" size={14} />
              <span>
                Publicaciones de ejemplo · Las publicaciones aún no están
                conectadas.
              </span>
            </div>
          )}
          {logoutError && <Notice kind="error">{logoutError}</Notice>}
          {notice && (
            <Notice kind={notice === "suspended" ? "error" : "info"}>
              {notice === "suspended"
                ? "Tu cuenta está suspendida. Comunícate con el administrador."
                : "Tu sesión ha vencido. Inicia sesión nuevamente."}{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto px-1 py-0 text-xs"
                onClick={dismissNotice}
              >
                Cerrar aviso
              </Button>
            </Notice>
          )}
          {(session.status === "unavailable" || sessionError) && (
            <Notice>
              No pudimos comprobar tu sesión.{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto px-1 py-0 text-xs"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                Comprobar sesión
              </Button>
            </Notice>
          )}
          {hidePrivateContent ? (
            <p role="status">Comprobando acceso…</p>
          ) : (
            children
          )}
          <footer className="page-footer">
            <span>Hecho para aprender, creado para compartir.</span>
            <span>Blog Interactivo · 2026</span>
          </footer>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {navigation
          .filter((n) => n.href !== "/mis-publicaciones")
          .map((item) => (
            <Link
              prefetch={false}
              key={item.href}
              href={item.href}
              className={active(item.href) ? "active" : ""}
              aria-current={active(item.href) ? "page" : undefined}
            >
              <Icon name={item.icon} size={21} />
              <span>{item.short}</span>
            </Link>
          ))}
      </nav>
    </>
  );
}
