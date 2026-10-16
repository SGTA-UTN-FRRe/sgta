import type { OperationalReport } from "./report-types";
import { ReportCard, ReportTable, SectionHeading, SectionState, InlineMetric, CycleRequiredState } from "./report-components";
import { percentFormatter, formatNumber } from "./report-presentation";
import { formatDuration } from "@/shared/format-duration";

import { TutorProfileLink } from "@/features/tutors/tutor-profile-link";

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
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              materias cubiertas
            </span>
          </p>
          {section.data.coveragePercent !== null && (
            <p className="text-sm text-muted-foreground">
              {percentFormatter.format(section.data.coveragePercent)} % del total
            </p>
          )}
        </div>
      ) : section.status === "unavailable" ? (
        <CycleRequiredState title="No hay un ciclo abierto para consultar la cobertura de materias." />
      ) : (
        <SectionState
          description="Las demás métricas operativas siguen disponibles."
          retryHref={retryHref}
          title="No se pudo cargar la cobertura"
        />
      )}
    </ReportCard>
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
            <div className="rounded-sm bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Tiempo programado</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {formatDuration(section.data.totalMinutes)}
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
                formatDuration(group.minutes),
              ],
            }))}
          />
          <ReportTable
            caption="Guardias programadas por tutor"
            headers={["Tutor", "Ocurrencias", "Duración"]}
            rows={section.data.byTutor.items.map((group) => ({
              key: group.key,
              cells: [
                <TutorProfileLink key="tutor" name={group.label} />,
                formatNumber(group.count),
                formatDuration(group.minutes),
              ],
            }))}
          />
          {section.data.byTutor.truncated && (
            <p className="text-xs text-muted-foreground">
              Se muestran los primeros 50 tutores ordenados por cantidad de guardias.
            </p>
          )}
        </div>
      )}
    </ReportCard>
  );
}

export function CoverageAndSchedules({
  report,
  retryHref,
}: {
  report: OperationalReport;
  retryHref: string;
}) {
  return (
    <section aria-labelledby="coverage-heading" className="space-y-4">
      <SectionHeading
        description="La cobertura y los saldos muestran el estado actual del ciclo abierto; la programación corresponde al período seleccionado."
        id="coverage-heading"
        title="Cobertura"
      />
      <div className="grid min-w-0 grid-cols-1 gap-4">
        <CoverageSection report={report} retryHref={retryHref} />
        <PlannedSchedulesSection
          retryHref={retryHref}
          section={report.plannedSchedules}
        />
      </div>
    </section>
  );
}
