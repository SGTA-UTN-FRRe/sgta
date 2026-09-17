"use client";

import Link from "next/link";
import {
  ChevronDown,
  CircleAlert,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  SafeSubjectCoverage,
  SafeSubjectCoverageResult,
  SafeSubjectCoverageTutor,
} from "@/features/tutors/tutor-service";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

export type SubjectCoverageScreenState =
  | "default"
  | "loading"
  | "empty"
  | "search-empty"
  | "error"
  | "required-action";

export interface SubjectCoverageScreenProps {
  data: SafeSubjectCoverageResult;
  errorMessage?: string;
  state?: SubjectCoverageScreenState;
}

const searchInputId = "subject-coverage-search";
const searchPlaceholder = "Buscar materia, carrera o tutor";
const defaultErrorMessage =
  "No se pudo cargar la cobertura. Reintentar para volver a consultar las materias.";

function readInitialSearch() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("search") ?? "";
}

async function fetchCoverage() {
  let response: Response;

  try {
    response = await fetch("/api/admin/tutors/subjects", {
      headers: { accept: "application/json" },
    });
  } catch {
    throw new Error(defaultErrorMessage);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(defaultErrorMessage);
  }

  if (typeof body !== "object" || body === null || !("coverage" in body)) {
    throw new Error(defaultErrorMessage);
  }

  const coverage = (body as { coverage?: unknown }).coverage;

  if (typeof coverage !== "object" || coverage === null) {
    throw new Error(defaultErrorMessage);
  }

  return coverage as SafeSubjectCoverageResult;
}

function subjectMatchesSearch(coverage: SafeSubjectCoverage, search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase();

  if (normalizedSearch === "") {
    return true;
  }

  const fields = [
    coverage.subject.name,
    coverage.career.name,
    ...coverage.tutors.flatMap((tutor) => [
      tutor.formalName,
      tutor.firstName,
      tutor.lastName,
      tutor.preferredDisplayName,
      tutor.institutionalIdentifier,
    ]),
  ];

  return fields.some((field) =>
    field?.toLocaleLowerCase().includes(normalizedSearch),
  );
}

function getDerivedState(
  screenState: SubjectCoverageScreenState,
  data: SafeSubjectCoverageResult,
  subjects: SafeSubjectCoverage[],
) {
  if (screenState !== "default") {
    return screenState;
  }

  if (data.currentCycle === null) {
    return "required-action" as const;
  }

  if (data.subjects.length === 0) {
    return "empty" as const;
  }

  return subjects.length === 0 ? ("search-empty" as const) : ("default" as const);
}

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
        <span className="text-xs text-foreground-muted">Relación histórica</span>
      )}
    </li>
  );
}

function CoverageTutorList({ tutors }: { tutors: SafeSubjectCoverageTutor[] }) {
  if (tutors.length === 0) {
    return <p className="text-sm text-foreground-secondary">Sin tutor asignado.</p>;
  }

  return (
    <ul aria-label="Tutores asociados" className="space-y-2">
      {tutors.map((tutor) => (
        <TutorLink key={tutor.id} tutor={tutor} />
      ))}
    </ul>
  );
}

