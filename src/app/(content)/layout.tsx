import { Shell } from "@/components/layout/shell";
// Resolve content before a loading boundary streams HTTP 200.
export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
