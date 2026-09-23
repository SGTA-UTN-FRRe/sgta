import Link from "next/link";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ReportFilterOptions } from "@/features/reports/report-service";
import type {
  ActivityGroup,
  ConsultationDemandReport,
  LimitedReportGroups,
  OperationalReport,
  ReportFilters,
  ReportGroup,
  ReportSection,
} from "@/features/reports/report-types";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";

type SearchQuery = Record<string, string | string[] | undefined>;

export interface ReportsScreenProps {
  report: OperationalReport | null;
  filterOptions: ReportFilterOptions | null;
  query: SearchQuery;
  filterErrors?: string[];
  loadError?: boolean;
  filterOptionsError?: boolean;
}

const numberFormatter = new Intl.NumberFormat("es-AR");
const percentFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatMinutes(value: number) {
  const absoluteMinutes = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");
  return `${sign}${formatNumber(hours)} h ${minutes} min`;
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

function formatMonth(value: string) {
  return monthFormatter.format(new Date(`${value}-01T00:00:00.000Z`));
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function makeRetryHref(query: SearchQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry);
    } else if (value !== undefined) {
      params.append(key, value);
    }
  }
  const search = params.toString();
  return search === "" ? "/admin/reports" : `/admin/reports?${search}`;
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      className="text-sm font-medium text-foreground"
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}

const selectClassName =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring";

