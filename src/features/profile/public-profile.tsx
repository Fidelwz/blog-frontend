import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicProfile as PublicProfileData } from "./types";

export function PublicProfile({ profile, ownProfile }: { profile: PublicProfileData; ownProfile: boolean }) {
  const name = `${profile.firstName} ${profile.lastName}`;
  const registered = new Intl.DateTimeFormat("es-SV", { dateStyle: "long", timeZone: "America/El_Salvador" }).format(new Date(profile.registeredAt));
  return <>
    <div className="page-heading">
      <span className="eyebrow">NUESTRA COMUNIDAD</span>
      <h1>{name}</h1>
      <p>Conoce a quienes comparten contigo.</p>
    </div>
    <div className="profile-layout">
      <Card className="profile-summary gap-0 ring-0">
        <UserAvatar initials={`${profile.firstName.trim().slice(0, 1)}${profile.lastName.trim().slice(0, 1)}`.toUpperCase()} photoUrl={profile.photoUrl} large/>
        <h2>{name}</h2>
        <Badge variant="secondary" className="mx-auto mt-3">{profile.role === "administrador" ? "Administrador" : "Miembro de la comunidad"}</Badge>
        <p>Miembro desde <time dateTime={profile.registeredAt}>{registered}</time></p>
        {ownProfile && <Button asChild className="mt-4"><Link prefetch={false} href="/perfil">Editar mi perfil</Link></Button>}
      </Card>
      <Card className="profile-form gap-5 ring-0">
        <h2>Acerca de {profile.firstName}</h2>
        <dl className="space-y-5">
          <div><dt className="font-semibold">Carrera</dt><dd>{profile.major || "Todavía no ha compartido su carrera."}</dd></div>
          <div><dt className="font-semibold">Universidad</dt><dd>{profile.university || "Todavía no ha compartido su universidad."}</dd></div>
          <div><dt className="font-semibold">Biografía</dt><dd className="whitespace-pre-wrap break-words">{profile.bio || "Pronto podrás conocer un poco más de esta persona."}</dd></div>
        </dl>
        <dl className="mt-6 flex gap-8 border-t pt-5">
          <div><dt>Publicaciones</dt><dd className="text-2xl font-semibold">{profile._count.posts}</dd></div>
          <div><dt>Grupos</dt><dd className="text-2xl font-semibold">{profile._count.groups}</dd></div>
        </dl>
      </Card>
    </div>
  </>;
}
