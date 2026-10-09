import type { HTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CircleAlert, Info, LockKeyhole } from "lucide-react";
import { cn } from "@/shared/utils";

export type SystemStateVariant = "empty" | "error" | "required-action" | "degraded" | "permission";
export interface SystemStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant: SystemStateVariant;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  headingLevel?: 1 | 2 | 3;
}

const icons = { error: CircleAlert, "required-action": Info, degraded: AlertTriangle, permission: LockKeyhole };

export function SystemState({ variant, title, description, action, headingLevel = 3, className, ...props }: SystemStateProps) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  const Icon = variant === "empty" ? undefined : icons[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} data-slot="system-state" data-variant={variant}
      className={cn("flex items-start gap-3 py-4 text-foreground", className)} {...props}>
      {Icon && <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", variant === "error" ? "text-destructive" : variant === "degraded" ? "text-warning" : "text-info")} />}
      <div className="min-w-0 space-y-2">
        <Heading tabIndex={headingLevel === 1 ? -1 : undefined} className={cn("font-display font-semibold", headingLevel === 1 ? "text-2xl md:text-title" : "text-xl")}>{title}</Heading>
        {description && <div className="max-w-3xl text-sm text-muted-foreground">{description}</div>}
        {action && <div className="flex flex-wrap items-center gap-2 pt-1">{action}</div>}
      </div>
    </div>
  );
}
