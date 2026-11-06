import type { ReactNode } from "react";
import { CircleCheck, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const styles = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
};
export function Notice({
  children,
  kind = "info",
  className,
}: {
  children: ReactNode;
  kind?: keyof typeof styles;
  className?: string;
}) {
  return (
    <Alert
      variant={kind === "error" ? "destructive" : "default"}
      role={kind === "error" ? "alert" : "status"}
      className={cn("my-4 p-3", `alert-${kind}`, styles[kind], className)}
    >
      {kind === "success" ? <CircleCheck /> : <Info />}
      <AlertDescription className="text-inherit *:data-[slot=button]:text-inherit">
        {children}
      </AlertDescription>
    </Alert>
  );
}
