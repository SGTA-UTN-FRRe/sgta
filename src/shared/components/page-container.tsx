import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/shared/utils";

export interface PageContainerProps<T extends ElementType = "div"> {
  /** HTML element to render; defaults to `div`. */
  as?: T;
  children?: ReactNode;
  className?: string;
}

/**
 * Base page container: left-aligned content inside the page max width with
 * the responsive gutters:
 * - Mobile: 1rem (px-4)
 * - Tablet: 1.5rem (md:px-6)
 * - Desktop: 2rem (lg:px-8)
 */
export function PageContainer<T extends ElementType = "div">({
  as,
  children,
  className,
  ...props
}: PageContainerProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof PageContainerProps<T>>) {
  const Component = as ?? "div";

  return (
    <Component
      data-slot="page-container"
      className={cn(
        "w-full max-w-page px-4 py-6 sm:py-8 md:px-6 lg:px-8",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
