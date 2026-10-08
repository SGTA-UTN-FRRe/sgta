import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/shared/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&>svg]:size-3.5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success:
          "border-border bg-muted text-foreground [&>svg]:text-success before:bg-success",
        warning:
          "border-border bg-muted text-foreground [&>svg]:text-warning before:bg-warning",
        danger:
          "border-border bg-muted text-foreground [&>svg]:text-destructive before:bg-destructive",
        info: "border-border bg-muted text-foreground [&>svg]:text-info before:bg-info",
        neutral:
          "border-border bg-muted text-foreground [&>svg]:text-muted-foreground before:bg-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean };
function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";
  const semantic = ["success", "warning", "danger", "info", "neutral"].includes(
    variant ?? "",
  );
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(
        badgeVariants({ variant }),
        semantic && "before:size-1.5 before:shrink-0 before:rounded-full",
        className,
      )}
      {...props}
    />
  );
}
export { Badge, badgeVariants };
