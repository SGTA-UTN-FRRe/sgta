"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { buttonVariants, Button } from "@/components/ui/button";
import type {
  SafeSubjectCoverage,
  SafeSubjectCoverageResult,
} from "@/features/tutors/tutor-service";
import { EmptyState } from "@/shared/components/empty-state";
import { FilterBar } from "@/shared/components/filter-bar";
import { PageHeader } from "@/shared/components/page-header";
import { SystemState } from "@/shared/components/system-state";
import { SubjectCoverageTable } from "./subject-coverage-table";

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
const defaultErrorMessage = "Reintentar para volver a consultar las materias.";

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

function CoverageContext({ cycleName }: { cycleName: string }) {
  return (
    <div className="mt-6 grid gap-3 rounded-md border border-border bg-muted/60 p-4 text-sm md:grid-cols-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
          Ciclo vigente
        </p>
        <p className="mt-1 font-semibold text-foreground">{cycleName}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
          Criterio de cobertura
        </p>
        <p className="mt-1 text-muted-foreground">
          Solo tutores activos con asignación en el ciclo vigente.
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
          Horas planificadas
        </p>
        <p className="mt-1 text-muted-foreground">
          No disponibles en esta vista hasta contar con datos de horarios.
        </p>
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
  const canRefresh = derivedState !== "error" && derivedState !== "required-action";
  const headerAction = (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        className={buttonVariants({ variant: "outline" })}
        href="/admin/tutors"
      >
        Ver tutores
      </Link>
      {canRefresh && (
        <Button
          disabled={derivedState === "loading"}
          onClick={() => void refreshCoverage()}
          type="button"
          variant="outline"
        >
          <RefreshCw aria-hidden="true" className={derivedState === "loading" ? "animate-spin" : undefined} />
          Actualizar
        </Button>
      )}
    </div>
  );

  return (
    <div data-slot="subject-coverage-screen" data-state={derivedState}>
      <PageHeader
        action={headerAction}
        breadcrumbs={[{ href: "/admin/tutors", label: "Tutores" }, { label: "Materias" }]}
        description="Tutores disponibles por materia."
        title="Materias"
      />

      {derivedState === "error" && (
        <SystemState
          action={
            <Button onClick={() => void refreshCoverage()} size="sm" type="button" variant="outline">
              Reintentar
            </Button>
          }
          description={loadError ?? defaultErrorMessage}
          headingLevel={2}
          title="No se pudo cargar la cobertura"
          variant="error"
        />
      )}

      {derivedState === "required-action" && (
        <SystemState
          action={
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href="/admin/settings"
            >
              Configurar ciclo
            </Link>
          }
          description="Es necesario contar con un ciclo abierto para consultar la cobertura vigente."
          headingLevel={2}
          title="Abrir un ciclo para consultar la cobertura"
          variant="required-action"
        />
      )}

      {canRefresh && (
        <>
          <fieldset className="mt-6 min-w-0" disabled={derivedState === "loading"}>
            <legend className="sr-only">Buscar cobertura</legend>
            <FilterBar
              hasActiveFilters={search.trim().length > 0}
              onClear={clearSearch}
              search={{
                id: searchInputId,
                label: "Buscar materia, carrera o tutor",
                value: search,
                onChange: setSearch,
              }}
            />
          </fieldset>

          {derivedState === "loading" && (
            <SubjectCoverageTable loading subjects={[]} />
          )}

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
                description="Probar con otro término o limpiar la búsqueda para ver toda la cobertura."
                title="No encontramos cobertura"
              />
            </div>
          )}

          {derivedState === "default" && coverage.currentCycle !== null && (
            <>
              <CoverageContext cycleName={coverage.currentCycle.name} />
              <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
                Mostrando {filteredSubjects.length} {filteredSubjects.length === 1 ? "materia" : "materias"} con cobertura.
              </p>
              <SubjectCoverageTable subjects={filteredSubjects} />
            </>
          )}
        </>
      )}
    </div>
  );
}
