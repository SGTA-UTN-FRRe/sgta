import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
        <span className="block h-8 w-56 max-w-full rounded-sm bg-muted motion-safe:animate-pulse" />
        <span className="block h-4 w-80 max-w-full rounded-sm bg-muted motion-safe:animate-pulse" />
      </div>
      <section aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-5">
              <span className="block h-4 w-28 rounded-sm bg-muted motion-safe:animate-pulse" />
              <span className="block h-8 w-20 rounded-sm bg-muted motion-safe:animate-pulse" />
              <span className="block h-3 w-36 max-w-full rounded-sm bg-muted motion-safe:animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </section>
      <Card aria-hidden="true">
        <CardHeader>
          <span className="h-5 w-40 max-w-full rounded-sm bg-muted motion-safe:animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className="block h-10 rounded-sm bg-muted motion-safe:animate-pulse"
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
