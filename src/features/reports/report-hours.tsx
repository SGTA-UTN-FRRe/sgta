import type { OperationalReport } from "./report-types";
import { ReportCard, ReportTable, SectionHeading, SectionState, InlineMetric, CycleRequiredState } from "./report-components";
import { formatDate, formatNumber } from "./report-presentation";
import { formatDuration } from "@/shared/format-duration";

import type { ActivityGroup } from "./report-types";

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
      description={`Estado actual del ciclo${cycleName ? ` · ${cycleName}` : ""}; los filtros de carrera y tutor se aplican a estos saldos.`}
    >
      {section.status === "ready" ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InlineMetric label="Tutores incluidos" value={section.data.totalTutors} />
          <InlineMetric label="Con saldo negativo" value={section.data.owes} />
          <InlineMetric label="Al día" value={section.data.current} />
        </dl>
      ) : section.status === "unavailable" ? (
        <CycleRequiredState title="No hay un ciclo abierto para consultar los saldos actuales." />
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
            <div className="rounded-sm bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Créditos</dt>
              <dd className="mt-1 font-semibold tabular-nums text-foreground">
                {formatNumber(section.data.creditCount)} · {formatDuration(section.data.creditMinutes)}
              </dd>
            </div>
            <div className="rounded-sm bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Débitos</dt>
              <dd className="mt-1 font-semibold tabular-nums text-foreground">
                {formatNumber(section.data.debitCount)} · {formatDuration(section.data.debitMinutes)}
              </dd>
            </div>
            <div className="rounded-sm bg-muted p-3 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Neto (créditos menos débitos)</dt>
              <dd className="mt-1 font-semibold tabular-nums text-foreground">
                {formatDuration(section.data.netMinutes, { signed: true })}
              </dd>
            </div>
          </dl>
          <ReportTable
            caption="Movimientos por fecha, categoría y dirección"
            emptyLabel="Sin movimientos en el período."
            headers={["Fecha", "Dirección", "Categoría", "Movimientos", "Duración"]}
            rows={section.data.groups.items.map((group, index) => ({
              key: `${group.date}-${group.categoryId}-${group.direction}-${index}`,
              cells: [
                <time dateTime={group.date} key="date">{formatDate(group.date)}</time>,
                group.direction === "CREDIT" ? "Crédito" : "Débito",
                group.category,
                formatNumber(group.count),
                formatDuration(group.minutes),
              ],
            }))}
          />
          {section.data.groups.truncated && (
            <p className="text-xs text-muted-foreground">
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
            <div className="rounded-sm bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Duración registrada</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {formatDuration(section.data.totalMinutes)}
              </dd>
            </div>
          </dl>
          <ReportTable
            caption="Actividades por fecha y tipo"
            emptyLabel="Sin actividades en el período."
            headers={["Fecha", "Tipo", "Actividades", "Duración"]}
            rows={section.data.groups.map((group, index) => ({
              key: `${group.date}-${group.kind}-${index}`,
              cells: [
                <time dateTime={group.date} key="date">{formatDate(group.date)}</time>,
                activityKindLabel(group.kind),
                formatNumber(group.count),
                formatDuration(group.minutes),
              ],
            }))}
          />
        </div>
      )}
    </ReportCard>
  );
}

export function HoursAndActivities({
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
