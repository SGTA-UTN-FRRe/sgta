import { FilterBar, type SelectFilter, type DateFilter } from "@/shared/components/filter-bar";
import type { ConsultationsScreenProps, ConsultationFilterState } from "./consultations-screen-utils";

export function ConsultationFiltersBar({ careers, tutors, filters, resultCount, onChange, onClear }: {
  careers: ConsultationsScreenProps["careers"];
  tutors: ConsultationsScreenProps["tutors"];
  filters: ConsultationFilterState;
  resultCount: number;
  onChange: (key: keyof ConsultationFilterState, value: string, replace?: boolean) => void;
  onClear: () => void;
}) {
  const select = (key: keyof ConsultationFilterState, label: string, options: SelectFilter["options"]): SelectFilter => ({
    id: `consultations-${key}`, label, options,
    value: String(filters[key] ?? "") === "ALL" ? "" : String(filters[key] ?? ""),
    onChange: (value) => onChange(key, value || (key === "status" || key === "suggestion" ? "ALL" : "")),
  });
  const date = (key: "fromDate" | "toDate", label: string): DateFilter => ({
    id: `consultations-${key}`, type: "date", label, value: filters[key] ?? "",
    onChange: (value) => onChange(key, value),
  });
  const controls = [
    select("status", "Estado", [
      { value: "", label: "Todos" },
      { value: "PENDING_REVIEW", label: "Pendientes de revisión" },
      { value: "READY", label: "Listas para consolidar" },
      { value: "CONSOLIDATED", label: "Consolidadas" },
      { value: "DUPLICATE", label: "Duplicadas" },
    ]),
    select("careerId", "Carrera", [{ value: "", label: "Todas las carreras" }, ...careers.map((career) => ({ value: career.id, label: career.name }))]),
    select("tutorId", "Tutor", [{ value: "", label: "Todos los tutores" }, ...tutors.map((tutor) => ({ value: tutor.id, label: `${tutor.name}${tutor.status === "INACTIVE" ? " · Inactivo" : ""}` }))]),
    date("fromDate", "Desde"), date("toDate", "Hasta"),
    select("classification", "Clasificación", [
      { value: "", label: "Todas" }, { value: "SUBJECT", label: "Materia" },
      { value: "GENERAL", label: "General / Varias" }, { value: "PENDING_CLASSIFICATION", label: "Pendiente de clasificación" },
    ]),
    select("suggestion", "Sugerencia de materia", [
      { value: "", label: "Todas" }, { value: "WITH_SUGGESTION", label: "Con sugerencia" }, { value: "WITHOUT_SUGGESTION", label: "Sin sugerencia" },
    ]),
  ];
  return <section aria-label="Filtros de consultas" className="mt-6">
    <FilterBar search={{ id: "consultations-search", label: "Buscar consultas", value: filters.search ?? "", placeholder: "Estudiante, carrera, tutor o tema", maxLength: 120, onChange: (value) => onChange("search", value, true) }}
      filters={controls} resultCount={resultCount} hasActiveFilters={controls.some((control) => control.value !== "") || Boolean(filters.search)} onClear={onClear} />
  </section>;
}
