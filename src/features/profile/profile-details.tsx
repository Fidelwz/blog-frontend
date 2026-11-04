import type { AuthUser } from "@/lib/auth/contracts";
import { userInitials } from "@/lib/auth/contracts";
import { Alert, Field } from "@/components/ui/primitives";

export function ProfileDetails({ user }: { user: AuthUser }) {
  return <>
    <div className="page-heading"><span className="eyebrow">TU ESPACIO EN LA COMUNIDAD</span><h1>Mi perfil</h1><p>Estos son los datos de tu cuenta.</p></div>
    <div className="profile-layout">
      <aside className="profile-summary">
        <div className="large-avatar" aria-hidden="true">{userInitials(user)}</div>
        <h2>{user.firstName} {user.lastName}</h2>
        <span className="category-tag">{user.role === "administrador" ? "Administrador" : "Miembro de la comunidad"}</span>
        <p>Cuenta activa</p>
      </aside>
      <section className="profile-form" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Información personal</h2><p className="small muted">Información de tu cuenta registrada.</p>
        <div className="field-row"><Field label="Nombre" name="firstName" value={user.firstName} readOnly/><Field label="Apellido" name="lastName" value={user.lastName} readOnly/></div>
        <Field label="Correo electrónico" name="email" type="email" value={user.email} readOnly/>
        <Alert>La edición del perfil estará disponible próximamente.</Alert>
      </section>
    </div>
  </>;
}
