import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { SafeSubjectCoverage, SafeSubjectCoverageTutor } from "@/features/tutors/tutor-service";
import { CareerBadge } from "@/shared/components/career-badge";
import { DataTable } from "@/shared/components/data-table";
import { StatusBadge } from "@/shared/components/status-badge";

function tutorStatusLabel(status: SafeSubjectCoverageTutor["status"]) {
  return status === "ACTIVE" ? "Activo" : "Inactivo";
}

function tutorStatusVariant(status: SafeSubjectCoverageTutor["status"]) {
  return status === "ACTIVE" ? ("success" as const) : ("neutral" as const);
}

function subjectStatusLabel(status: SafeSubjectCoverage["subject"]["status"]) {
  return status === "ACTIVE" ? "Activa" : "Inactiva";
}

function tutorCountLabel(count: number) {
  return `${count} ${count === 1 ? "tutor" : "tutores"}`;
}

function activeTutorCount(tutors: SafeSubjectCoverageTutor[]) {
  return tutors.filter((tutor) => tutor.status === "ACTIVE").length;
}

function activeCoverageLabel(tutors: SafeSubjectCoverageTutor[]) {
  const count = activeTutorCount(tutors);

  return count === 0 ? "Sin cobertura activa" : `${tutorCountLabel(count)} activos`;
}

function TutorLink({ tutor }: { tutor: SafeSubjectCoverageTutor }) {
  const href = `/admin/tutors?search=${encodeURIComponent(tutor.formalName)}`;

  return (
    <li className="flex min-w-0 flex-wrap items-center gap-2">
      <Link
        aria-label={`Ver tutor ${tutor.formalName}`}
        className="min-w-0 truncate font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        href={href}
      >
        {tutor.formalName}
      </Link>
      <StatusBadge
        label={tutorStatusLabel(tutor.status)}
        variant={tutorStatusVariant(tutor.status)}
      />
      {tutor.status === "INACTIVE" && (
        <span className="text-xs text-muted-foreground">Relación histórica</span>
      )}
    </li>
  );
}

function CoverageTutorList({ tutors }: { tutors: SafeSubjectCoverageTutor[] }) {
  if (tutors.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin tutor asignado.</p>;
  }

  return (
    <ul aria-label="Tutores asociados" className="space-y-2">
      {tutors.map((tutor) => (
        <TutorLink key={tutor.id} tutor={tutor} />
      ))}
    </ul>
  );
}

function CoverageTutorDetails({ tutors }: { tutors: SafeSubjectCoverageTutor[] }) {
  const activeCount = activeTutorCount(tutors);
  const historicalCount = tutors.length - activeCount;

  return (
    <details className="group rounded-sm border border-border p-2" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="font-medium">
          {activeCoverageLabel(tutors)}
          {historicalCount > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              + {historicalCount} histórico{historicalCount === 1 ? "" : "s"}
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-3 border-t border-border pt-3">
        <CoverageTutorList tutors={tutors} />
      </div>
    </details>
  );
}

function SubjectLabel({ coverage }: { coverage: SafeSubjectCoverage }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{coverage.subject.name}</p>
      <StatusBadge
        className="mt-2"
        label={subjectStatusLabel(coverage.subject.status)}
        variant={coverage.subject.status === "ACTIVE" ? "success" : "neutral"}
      />
    </div>
  );
}

function SubjectIdentity({
  coverage,
  currentCycleName,
}: {
  coverage: SafeSubjectCoverage;
  currentCycleName: string;
}) {
  return (
    <>
      <div className="hidden md:block">
        <SubjectLabel coverage={coverage} />
      </div>
      <details className="group rounded-md border border-border p-3 md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 space-y-2">
            <span className="block truncate font-semibold">{coverage.subject.name}</span>
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={subjectStatusLabel(coverage.subject.status)}
                variant={coverage.subject.status === "ACTIVE" ? "success" : "neutral"}
              />
              <CareerBadge
                color={coverage.career.color}
                name={coverage.career.name}
                size="sm"
              />
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-right text-xs font-normal text-muted-foreground">
            {activeCoverageLabel(coverage.tutors)}
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>
        <div className="mt-3 space-y-4 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Ciclo vigente</span>
            <span className="font-medium text-foreground">{currentCycleName}</span>
          </div>
          <CoverageTutorList tutors={coverage.tutors} />
        </div>
      </details>
    </>
  );
}

export function SubjectCoverageTable({
  currentCycleName,
  loading = false,
  subjects,
}: {
  currentCycleName: string;
  loading?: boolean;
  subjects: SafeSubjectCoverage[];
}) {
  return (
    <div className="mt-4 rounded-xl bg-card p-3 shadow-xs md:p-4">
      <DataTable
        columns={[
          {
            id: "career",
            header: "Carrera",
            cell: (coverage) => (
              <CareerBadge color={coverage.career.color} name={coverage.career.name} />
            ),
            compactClassName: "hidden",
          },
          {
            id: "tutors",
            header: "Tutores",
            cell: (coverage) => <CoverageTutorList tutors={coverage.tutors} />,
            className: "lg:hidden",
            compactClassName: "hidden",
          },
          {
            id: "active-coverage",
            header: "Cobertura activa",
            cell: (coverage) => <CoverageTutorDetails tutors={coverage.tutors} />,
            className: "hidden lg:table-cell",
            compactClassName: "hidden",
          },
          {
            id: "cycle",
            header: "Ciclo vigente",
            cell: () => <span className="whitespace-nowrap text-muted-foreground">{currentCycleName}</span>,
            className: "hidden lg:table-cell",
            compactClassName: "hidden",
          },
          {
            id: "navigation",
            header: "Navegación",
            cell: () => (
              <Link
                className="text-sm font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
                href="/admin/tutors"
              >
                Ver tutores
              </Link>
            ),
            className: "hidden lg:table-cell",
            compactClassName: "hidden",
          },
        ]}
        getRowKey={(coverage) => coverage.subject.id}
        identityColumn={{
          id: "subject",
          header: "Materia",
          cell: (coverage) => (
            <SubjectIdentity coverage={coverage} currentCycleName={currentCycleName} />
          ),
        }}
        label="Cobertura de materias"
        loading={loading}
        loadingLabel="Cargando cobertura de materias"
        rows={subjects}
      />
    </div>
  );
}
