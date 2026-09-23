import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/shared/utils";
import { ICON_STROKE_WIDTH } from "@/shared/constants";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  /** Primary contextual page title. */
  title: ReactNode;
  /** Optional id when another element references the page title. */
  titleId?: string;
  /** Optional supporting description or operational context. */
  description?: ReactNode;
  /** Breadcrumb items for contextual navigation. */
  breadcrumbs?: BreadcrumbItem[];
  /** Single slot for the view's dominant action, such as a primary button. */
  action?: ReactNode;
  /** Additional container classes. */
  className?: string;
}

/**
 * Standard header for SGTA views.
 * Provides clear context, accessible breadcrumbs, and an exclusive slot for
 * the dominant action.
 */
export function PageHeader({
  title,
  titleId,
  description,
  breadcrumbs,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("w-full space-y-3 pb-6 border-b border-border/70", className)} data-slot="page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Migas de pan" className="flex items-center text-xs text-foreground-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-foreground-muted/60"
                      strokeWidth={ICON_STROKE_WIDTH}
                      aria-hidden="true"
                    />
                  )}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="transition-colors hover:text-foreground hover:underline underline-offset-4"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(isLast ? "font-medium text-foreground" : "text-foreground-muted")}
                      aria-current={isLast ? "page" : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            id={titleId}
            tabIndex={-1}
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm leading-relaxed text-foreground-secondary max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center" data-slot="page-header-action">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
