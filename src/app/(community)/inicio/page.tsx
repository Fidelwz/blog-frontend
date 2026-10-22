import { redirect } from "next/navigation";
import { Hero, Explorer, CommunityAside } from "@/features/publications/explorer";
import { DEMO_MODE } from "@/lib/demo";
export const metadata = { title: "Inicio de demostración" };
export default function DemoHome() {
  if (!DEMO_MODE) redirect("/acceso");
  return <><Hero student/><div className="content-grid feed-page"><section aria-label="Publicaciones de ejemplo"><Explorer/></section><CommunityAside/></div></>;
}
