import type { ReactNode } from "react";

import { cn } from "@/shared/utils";
import { FaroIllustration } from "./faro-illustration";

export interface EmptyStateProps {
  /** Título conciso del estado vacío */
  title: string;
  /** Copia descriptiva útil y amigable */
  description?: ReactNode;
  /** Acción contextual de resolución (ej. botón de acción primaria) */
  action?: ReactNode;
  /** Ilustración personalizada opcional (por defecto usa la ilustración geométrica del Faro) */
  illustration?: ReactNode;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Componente base para vistas y tablas sin datos.
 * Integra la ilustración geométrica del Faro con acentos Midnight Navy y Faro Amber,
 * copy informativo y espacio para una acción contextual de resolución.
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

