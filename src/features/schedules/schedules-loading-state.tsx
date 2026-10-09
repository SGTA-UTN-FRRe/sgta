import { Skeleton } from "@/components/ui/skeleton";

/** Horarios skeleton that preserves the header, plan context, and grid regions. */
export function SchedulesLoadingState({ withHeader = false }: { withHeader?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Cargando horarios" className="space-y-6" role="status">
      <span className="sr-only">
        Cargando horarios. Estamos preparando el plan y sus asignaciones.
      </span>
      {withHeader && (
        <div aria-hidden="true" className="space-y-3 border-b border-border/70 pb-6">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      )}
      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-6 w-64 max-w-full" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div aria-hidden="true" className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="hidden gap-3 md:grid md:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="space-y-3" key={index}>
              <Skeleton className="mx-auto h-4 w-10" />
              <Skeleton className="h-80" />
            </div>
          ))}
        </div>
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton className="h-row" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
