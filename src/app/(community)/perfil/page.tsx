import { ProfileDetails } from "@/features/profile/profile-details";
import { requireUser } from "@/features/auth/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/client";
import { profileKey } from "@/features/profile/query-options";
import { getMyProfile } from "@/features/profile/server/backend";
export const metadata = { title: "Mi perfil" };
export default async function Profile() {
  await requireUser("/perfil");
  const client = createQueryClient();
  await client.prefetchQuery({ queryKey: profileKey, queryFn: getMyProfile, meta: { private: true } });
  return <HydrationBoundary state={dehydrate(client)}><ProfileDetails /></HydrationBoundary>;
}