function FilterSelect({
  id,
  name,
  label,
  value,
  options,
  emptyLabel,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  emptyLabel: string;
}) {
  const hasCurrentValue = options.some((option) => option.id === value);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select className={selectClassName} defaultValue={value} id={id} name={name}>
        <option value="">{emptyLabel}</option>
        {value !== "" && !hasCurrentValue && (
          <option value={value}>Selección actual</option>
        )}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReportFiltersForm({
  filters,
  filterOptions,
  query,
  filterOptionsError,
}: {
  filters: Partial<ReportFilters>;
  filterOptions: ReportFilterOptions | null;
  query: SearchQuery;
  filterOptionsError: boolean;
}) {
  const fromDate = filters.fromDate ?? firstQueryValue(query.fromDate) ?? "";
  const toDate = filters.toDate ?? firstQueryValue(query.toDate) ?? "";
  const careerId = filters.careerId ?? firstQueryValue(query.careerId) ?? "";
  const subjectId = filters.subjectId ?? firstQueryValue(query.subjectId) ?? "";
  const tutorId = filters.tutorId ?? firstQueryValue(query.tutorId) ?? "";
  const modality = filters.modality ?? firstQueryValue(query.modality) ?? "";

  return (
    <Card>
      <CardHeader className="pb-4">
        <h2 className="text-base font-semibold leading-none tracking-tight text-foreground" id="filters-heading">
          Filtros
        </h2>
      </CardHeader>
      <CardContent>
        {filterOptionsError && (
          <p
            className="mb-4 rounded-sm border border-warning/30 bg-warning-surface/60 px-3 py-2 text-sm text-foreground"
            role="status"
          >
            No se pudieron cargar todas las opciones de filtro. Los resultados
            disponibles siguen visibles.
          </p>
        )}
        <form action="/admin/reports" className="space-y-4" method="get">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="fromDate">Desde</FieldLabel>
              <Input
                autoComplete="off"
                id="fromDate"
                inputMode="numeric"
                name="fromDate"
                placeholder="AAAA-MM-DD"
                type={fromDate === "" || isRealDate(fromDate) ? "date" : "text"}
                defaultValue={fromDate}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="toDate">Hasta</FieldLabel>
              <Input
                autoComplete="off"
                id="toDate"
                inputMode="numeric"
                name="toDate"
                placeholder="AAAA-MM-DD"
                type={toDate === "" || isRealDate(toDate) ? "date" : "text"}
                defaultValue={toDate}
              />
            </div>
            <FilterSelect
              emptyLabel="Todas las carreras"
              id="careerId"
              label="Carrera"
              name="careerId"
              options={filterOptions?.careers ?? []}
              value={careerId}
            />
            <FilterSelect
              emptyLabel="Todas las materias"
              id="subjectId"
              label="Materia"
              name="subjectId"
              options={filterOptions?.subjects ?? []}
              value={subjectId}
            />
            <FilterSelect
              emptyLabel="Todos los tutores"
              id="tutorId"
              label="Tutor"
              name="tutorId"
              options={filterOptions?.tutors ?? []}
              value={tutorId}
            />
            <div className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="modality">Modalidad</FieldLabel>
              <select
                className={selectClassName}
                defaultValue={modality}
                id="modality"
                name="modality"
              >
                <option value="">Todas las modalidades</option>
                {modality !== "" &&
                  modality !== "UNSPECIFIED" &&
                  !filterOptions?.modalities.includes(modality) && (
                    <option value={modality}>Selección actual</option>
                  )}
                <option value="UNSPECIFIED">Sin especificar</option>
                {(filterOptions?.modalities ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-foreground-muted">
            El período incluye ambas fechas y admite hasta 366 días. Una materia
            elegida debe pertenecer a la carrera seleccionada.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">Aplicar filtros</Button>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/admin/reports"
            >
              Restablecer filtros
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <p className="text-sm font-medium text-foreground-secondary">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
          {value}
        </p>
        <p className="mt-1 text-xs text-foreground-muted">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ReportTable({
  caption,
  headers,
  rows,
  emptyLabel,
}: {
  caption: string;
  headers: string[];
  rows: Array<{ key: string; cells: ReactNode[] }>;
  emptyLabel?: string;
}) {
  return (
    <div
      aria-label={caption}
      className="overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-full border-collapse text-left text-sm tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border bg-surface-subtle text-foreground-secondary">
          <tr>
            {headers.map((header) => (
              <th className="px-3 py-2.5 font-medium" key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr className="border-b border-border last:border-0" key={row.key}>
                {row.cells.map((cell, index) => (
                  <td className="px-3 py-2.5 align-top" key={`${row.key}-${index}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-3 py-4 text-sm text-foreground-muted"
                colSpan={headers.length}
              >
                {emptyLabel ?? "No hay datos para los filtros seleccionados."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-xs leading-relaxed text-foreground-muted">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SectionState({
  title,
  description,
  retryHref,
}: {
  title: string;
  description: string;
  retryHref: string;
}) {
  return (
    <div
      className="rounded-sm border border-danger/30 bg-danger-surface/50 p-4"
      role="alert"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-foreground-secondary">{description}</p>
        </div>
        <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={retryHref}>
          Reintentar
        </Link>
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-bold tracking-tight text-foreground" id={id}>
        {title}
      </h2>
      <p className="text-sm text-foreground-secondary">{description}</p>
    </div>
  );
}

function GroupTable<T extends ReportGroup<string | null>>({
  title,
  groups,
}: {
  title: string;
  groups: LimitedReportGroups<T>;
}) {
  return (
    <div className="space-y-2">
      <ReportTable
        caption={title}
        emptyLabel="No hay datos para los filtros seleccionados."
        headers={[title, "Consultas"]}
        rows={groups.items.map((group, index) => ({
          key: group.key ?? `${title}-${index}`,
          cells: [group.label, formatNumber(group.count)],
        }))}
      />
      {groups.truncated && (
        <p className="text-xs text-foreground-muted">
          Se muestran los primeros 50 resultados ordenados por cantidad.
        </p>
      )}
    </div>
  );
}

function DemandSection({
  section,
  retryHref,
}: {
  section: ReportSection<ConsultationDemandReport>;
  retryHref: string;
}) {
  return (
    <section aria-labelledby="demand-heading" className="space-y-4">
      <SectionHeading
        description="Filtra por período, carrera, materia, tutor y modalidad. Las consultas pendientes de clasificación quedan excluidas."
        id="demand-heading"
        title="Demanda"
      />
      {section.status !== "ready" ? (
        <SectionState
          description="Las demás secciones siguen disponibles. Vuelva a consultar la demanda para recuperar sus desgloses."
          retryHref={retryHref}
          title="No se pudo cargar la demanda de consultas"
        />
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <ReportCard title="Por carrera">
              <GroupTable groups={section.data.byCareer} title="Carrera" />
            </ReportCard>
            <ReportCard title="Por materia">
              <GroupTable groups={section.data.bySubject} title="Materia" />
            </ReportCard>
            <ReportCard title="Por tutor">
              <GroupTable groups={section.data.byTutor} title="Tutor" />
            </ReportCard>
            <ReportCard title="Por modalidad">
              <GroupTable groups={section.data.byModality} title="Modalidad" />
            </ReportCard>
            <ReportCard title="Por etapa académica">
              <GroupTable groups={section.data.byAcademicStage} title="Etapa" />
            </ReportCard>
            <ReportCard title="Evolución mensual">
              <ReportTable
                caption="Consultas por mes"
                headers={["Mes", "Consultas"]}
                rows={section.data.byMonth.map((group) => ({
                  key: group.key,
                  cells: [formatMonth(group.key), formatNumber(group.count)],
                }))}
              />
            </ReportCard>
          </div>
        </>
      )}
    </section>
  );
}

function CoverageSection({
  report,
  retryHref,
}: {
  report: OperationalReport;
  retryHref: string;
}) {
  const section = report.subjectCoverage;
  const cycleLabel =
    report.currentCycle.status === "ready"
      ? report.currentCycle.data?.name ?? "Sin ciclo abierto"
      : "Ciclo no disponible";

  return (
    <ReportCard
      title="Cobertura de materias"
      description={`Estado actual · ${cycleLabel} · filtros de carrera, materia y tutor.`}
    >
      {section.status === "ready" ? (
        <div className="space-y-2">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {formatNumber(section.data.coveredSubjects)} / {formatNumber(section.data.totalSubjects)}
            <span className="ml-2 text-sm font-medium text-foreground-secondary">
              materias cubiertas
            </span>
          </p>
          {section.data.coveragePercent !== null && (
            <p className="text-sm text-foreground-secondary">
              {percentFormatter.format(section.data.coveragePercent)} % del total
            </p>
          )}
        </div>
      ) : section.status === "unavailable" ? (
        <p className="text-sm text-foreground-secondary">
          No hay un ciclo abierto para consultar la cobertura de materias.
        </p>
      ) : (
        <SectionState
          description="La asistencia y las guardias programadas continúan disponibles."
          retryHref={retryHref}
          title="No se pudo cargar la cobertura"
        />
      )}
    </ReportCard>
  );
}

function AttendanceSection({
  section,
  retryHref,
}: {
  section: OperationalReport["attendance"];
  retryHref: string;
}) {
  return (
    <ReportCard
      title="Registro de asistencia"
      description="Período, tutor y modalidad. Cuenta guardias vencidas; el porcentaje indica registro, no presencia."
    >
      {section.status !== "ready" ? (
        <SectionState
          description="Las demás métricas operativas siguen disponibles."
          retryHref={retryHref}
          title="No se pudo cargar la asistencia"
        />
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InlineMetric label="Vencidas" value={section.data.dueOccurrences} />
            <InlineMetric label="Presentes" value={section.data.present} />
            <InlineMetric label="Ausentes" value={section.data.absent} />
            <InlineMetric label="Pendientes" value={section.data.pending} />
          </dl>
          {section.data.registrationRatePercent !== null && (
            <p className="text-sm text-foreground-secondary">
              Registradas: {percentFormatter.format(section.data.registrationRatePercent)} %
            </p>
          )}
        </div>
      )}
    </ReportCard>
  );
}

function InlineMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-surface-subtle p-3">
      <dt className="text-xs text-foreground-secondary">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {formatNumber(value)}
      </dd>
    </div>
  );
}

function PlannedSchedulesSection({
  section,
  retryHref,
}: {
  section: OperationalReport["plannedSchedules"];
  retryHref: string;
}) {
  return (
    <ReportCard
      title="Guardias programadas"
      description="Período, tutor y modalidad. Muestra oferta planificada; no representa una tasa de cobertura."
    >
      {section.status !== "ready" ? (
        <SectionState
          description="Las demás secciones siguen disponibles."
          retryHref={retryHref}
          title="No se pudieron cargar las guardias programadas"
        />
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3">
            <InlineMetric label="Ocurrencias" value={section.data.totalOccurrences} />
            <div className="rounded-sm bg-surface-subtle p-3">
              <dt className="text-xs text-foreground-secondary">Tiempo programado</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {formatMinutes(section.data.totalMinutes)}
              </dd>
            </div>
          </dl>
          <ReportTable
            caption="Guardias programadas por tipo"
            headers={["Tipo", "Ocurrencias", "Duración"]}
            rows={section.data.byKind.map((group) => ({
              key: group.kind,
              cells: [
                group.kind === "DUTY" ? "Ordinarias" : "Recuperatorias",
                formatNumber(group.count),
                formatMinutes(group.minutes),
              ],
            }))}
          />
          <ReportTable
            caption="Guardias programadas por tutor"
            headers={["Tutor", "Ocurrencias", "Duración"]}
            rows={section.data.byTutor.items.map((group) => ({
              key: group.key,
              cells: [group.label, formatNumber(group.count), formatMinutes(group.minutes)],
            }))}
          />
          {section.data.byTutor.truncated && (
            <p className="text-xs text-foreground-muted">
              Se muestran los primeros 50 tutores ordenados por cantidad de guardias.
            </p>
          )}
        </div>
      )}
    </ReportCard>
  );
}

function CoverageAndAttendance({
  report,
  retryHref,
}: {
  report: OperationalReport;
  retryHref: string;
}) {
  return (
    <section aria-labelledby="coverage-heading" className="space-y-4">
      <SectionHeading
        description="La cobertura y los saldos son snapshots del ciclo abierto; la programación y la asistencia corresponden al período."
        id="coverage-heading"
        title="Cobertura y asistencia"
      />
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <CoverageSection report={report} retryHref={retryHref} />
        <AttendanceSection section={report.attendance} retryHref={retryHref} />
        <div className="xl:col-span-2">
          <PlannedSchedulesSection
            retryHref={retryHref}
            section={report.plannedSchedules}
          />
        </div>
      </div>
    </section>
  );
}

function CurrentBalancesSection({
  report,
  retryHref,
}: {
  report: OperationalReport;
  retryHref: string;
}) {
  const section = report.currentBalances;
  const cycleName = section.status === "ready" ? section.data.cycleName : null;

  return (
    <ReportCard
      title="Estado de saldos actual"
      description={`Estado actual por ciclo${cycleName ? ` · ${cycleName}` : ""} · filtros de carrera y tutor.`}
    >
      {section.status === "ready" ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InlineMetric label="Tutores incluidos" value={section.data.totalTutors} />
          <InlineMetric label="Con saldo negativo" value={section.data.owes} />
          <InlineMetric label="Al día" value={section.data.current} />
        </dl>
      ) : section.status === "unavailable" ? (
        <p className="text-sm text-foreground-secondary">
          No hay un ciclo abierto para consultar los saldos actuales.
        </p>
      ) : (
        <SectionState
          description="Los movimientos y actividades del período continúan disponibles."
          retryHref={retryHref}
          title="No se pudieron cargar los saldos actuales"
        />
      )}
    </ReportCard>
  );
}

function MovementsSection({
  section,
  retryHref,
}: {
  section: OperationalReport["movements"];
  retryHref: string;
}) {
  return (
    <ReportCard
      title="Movimientos de horas"
      description="Período y tutor. Los créditos, débitos y reversos se muestran como movimientos propios."
    >
      {section.status !== "ready" ? (
        <SectionState
          description="Las actividades permanecen disponibles."
          retryHref={retryHref}
          title="No se pudieron cargar los movimientos"
        />
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-sm bg-surface-subtle p-3">
              <dt className="text-xs text-foreground-secondary">Créditos</dt>
              <dd className="mt-1 font-semibold tabular-nums text-foreground">
                {formatNumber(section.data.creditCount)} · {formatMinutes(section.data.creditMinutes)}
              </dd>
            </div>
            <div className="rounded-sm bg-surface-subtle p-3">
              <dt className="text-xs text-foreground-secondary">Débitos</dt>
              <dd className="mt-1 font-semibold tabular-nums text-foreground">
                {formatNumber(section.data.debitCount)} · {formatMinutes(section.data.debitMinutes)}
              </dd>
            </div>
            <div className="rounded-sm bg-surface-subtle p-3 sm:col-span-2">
              <dt className="text-xs text-foreground-secondary">Neto (créditos menos débitos)</dt>
              <dd className="mt-1 font-semibold tabular-nums text-foreground">
                {formatMinutes(section.data.netMinutes)}
              </dd>
            </div>
          </dl>
          <ReportTable
            caption="Movimientos por fecha, categoría y dirección"
            headers={["Fecha", "Dirección", "Categoría", "Movimientos", "Minutos"]}
            rows={section.data.groups.items.map((group, index) => ({
              key: `${group.date}-${group.categoryId}-${group.direction}-${index}`,
              cells: [
                <time dateTime={group.date} key="date">{formatDate(group.date)}</time>,
                group.direction === "CREDIT" ? "Crédito" : "Débito",
                group.category,
                formatNumber(group.count),
                formatMinutes(group.minutes),
              ],
            }))}
          />
          {section.data.groups.truncated && (
            <p className="text-xs text-foreground-muted">
              Se muestran los primeros 1.000 grupos ordenados por fecha.
            </p>
          )}
        </div>
      )}
    </ReportCard>
  );
}

function activityKindLabel(kind: ActivityGroup["kind"]) {
  const labels: Record<ActivityGroup["kind"], string> = {
    MEETING: "Reunión",
    WORKSHOP: "Taller",
    EXTRAORDINARY: "Extraordinaria",
    RECOVERY: "Recuperatoria",
  };
  return labels[kind];
}

function ActivitiesSection({
  section,
  retryHref,
}: {
  section: OperationalReport["activities"];
  retryHref: string;
}) {
  return (
    <ReportCard
      title="Actividades"
      description="Período y tutor. Cada actividad se cuenta una vez, aunque tenga varios movimientos asociados."
    >
      {section.status !== "ready" ? (
        <SectionState
          description="El resumen de movimientos y saldos sigue disponible."
          retryHref={retryHref}
          title="No se pudieron cargar las actividades"
        />
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3">
            <InlineMetric label="Actividades" value={section.data.totalActivities} />
            <div className="rounded-sm bg-surface-subtle p-3">
              <dt className="text-xs text-foreground-secondary">Duración registrada</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {formatMinutes(section.data.totalMinutes)}
              </dd>
            </div>
          </dl>
          <ReportTable
            caption="Actividades por fecha y tipo"
            headers={["Fecha", "Tipo", "Actividades", "Duración"]}
            rows={section.data.groups.map((group, index) => ({
              key: `${group.date}-${group.kind}-${index}`,
              cells: [
                <time dateTime={group.date} key="date">{formatDate(group.date)}</time>,
                activityKindLabel(group.kind),
                formatNumber(group.count),
                formatMinutes(group.minutes),
              ],
            }))}
          />
        </div>
      )}
    </ReportCard>
  );
}

function HoursAndActivities({
  report,
  retryHref,
}: {
  report: OperationalReport;
  retryHref: string;
}) {
  return (
    <section aria-labelledby="hours-heading" className="space-y-4">
      <SectionHeading
        description="Saldos del ciclo vigente y movimientos o actividades con fecha dentro del período seleccionado."
        id="hours-heading"
        title="Horas y actividades"
      />
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <CurrentBalancesSection report={report} retryHref={retryHref} />
        <MovementsSection retryHref={retryHref} section={report.movements} />
        <div className="xl:col-span-2">
          <ActivitiesSection retryHref={retryHref} section={report.activities} />
        </div>
      </div>
    </section>
  );
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
    report.attendance.status !== "ready" ||
    report.movements.status !== "ready" ||
    report.activities.status !== "ready"
  ) {
    return false;
  }

  return (
    report.consultationDemand.data.total === 0 &&
    report.plannedSchedules.data.totalOccurrences === 0 &&
    report.attendance.data.dueOccurrences === 0 &&
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
        description="Consultar demanda, cobertura, asistencia y movimientos a partir de registros consolidados."
        title="Reportes"
      />

      <section aria-labelledby="filters-heading">
        <ReportFiltersForm
          filterOptions={filterOptions}
          filterOptionsError={filterOptionsError}
          filters={filters}
          query={query}
        />
      </section>

      {issues.length > 0 && (
        <div
          className="rounded-sm border border-danger/30 bg-danger-surface/50 p-4"
          role="alert"
        >
          <p className="font-semibold text-foreground">
            Revise los filtros seleccionados
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground-secondary">
            {issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      )}

      {loadError && (
        <SectionState
          description="Los valores enviados se mantienen en el formulario. Reintentar la consulta para volver a cargar los reportes."
          retryHref={retryHref}
          title="No se pudieron cargar los reportes"
        />
      )}

      {partial && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-warning/30 bg-warning-surface/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <StatusBadge label="Carga parcial" variant="warning" />
            <p className="text-sm text-foreground-secondary">
              Una o más secciones no están disponibles; el resto conserva sus resultados.
            </p>
          </div>
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={retryHref}>
            Reintentar todas
          </Link>
        </div>
      )}

      {report !== null && (
        <>
          <section aria-labelledby="summary-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2
                  className="text-xl font-bold tracking-tight text-foreground"
                  id="summary-heading"
                >
                  Resumen
                </h2>
                <p className="mt-1 text-sm text-foreground-secondary">
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
                detail="Estado actual; filtros de carrera y tutor"
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
            />
          )}

          <DemandSection retryHref={retryHref} section={report.consultationDemand} />
          <CoverageAndAttendance report={report} retryHref={retryHref} />
          <HoursAndActivities report={report} retryHref={retryHref} />
        </>
      )}
    </div>
  );
}
