import { TutorProfileLink } from "@/features/tutors/tutor-profile-link";
import { SystemState } from "@/shared/components/system-state";
import type { ConsultationDemandReport, LimitedReportGroups, ReportGroup, ReportSection } from "./report-types";
import { ReportCard, ReportTable, SectionHeading, SectionState } from "./report-components";
import { formatMonth, formatNumber } from "./report-presentation";

function GroupTable<T extends ReportGroup<string | null>>({
  title,
  groups,
  tutorLinks = false,
}: {
  title: string;
  groups: LimitedReportGroups<T>;
  tutorLinks?: boolean;
}) {
  return (
    <div className="space-y-2">
      <ReportTable
        caption={title}
        emptyLabel="No hay datos para los filtros seleccionados."
        headers={[title, "Consultas"]}
        rows={groups.items.map((group, index) => ({
          key: group.key ?? `${title}-${index}`,
          cells: [
            tutorLinks && group.key !== null
              ? <TutorProfileLink key="tutor" name={group.label} />
              : group.label,
            formatNumber(group.count),
          ],
        }))}
      />
      {groups.truncated && (
        <p className="text-xs text-muted-foreground">
          Se muestran los primeros 50 resultados ordenados por cantidad.
        </p>
      )}
    </div>
  );
}

export function DemandSection({
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
      ) : section.data.total === 0 ? (
        <SystemState variant="empty" title="No hay datos para los filtros seleccionados." />
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
              <GroupTable groups={section.data.byTutor} title="Tutor" tutorLinks />
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
