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
  /** Quiet actions next to the dominant action. */
  secondaryActions?: ReactNode;
  /** Keep the actions below the title until Wide, for views with several header actions. */
  actionsBelowUntilWide?: boolean;
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
  secondaryActions,
  actionsBelowUntilWide = false,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("w-full space-y-3 pb-6 border-b border-border/70", className)} data-slot="page-header">
      {breadcrumbs && breadcrumbs.length > 1 && (
        <nav aria-label="Migas de pan" className="flex items-center text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
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
                      className={cn(isLast ? "font-medium text-foreground" : "text-muted-foreground")}
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

      <div
        className={cn(
          "flex flex-col gap-4",
          actionsBelowUntilWide
            ? "lg:flex-row lg:items-center lg:justify-between"
            : "sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div className="space-y-1">
          <h1
            className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-title"
            id={titleId}
            tabIndex={-1}
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {(action || secondaryActions) && (
          <div
            className={cn(
              "flex flex-wrap shrink-0 items-center gap-2 self-start [&_[data-slot=button]]:h-11 [&_a]:h-11",
              actionsBelowUntilWide ? "lg:self-center" : "sm:self-center",
            )}
            data-slot="page-header-action"
          >
            {secondaryActions}
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
