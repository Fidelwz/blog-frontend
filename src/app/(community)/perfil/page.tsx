import { ProfileDetails } from "@/features/profile/profile-details";
import { requireUser } from "@/features/auth/server";
export const metadata = { title: "Mi perfil" };
export default async function Profile() {
  await requireUser("/perfil");
  return <ProfileDetails/>;
}
