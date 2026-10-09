import type { ReactNode } from "react";

import { SystemState } from "./system-state";

export interface EmptyStateProps {
  /** Concise title for the empty state. */
  title: string;
  /** Useful, approachable descriptive copy. */
  description?: ReactNode;
  /** Contextual recovery action, such as a primary action button. */
  action?: ReactNode;
  /** Retained for compatibility; compact empty states have no illustration. */
  illustration?: ReactNode;
  /** Additional CSS classes. */
  className?: string;
}

/**
 * Base component for views and tables without data.
 * Keeps the existing view API while using the compact system-state pattern.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <SystemState
      variant="empty"
      title={title}
      description={description}
      action={action}
      data-slot="empty-state"
      className={className}
    />
  );
}
