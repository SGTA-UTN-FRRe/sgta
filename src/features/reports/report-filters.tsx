"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FilterBar, type SelectFilter, type DateFilter } from "@/shared/components/filter-bar";
import { SystemState } from "@/shared/components/system-state";
import type { ReportFilters } from "./report-types";
import type { ReportFilterOptions } from "./report-service";
import { firstQueryValue, isRealDate, type SearchQuery } from "./report-presentation";

const filterNames = ["fromDate", "toDate", "careerId", "subjectId", "tutorId", "modality"] as const;
type FilterName = typeof filterNames[number];

export function ReportFiltersForm({ filters, filterOptions, query, filterOptionsError }: {
  filters: Partial<ReportFilters>;
  filterOptions: ReportFilterOptions | null;
  query: SearchQuery;
  filterOptionsError: boolean;
}) {
  const [draft, setDraft] = useState(() => Object.fromEntries(filterNames.map((name) =>
    [name, filters[name] ?? firstQueryValue(query[name]) ?? ""],
  )) as Record<FilterName, string>);
  const update = (name: FilterName) => (value: string) => setDraft((current) => ({ ...current, [name]: value }));
  const date = (id: "fromDate" | "toDate", label: string): DateFilter => ({
    id, label, type: "date", value: draft[id], onChange: update(id),
    inputType: draft[id] === "" || isRealDate(draft[id]) ? "date" : "text",
  });
  const select = (id: FilterName, label: string, emptyLabel: string, options: { id: string; label: string }[]): SelectFilter => ({
    id, label, value: draft[id], onChange: update(id),
    options: [
      { value: "", label: emptyLabel },
      ...(draft[id] && !options.some((option) => option.id === draft[id])
        ? [{ value: draft[id], label: "Selección actual" }] : []),
      ...options.map((option) => ({ value: option.id, label: option.label })),
    ],
  });

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4"><h2 className="font-display text-xl font-bold" id="filters-heading">Filtros</h2></CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        {filterOptionsError && <SystemState variant="degraded"
          title="No se pudieron cargar todas las opciones de filtro."
          description="Los resultados disponibles siguen visibles." />}
        <form id="report-filters" action="/admin/reports" method="get" className="space-y-4">
          {/* One successful control per parameter, including controls edited in the portaled sheet. */}
          {filterNames.map((name) => <Input key={name} type="hidden" name={name} value={draft[name]} />)}
          <FilterBar
            filters={[
              date("fromDate", "Desde"), date("toDate", "Hasta"),
              select("careerId", "Carrera", "Todas las carreras", filterOptions?.careers ?? []),
              select("subjectId", "Materia", "Todas las materias", filterOptions?.subjects ?? []),
              select("tutorId", "Tutor", "Todos los tutores", filterOptions?.tutors ?? []),
              select("modality", "Modalidad", "Todas las modalidades", [
                { id: "UNSPECIFIED", label: "Sin especificar" },
                ...(filterOptions?.modalities ?? []).map((value) => ({ id: value, label: value })),
              ]),
            ]}
            hasActiveFilters={false}
            onClear={() => {}}
            sheetAction={<Button type="submit" form="report-filters">Aplicar filtros</Button>}
          />
          <p className="text-xs text-muted-foreground">
            El período incluye ambas fechas y admite hasta 366 días. Una materia elegida debe pertenecer a la carrera seleccionada.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">Aplicar filtros</Button>
            <Link className={buttonVariants({ variant: "outline" })} href="/admin/reports">Restablecer filtros</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
