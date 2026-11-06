"use client";
import { useSession, userInitials } from "@/features/auth";
import { Notice } from "@/components/notice";
import { FormField } from "@/components/form-field";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";

export function ProfileDetails() {
  const { session } = useSession();
  const user = session.user;
  if (!user) return null;
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">TU ESPACIO EN LA COMUNIDAD</span>
        <h1>Mi perfil</h1>
        <p>Estos son los datos de tu cuenta.</p>
      </div>
      <div className="profile-layout">
        <Card className="profile-summary gap-0 ring-0">
          <UserAvatar
            initials={userInitials(user)}
            photoUrl={user.photoUrl}
            large
          />
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <Badge variant="secondary" className="mx-auto mt-3">
            {user.role === "administrador"
              ? "Administrador"
              : "Miembro de la comunidad"}
          </Badge>
          <p>Cuenta activa</p>
        </Card>
        <Card
          className="profile-form gap-0 ring-0"
          aria-labelledby="profile-heading"
        >
          <h2 id="profile-heading">Información personal</h2>
          <p className="small muted">Información de tu cuenta registrada.</p>
          <div className="field-row">
            <FormField
              label="Nombre"
              name="firstName"
              value={user.firstName}
              readOnly
            />
            <FormField
              label="Apellido"
              name="lastName"
              value={user.lastName}
              readOnly
            />
          </div>
          <FormField
            label="Correo electrónico"
            name="email"
            type="email"
            value={user.email}
            readOnly
          />
          <Notice>La edición del perfil estará disponible próximamente.</Notice>
        </Card>
      </div>
    </>
  );
}
