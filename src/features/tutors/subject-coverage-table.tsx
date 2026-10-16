import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { SafeSubjectCoverage, SafeSubjectCoverageTutor } from "@/features/tutors/tutor-service";
import { CareerBadge } from "@/shared/components/career-badge";
import { DataTable } from "@/shared/components/data-table";
import { StatusBadge } from "@/shared/components/status-badge";

function activeTutorCount(tutors: SafeSubjectCoverageTutor[]) {
  return tutors.filter((tutor) => tutor.status === "ACTIVE").length;
}

function activeCoverageLabel(tutors: SafeSubjectCoverageTutor[]) {
  const count = activeTutorCount(tutors);

  if (count === 0) {
    return "Sin cobertura activa";
  }

  return count === 1 ? "1 tutor activo" : `${count} tutores activos`;
}

function CoverageSummary({ tutors }: { tutors: SafeSubjectCoverageTutor[] }) {
  const historicalCount = tutors.length - activeTutorCount(tutors);

  return (
    <span className="font-medium">
      {activeCoverageLabel(tutors)}
      {historicalCount > 0 && (
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          + {historicalCount} histórico{historicalCount === 1 ? "" : "s"}
        </span>
      )}
    </span>
  );
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
      {tutor.status === "INACTIVE" && (
        <>
          <StatusBadge label="Inactivo" variant="neutral" />
          <span className="text-xs text-muted-foreground">Relación histórica</span>
        </>
      )}
    </li>
  );
}

function CoverageTutorList({ tutors }: { tutors: SafeSubjectCoverageTutor[] }) {
  if (tutors.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin tutor asignado.</p>;
  }

  return (
    <ul aria-label="Tutores asociados" className="space-y-2 text-sm">
      {tutors.map((tutor) => (
        <TutorLink key={tutor.id} tutor={tutor} />
      ))}
    </ul>
  );
}

function CoverageTutorDetails({ tutors }: { tutors: SafeSubjectCoverageTutor[] }) {
  return (
    <details className="group py-3" open>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <CoverageSummary tutors={tutors} />
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-1 border-t border-border pt-3">
        <CoverageTutorList tutors={tutors} />
      </div>
    </details>
  );
}

function SubjectStatus({ status }: { status: SafeSubjectCoverage["subject"]["status"] }) {
  return status === "INACTIVE" ? <StatusBadge label="Inactiva" variant="neutral" /> : null;
}

function CareerName({ career }: { career: SafeSubjectCoverage["career"] }) {
  return (
    <span className="flex min-w-0 items-center gap-2 py-3">
      <span aria-hidden="true" className="shrink-0">
        <CareerBadge color={career.color} name={career.name} size="sm" />
      </span>
      <span className="text-muted-foreground">{career.name}</span>
    </span>
  );
}

function SubjectIdentity({ coverage }: { coverage: SafeSubjectCoverage }) {
  return (
    <>
      <div className="hidden min-w-0 space-y-2 py-3 md:block">
        <p className="font-semibold text-foreground">{coverage.subject.name}</p>
        <SubjectStatus status={coverage.subject.status} />
      </div>
      <details className="group md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 rounded-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 space-y-2">
            <span className="block font-semibold">{coverage.subject.name}</span>
            <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-muted-foreground">
              <CareerBadge color={coverage.career.color} name={coverage.career.name} size="sm" />
              <SubjectStatus status={coverage.subject.status} />
              <CoverageSummary tutors={coverage.tutors} />
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="mt-3 space-y-3 border-t border-border pt-3 font-normal">
          <p className="text-sm text-muted-foreground">{coverage.career.name}</p>
          <CoverageTutorList tutors={coverage.tutors} />
        </div>
      </details>
    </>
  );
}

export function SubjectCoverageTable({
  loading = false,
  subjects,
}: {
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
            cell: (coverage) => <CareerName career={coverage.career} />,
            compactClassName: "hidden",
          },
          {
            id: "tutors",
            header: "Tutores",
            cell: (coverage) => (
              <div className="py-3">
                <CoverageTutorList tutors={coverage.tutors} />
              </div>
            ),
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
        ]}
        getRowKey={(coverage) => coverage.subject.id}
        identityColumn={{
          id: "subject",
          header: "Materia",
          cell: (coverage) => <SubjectIdentity coverage={coverage} />,
        }}
        label="Cobertura de materias"
        loading={loading}
        loadingLabel="Cargando cobertura de materias"
        rows={subjects}
      />
    </div>
  );
}
