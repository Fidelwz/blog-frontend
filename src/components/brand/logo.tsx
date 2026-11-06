import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function Logo() {
  return (
    <Link
      prefetch={false}
      href="/"
      className="logo"
      aria-label="Blog Interactivo, inicio"
    >
      <span className="logo-mark">
        <Icon name="book" size={23} />
      </span>
      <span>
        Blog <strong>Interactivo</strong>
        <small>COMUNIDAD ESTUDIANTIL</small>
      </span>
    </Link>
  );
}
