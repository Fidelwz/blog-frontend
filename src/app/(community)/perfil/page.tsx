import { redirect } from "next/navigation";
import { ProfileForm } from "@/features/profile/profile-form";
import { DEMO_MODE } from "@/lib/demo";
export const metadata = { title: "Mi perfil · Vista previa" };
export default function Profile() { if (!DEMO_MODE) redirect("/acceso"); return <ProfileForm/>; }
