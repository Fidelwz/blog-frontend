import { getSession } from "@/features/auth/server";
import { getPublicProfile } from "@/features/profile/server/public-profile";
import { PublicProfile } from "@/features/profile/public-profile";

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const profile = await getPublicProfile((await params).id);
  return { title: `${profile.firstName} ${profile.lastName}` };
}
export default async function UserProfile({ params }: Props) {
  const profile = await getPublicProfile((await params).id);
  const session = await getSession();
  return <PublicProfile profile={profile} ownProfile={session.user?.id === profile.id}/>;
}
