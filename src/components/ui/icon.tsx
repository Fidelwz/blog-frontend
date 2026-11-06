import type { CSSProperties } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Code,
  Compass,
  Database,
  Ellipsis,
  Eye,
  FileText,
  House,
  Info,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Sigma,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
const icons = {
  book: BookOpen,
  home: House,
  search: Search,
  users: Users,
  bell: Bell,
  user: UserRound,
  file: FileText,
  arrow: ArrowRight,
  chevron: ChevronRight,
  down: ChevronDown,
  plus: Plus,
  comment: MessageCircle,
  paperclip: Paperclip,
  more: Ellipsis,
  code: Code,
  database: Database,
  math: Sigma,
  shield: ShieldCheck,
  mail: Mail,
  lock: Lock,
  eye: Eye,
  check: Check,
  close: X,
  info: Info,
  logout: LogOut,
  spark: Sparkles,
  menu: Menu,
  camera: Camera,
  compass: Compass,
};
export type IconName = keyof typeof icons;
export function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const LucideIcon = icons[name];
  return (
    <LucideIcon
      size={size}
      strokeWidth={1.65}
      aria-hidden="true"
      className={className}
      style={style}
    />
  );
}
