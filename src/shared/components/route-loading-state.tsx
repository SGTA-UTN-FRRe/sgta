import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RouteLoadingState() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando sección"
      className="space-y-6 pb-8"
    >
      <span className="sr-only">Cargando sección</span>
      <div aria-hidden="true" className="space-y-3 border-b border-border/70 pb-6">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <section aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-36 max-w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
      <Card aria-hidden="true">
        <CardHeader>
          <Skeleton className="h-5 w-40 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-row"
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
