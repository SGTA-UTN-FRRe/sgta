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
  Sparkles,
  XCircle,
} from "lucide-react";

import { cn } from "@/shared/utils";
import { ICON_STROKE_WIDTH } from "@/shared/constants";

export type StatusBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "faro";

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
  faro: Sparkles,
};

const VARIANT_STYLES: Record<StatusBadgeVariant, string> = {
  success: "border-success/30 bg-success-surface text-success",
  warning: "border-warning/30 bg-warning-surface text-warning",
  danger: "border-danger/30 bg-danger-surface text-danger",
  info: "border-info/30 bg-info-surface text-info",
  neutral: "border-border bg-secondary text-secondary-foreground",
  faro: "border-accent/40 bg-accent-surface text-accent-foreground",
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
    <span
      data-slot="status-badge"
      data-variant={variant}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        VARIANT_STYLES[variant],
        className,
      )}
      {...props}
    >
      {renderIcon()}
      <span>{content}</span>
    </span>
  );
}
