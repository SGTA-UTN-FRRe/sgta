import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/shared/components/page-header";

export default function AdminReportsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando reportes"
      className="space-y-6 pb-8"
      role="status"
    >
      <PageHeader
        description="Consultar demanda, cobertura, asistencia y movimientos a partir de registros consolidados."
        title="Reportes"
      />
      <Card>
        <CardHeader>
          <span className="h-5 w-24 animate-pulse rounded-sm bg-surface-subtle" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              aria-hidden="true"
              className="h-10 animate-pulse rounded-sm bg-surface-subtle"
              key={index}
            />
          ))}
        </CardContent>
      </Card>
      <section aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-5">
              <span className="block h-4 w-28 animate-pulse rounded-sm bg-surface-subtle" />
              <span className="block h-8 w-20 animate-pulse rounded-sm bg-surface-subtle" />
              <span className="block h-3 w-36 animate-pulse rounded-sm bg-surface-subtle" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
