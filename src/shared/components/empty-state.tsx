import type { ReactNode } from "react";

import { cn } from "@/shared/utils";
import { FaroIllustration } from "./faro-illustration";

export interface EmptyStateProps {
  /** Concise title for the empty state. */
  title: string;
  /** Useful, approachable descriptive copy. */
  description?: ReactNode;
  /** Contextual recovery action, such as a primary action button. */
  action?: ReactNode;
  /** Optional custom illustration; defaults to the Faro geometry. */
  illustration?: ReactNode;
  /** Additional CSS classes. */
  className?: string;
}

/**
 * Base component for views and tables without data.
 * Combines the Faro geometry with brand accents, informative copy, and room
 * for a contextual recovery action.
 */
export function EmptyState({
  title,
  description,
  action,
  illustration = <FaroIllustration />,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      data-slot="empty-state"
      className={cn(
        "flex min-h-[16rem] w-full flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface/40 px-6 py-10 text-center transition-colors sm:px-12 sm:py-14",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-center" data-slot="empty-state-illustration">
        {illustration}
      </div>

      <h3 className="mt-4 text-base font-semibold text-foreground tracking-tight sm:text-lg">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-foreground-secondary">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-5 flex items-center justify-center gap-2" data-slot="empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
}
