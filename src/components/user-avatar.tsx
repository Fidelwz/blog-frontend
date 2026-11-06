import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
export function UserAvatar({
  initials,
  photoUrl,
  color = "blue",
  large = false,
}: {
  initials: string;
  photoUrl?: string | null;
  color?: string;
  large?: boolean;
}) {
  return (
    <Avatar
      className={cn(large ? "mx-auto size-24" : "size-9")}
      aria-hidden="true"
    >
      {photoUrl && <AvatarImage src={photoUrl} alt="" />}
      <AvatarFallback
        className={cn(`avatar-${color}`, "font-semibold", large && "text-3xl")}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
