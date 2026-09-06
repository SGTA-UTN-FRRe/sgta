import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/shared/utils";

export interface PageContainerProps<T extends ElementType = "div"> {
  /** Elemento HTML a renderizar (por defecto 'div') */
  as?: T;
  children?: ReactNode;
  className?: string;
}

/**
 * Contenedor base de página con alineación canónica a la izquierda,
 * ancho máximo institucional de 100rem y gutters responsivos exactos:
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
        "w-full max-w-[100rem] px-4 md:px-6 lg:px-8 py-6 sm:py-8",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

