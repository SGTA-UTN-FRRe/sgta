import {
  isValidElement,
  type ComponentType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  XCircle,
} from "lucide-react";

import { cn } from "@/shared/utils";
import { ICON_STROKE_WIDTH } from "@/shared/constants";
import { Badge } from "@/components/ui/badge";

export type StatusBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

type StatusBadgeContent =
  | { label: string; children?: ReactNode }
  | { children: ReactNode; label?: string };

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> &
  StatusBadgeContent & {
    /** Semantic state variant. */
    variant: StatusBadgeVariant;
    /** Optional custom icon, either a Lucide component or JSX element. */
    icon?: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false" }> | ReactNode;
    className?: string;
  };

const DEFAULT_ICONS: Record<StatusBadgeVariant, ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false" }>> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
  neutral: Clock,
};

/**
 * Visual and accessible indicator for system states.
 * Accessibility rule: always express meaning through descriptive text and a
 * supporting icon so no state is communicated by color alone.
 */
export function StatusBadge({
  variant,
  label,
  children,
  icon: CustomIcon,
  className,
  ...props
}: StatusBadgeProps) {
  const content = label ?? children;

  if (!content) {
    throw new Error(
      "StatusBadge requires descriptive text through 'label' or 'children' for accessibility.",
    );
  }

  const renderIcon = () => {
    if (CustomIcon) {
      if (isValidElement(CustomIcon)) {
        return CustomIcon;
      }
      const IconComponent = CustomIcon as ComponentType<{
        className?: string;
        strokeWidth?: number;
        "aria-hidden"?: boolean | "true" | "false";
      }>;
      return (
        <IconComponent
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={ICON_STROKE_WIDTH}
          aria-hidden="true"
        />
      );
    }

    const DefaultIconComponent = DEFAULT_ICONS[variant];
    return (
      <DefaultIconComponent
        className="h-3.5 w-3.5 shrink-0"
        strokeWidth={ICON_STROKE_WIDTH}
        aria-hidden="true"
      />
    );
  };

  return (
    <Badge
      data-slot="status-badge"
      variant={variant}
      className={cn(className)}
      {...props}
    >
      {renderIcon()}
      <span>{content}</span>
    </Badge>
  );
}
