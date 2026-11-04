import { ProfileDetails } from "@/features/profile/profile-details";
import { requireUser } from "@/lib/auth/session";
export const metadata = { title: "Mi perfil" };
export default async function Profile() {
  return <ProfileDetails user={await requireUser("/perfil")}/>;
}
