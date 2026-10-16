import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { ReportFilterOptions } from "./report-service";
import type { OperationalReport, ReportFilters } from "./report-types";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { SystemState } from "@/shared/components/system-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { ReportFiltersForm } from "./report-filters";
import { MetricCard, SectionState } from "./report-components";
import { DemandSection } from "./report-demand";
import { CoverageAndSchedules } from "./report-coverage";
import { HoursAndActivities } from "./report-hours";
import { formatDate, formatNumber, makeRetryHref, type SearchQuery } from "./report-presentation";

export interface ReportsScreenProps {
  report: OperationalReport | null;
  filterOptions: ReportFilterOptions | null;
  query: SearchQuery;
  filterErrors?: string[];
  loadError?: boolean;
  filterOptionsError?: boolean;
}

function currentFilterValues(report: OperationalReport | null): Partial<ReportFilters> {
  return report?.filters ?? {};
}

function hasSectionErrors(report: OperationalReport) {
  return Object.values(report).some(
    (section) =>
      typeof section === "object" &&
      section !== null &&
      "status" in section &&
      section.status === "error",
  );
}

function isPeriodEmpty(report: OperationalReport) {
  if (
    report.consultationDemand.status !== "ready" ||
    report.plannedSchedules.status !== "ready" ||
    report.movements.status !== "ready" ||
    report.activities.status !== "ready"
  ) {
    return false;
  }

  return (
    report.consultationDemand.data.total === 0 &&
    report.plannedSchedules.data.totalOccurrences === 0 &&
    report.movements.data.creditCount + report.movements.data.debitCount === 0 &&
    report.activities.data.totalActivities === 0
  );
}

export function ReportsScreen({
  report,
  filterOptions,
  query,
  filterErrors = [],
  loadError = false,
  filterOptionsError = false,
}: ReportsScreenProps) {
  const retryHref = makeRetryHref(query);
  const filters = currentFilterValues(report);
  const issues = [...new Set(filterErrors)];
  const partial = report !== null && hasSectionErrors(report);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        description="Consultar demanda, cobertura y movimientos a partir de registros consolidados."
        title="Reportes"
      />

      <section aria-labelledby="filters-heading">
        <ReportFiltersForm
          key={JSON.stringify([filters, query])}
          filterOptions={filterOptions}
          filterOptionsError={filterOptionsError}
          filters={filters}
          query={query}
        />
      </section>

      {issues.length > 0 && (
        <SystemState variant="error" title="No se pudieron aplicar los filtros"
          description={<ul className="list-disc space-y-1 pl-5">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>} />
      )}

      {loadError && (
        <SectionState
          description="Los valores enviados se mantienen en el formulario. Reintentar la consulta para volver a cargar los reportes."
          retryHref={retryHref}
          title="No se pudieron cargar los reportes"
        />
      )}

      {partial && (
        <SystemState variant="degraded" title={<StatusBadge label="Carga parcial" variant="warning" />}
          description="Una o más secciones no están disponibles; el resto conserva sus resultados."
          action={<Link className={buttonVariants({ variant: "outline", size: "sm" })} href={retryHref}>Reintentar todas</Link>} />
      )}

      {report !== null && (
        <>
          <section aria-labelledby="summary-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2
                  className="font-display text-xl font-bold text-foreground"
                  id="summary-heading"
                >
                  Resumen
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Período del {formatDate(report.filters.fromDate)} al {formatDate(report.filters.toDate)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard
                detail="Consultas consolidadas en el período"
                label="Consultas"
                value={report.consultationDemand.status === "ready" ? formatNumber(report.consultationDemand.data.total) : "—"}
              />
              <MetricCard
                detail="Clasificadas por materia"
                label="De materia"
                value={report.consultationDemand.status === "ready" ? formatNumber(report.consultationDemand.data.subjectTotal) : "—"}
              />
              <MetricCard
                detail="Clasificadas como generales"
                label="Generales"
                value={report.consultationDemand.status === "ready" ? formatNumber(report.consultationDemand.data.generalTotal) : "—"}
              />
              <MetricCard
                detail="Cantidad actual según los filtros de carrera y tutor"
                label="Tutores activos"
                value={report.activeTutors.status === "ready" ? formatNumber(report.activeTutors.data.count) : "—"}
              />
            </div>
          </section>

          {isPeriodEmpty(report) && (
            <EmptyState
              className="min-h-0 py-6 sm:py-6"
              description="Los indicadores de estado actual, cuando están disponibles, siguen describiendo el ciclo vigente."
              title="No hay datos para los filtros seleccionados."
              action={<Link className={buttonVariants({ variant: "outline" })} href="/admin/reports">Restablecer filtros</Link>}
            />
          )}

          <DemandSection retryHref={retryHref} section={report.consultationDemand} />
          <CoverageAndSchedules report={report} retryHref={retryHref} />
          <HoursAndActivities report={report} retryHref={retryHref} />
        </>
      )}
    </div>
  );
}
