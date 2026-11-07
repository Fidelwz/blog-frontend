import { Shell } from "@/components/layout/shell";

// No loading boundary: missing profiles must resolve before HTTP headers are sent.
export default function ProfilesLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
