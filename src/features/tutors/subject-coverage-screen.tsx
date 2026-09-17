import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SafeSubjectCoverageResult } from "@/features/tutors/tutor-service";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";

export interface SubjectCoverageScreenProps {
  data: SafeSubjectCoverageResult;
}

export function SubjectCoverageScreen({ data }: SubjectCoverageScreenProps) {
  if (data.currentCycle === null) {
    return (
      <div data-slot="subject-coverage-screen" data-state="required-action">
        <PageHeader
          action={
            <Link
              className="inline-flex h-9 items-center justify-center rounded-sm border border-border bg-surface px-3 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
              href="/admin/settings"
            >
              Configurar ciclo
            </Link>
          }
          breadcrumbs={[{ href: "/admin/tutors", label: "Tutores" }, { label: "Materias" }]}
          description="Consultar la cobertura derivada del catálogo académico."
          title="Materias"
        />
        <div className="mt-6 rounded-md border border-warning/30 bg-warning-surface/60 p-4 text-sm text-foreground-secondary">
          Es necesario contar con un ciclo abierto para consultar la cobertura
          vigente.
        </div>
      </div>
    );
  }

  return (
    <div data-slot="subject-coverage-screen" data-state="default">
      <PageHeader
        breadcrumbs={[{ href: "/admin/tutors", label: "Tutores" }, { label: "Materias" }]}
        description={`Cobertura derivada para ${data.currentCycle.name}.`}
        title="Materias"
      />

      <div className="mt-6">
        {data.subjects.length === 0 ? (
          <EmptyState
            description="Las materias con tutores activos aparecerán aquí cuando existan asignaciones vigentes."
            title="Todavía no hay cobertura"
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <Table className="min-w-[44rem]">
              <caption className="sr-only">Cobertura de materias</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Materia</TableHead>
                  <TableHead scope="col">Carrera</TableHead>
                  <TableHead scope="col">Tutor o tutores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.subjects.map((coverage) => (
                  <TableRow key={coverage.subject.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {coverage.subject.name}
                        </span>
                        <StatusBadge
                          label={coverage.subject.status === "ACTIVE" ? "Activa" : "Inactiva"}
                          variant={coverage.subject.status === "ACTIVE" ? "success" : "neutral"}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground-secondary">
                      {coverage.career.name}
                    </TableCell>
                    <TableCell>
                      <ul className="space-y-1">
                        {coverage.tutors.map((tutor) => (
                          <li key={tutor.id} className="flex items-center gap-2">
                            <span className="text-foreground">{tutor.formalName}</span>
                            <StatusBadge
                              label={tutor.status === "ACTIVE" ? "Activo" : "Inactivo"}
                              variant={tutor.status === "ACTIVE" ? "success" : "neutral"}
                            />
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