function CoverageTutorDetails({
  tutors,
  wide = false,
}: {
  tutors: SafeSubjectCoverageTutor[];
  wide?: boolean;
}) {
  const activeCount = activeTutorCount(tutors);
  const historicalCount = tutors.length - activeCount;

  return (
    <details className={cn("group", wide && "rounded-sm border border-border-subtle p-2")} open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="font-medium">
          {activeCoverageLabel(tutors)}
          {historicalCount > 0 && (
            <span className="ml-2 text-xs font-normal text-foreground-muted">
            + {historicalCount} histórico{historicalCount === 1 ? "" : "s"}
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-foreground-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-3 border-t border-border-subtle pt-3">
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

function CoverageCompactList({
  currentCycleName,
  subjects,
}: {
  currentCycleName: string;
  subjects: SafeSubjectCoverage[];
}) {
  return (
    <div className="mt-4 md:hidden">
      <ul aria-label="Cobertura de materias" className="space-y-3">
        {subjects.map((coverage) => (
          <li key={coverage.subject.id}>
            <details className="group rounded-md border border-border bg-surface shadow-xs">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{coverage.subject.name}</p>
                  <p className="mt-1 truncate text-sm text-foreground-secondary">
                    {coverage.career.name}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2 text-right text-xs text-foreground-secondary">
                  {activeCoverageLabel(coverage.tutors)}
                  <ChevronDown
                    aria-hidden="true"
                    className="h-4 w-4 text-foreground-muted transition-transform group-open:rotate-180"
                  />
                </span>
              </summary>
              <div className="space-y-4 border-t border-border-subtle px-4 py-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground-secondary">Ciclo vigente</span>
                  <span className="font-medium text-foreground">{currentCycleName}</span>
                </div>
                <CoverageTutorList tutors={coverage.tutors} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CoverageMediumTable({
  currentCycleName,
  subjects,
}: {
  currentCycleName: string;
  subjects: SafeSubjectCoverage[];
}) {
  return (
    <div className="mt-4 hidden overflow-x-auto rounded-md border border-border bg-surface md:block lg:hidden">
      <Table className="min-w-[46rem]">
        <caption className="sr-only">Cobertura de materias</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Materia</TableHead>
            <TableHead scope="col">Carrera</TableHead>
            <TableHead scope="col">Tutores</TableHead>
            <TableHead scope="col">Ciclo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((coverage) => (
            <TableRow key={coverage.subject.id}>
              <TableCell><SubjectLabel coverage={coverage} /></TableCell>
              <TableCell className="text-foreground-secondary">{coverage.career.name}</TableCell>
              <TableCell><CoverageTutorList tutors={coverage.tutors} /></TableCell>
              <TableCell className="whitespace-nowrap text-foreground-secondary">
                {currentCycleName}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CoverageWideTable({
  currentCycleName,
  subjects,
}: {
  currentCycleName: string;
  subjects: SafeSubjectCoverage[];
}) {
  return (
    <div className="mt-4 hidden overflow-x-auto rounded-md border border-border bg-surface lg:block">
      <Table className="min-w-[64rem]">
        <caption className="sr-only">Comparación de cobertura de materias</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Materia</TableHead>
            <TableHead scope="col">Carrera</TableHead>
            <TableHead scope="col">Cobertura activa</TableHead>
            <TableHead scope="col">Ciclo vigente</TableHead>
            <TableHead scope="col">Navegación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((coverage) => (
            <TableRow key={coverage.subject.id}>
              <TableCell><SubjectLabel coverage={coverage} /></TableCell>
              <TableCell className="text-foreground-secondary">{coverage.career.name}</TableCell>
              <TableCell><CoverageTutorDetails tutors={coverage.tutors} wide /></TableCell>
              <TableCell className="whitespace-nowrap text-foreground-secondary">
                {currentCycleName}
              </TableCell>
              <TableCell>
                <Link
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
                  href="/admin/tutors"
                >
                  Ver tutores
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CoverageLoadingState() {
  return (
    <div
      aria-label="Cargando cobertura de materias"
      aria-live="polite"
      className="mt-4 overflow-hidden rounded-md border border-border bg-surface"
      role="status"
    >
      <span className="sr-only">Cargando cobertura de materias</span>
      <div className="hidden lg:block">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="grid grid-cols-[1.2fr_1.2fr_2fr_1fr_1fr] gap-4 border-b border-border-subtle px-3 py-5 last:border-b-0"
            key={index}
          >
            <span className="h-5 w-32 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-5 w-40 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-5 w-48 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-5 w-24 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-5 w-24 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="rounded-md border border-border-subtle p-4" key={index}>
            <div className="h-5 w-40 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-2 h-4 w-52 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-5 h-12 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CoverageContext({ cycleName }: { cycleName: string }) {
  return (
    <div className="mt-6 grid gap-3 rounded-md border border-border-subtle bg-surface-subtle/60 p-4 text-sm md:grid-cols-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
          Ciclo vigente
        </p>
        <p className="mt-1 font-semibold text-foreground">{cycleName}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
          Criterio de cobertura
        </p>
        <p className="mt-1 text-foreground-secondary">
          Solo tutores activos con asignación en el ciclo vigente.
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
          Horas planificadas
        </p>
        <p className="mt-1 text-foreground-secondary">
          No disponibles en esta vista hasta contar con datos de horarios.
        </p>
      </div>
    </div>
  );
}

function StateNotice({
  action,
  children,
  title,
  tone,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
  tone: "danger" | "warning";
}) {
  const styles = {
    danger: "border-danger/30 bg-danger-surface/60",
    warning: "border-warning/30 bg-warning-surface/60",
  } as const;
  const iconStyles = {
    danger: "text-danger",
    warning: "text-warning",
  } as const;

  return (
    <div
      aria-live="polite"
      className={cn("mt-6 flex items-start gap-3 rounded-md border p-4", styles[tone])}
      role={tone === "danger" ? "alert" : "status"}
    >
      <CircleAlert aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", iconStyles[tone])} />
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-foreground-secondary">{children}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function SubjectCoverageScreen({
  data,
  errorMessage: initialErrorMessage,
  state,
}: SubjectCoverageScreenProps) {
  const [coverage, setCoverage] = useState(data);
  const [screenState, setScreenState] = useState<SubjectCoverageScreenState>(() =>
    state ?? (data.currentCycle === null ? "required-action" : "default"),
  );
  const [loadError, setLoadError] = useState<string | null>(initialErrorMessage ?? null);
  const [search, setSearch] = useState(readInitialSearch);

  const filteredSubjects = useMemo(
    () => coverage.subjects.filter((subject) => subjectMatchesSearch(subject, search)),
    [coverage.subjects, search],
  );
  const derivedState = getDerivedState(screenState, coverage, filteredSubjects);

  useEffect(() => {
    const url = new URL(window.location.href);

    if (search.trim() === "") {
      url.searchParams.delete("search");
    } else {
      url.searchParams.set("search", search.trim());
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [search]);

  const refreshCoverage = useCallback(async () => {
    setScreenState("loading");
    setLoadError(null);

    try {
      const nextCoverage = await fetchCoverage();
      setCoverage(nextCoverage);
      setScreenState(nextCoverage.currentCycle === null ? "required-action" : "default");
    } catch {
      setLoadError(defaultErrorMessage);
      setScreenState("error");
    }
  }, []);

  const clearSearch = useCallback(() => setSearch(""), []);
  const headerAction =
    derivedState === "required-action" ? (
      <Link
        className={buttonVariants({ size: "sm", variant: "outline" })}
        href="/admin/settings"
      >
        Configurar ciclo
      </Link>
    ) : derivedState === "error" ? (
      <Button onClick={() => void refreshCoverage()} size="sm" type="button" variant="outline">
        Reintentar
      </Button>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          className={buttonVariants({ size: "sm", variant: "outline" })}
          href="/admin/tutors"
        >
          Ver tutores
        </Link>
        <Button
          disabled={derivedState === "loading"}
          onClick={() => void refreshCoverage()}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw aria-hidden="true" className={cn(derivedState === "loading" && "animate-spin")} />
          Actualizar
        </Button>
      </div>
    );

  return (
    <div data-slot="subject-coverage-screen" data-state={derivedState}>
      <PageHeader
        action={headerAction}
        breadcrumbs={[{ href: "/admin/tutors", label: "Tutores" }, { label: "Materias" }]}
        description="Consultar la cobertura derivada del catálogo académico."
        title="Materias"
      />

      {derivedState === "error" && (
        <StateNotice
          action={
            <Button onClick={() => void refreshCoverage()} size="sm" type="button" variant="outline">
              Reintentar
            </Button>
          }
          title="No se pudo cargar la cobertura"
          tone="danger"
        >
          {loadError ?? defaultErrorMessage}
        </StateNotice>
      )}

      {derivedState === "required-action" && (
        <StateNotice
          action={
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href="/admin/settings"
            >
              Configurar ciclo
            </Link>
          }
          title="Abrir un ciclo para consultar la cobertura"
          tone="warning"
        >
          Es necesario contar con un ciclo abierto para consultar la cobertura vigente.
        </StateNotice>
      )}

      {derivedState !== "error" && derivedState !== "required-action" && (
        <>
          <div className="mt-6 rounded-md border border-border-subtle bg-surface-subtle/60 p-4">
            <label
              className="text-xs font-semibold text-foreground-secondary"
              htmlFor={searchInputId}
            >
              Buscar cobertura
            </label>
            <div className="relative mt-1.5 max-w-2xl">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
              />
              <Input
                aria-label={searchPlaceholder}
                className="pl-9"
                disabled={derivedState === "loading"}
                id={searchInputId}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                type="search"
                value={search}
              />
            </div>
          </div>

          {derivedState === "loading" && <CoverageLoadingState />}

          {derivedState === "empty" && (
            <div className="mt-4">
              <EmptyState
                action={
                  <Link
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                    href="/admin/tutors"
                  >
                    Gestionar tutores
                  </Link>
                }
                description="Las materias con tutores activos aparecerán aquí cuando existan asignaciones vigentes."
                title="Todavía no hay cobertura"
              />
            </div>
          )}

          {derivedState === "search-empty" && (
            <div className="mt-4">
              <EmptyState
                action={
                  <Button onClick={clearSearch} type="button" variant="outline">
                    Limpiar búsqueda
                  </Button>
                }
                description="Probar con otro término o limpiar la búsqueda para ver toda la cobertura."
                title="No encontramos cobertura"
              />
            </div>
          )}

          {derivedState !== "loading" && derivedState !== "empty" && derivedState !== "search-empty" && coverage.currentCycle !== null && (
            <>
              <CoverageContext cycleName={coverage.currentCycle.name} />
              <p aria-live="polite" className="mt-4 text-sm text-foreground-secondary">
                Mostrando {filteredSubjects.length} {filteredSubjects.length === 1 ? "materia" : "materias"} con cobertura.
              </p>
              <CoverageCompactList
                currentCycleName={coverage.currentCycle.name}
                subjects={filteredSubjects}
              />
              <CoverageMediumTable
                currentCycleName={coverage.currentCycle.name}
                subjects={filteredSubjects}
              />
              <CoverageWideTable
                currentCycleName={coverage.currentCycle.name}
                subjects={filteredSubjects}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
