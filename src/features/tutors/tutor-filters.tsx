import { FilterBar } from "@/shared/components/filter-bar";
import type { SafeCareer } from "./tutor-service";
import type { FilterStatus } from "./tutor-presentation-types";

export function FilterToolbar({ careerId, careerLabel, careers, onCareerChange, onClear,
  onSearchChange, onStatusChange, search, searchPlaceholder, status, statusLabel, resultCount }: {
  careerId: string;
  careerLabel: string;
  careers: SafeCareer[];
  onCareerChange: (value: string) => void;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: FilterStatus) => void;
  search: string;
  searchPlaceholder: string;
  status: FilterStatus;
  statusLabel: string;
  resultCount: number;
}) {
  return <div className="mt-4 md:mt-6">
    <FilterBar
      search={{ id: "tutor-search", label: "Buscar tutor", value: search, placeholder: searchPlaceholder, onChange: onSearchChange }}
      filters={[
        { id: "tutor-career", label: careerLabel, value: careerId, onChange: onCareerChange,
          options: [{ value: "", label: "Todas las carreras" }, ...careers.map((career) => ({ value: career.id, label: career.name }))] },
        { id: "tutor-status", label: statusLabel, value: status === "all" ? "" : status,
          onChange: (value) => onStatusChange(value === "" ? "all" : value as FilterStatus),
          options: [{ value: "", label: "Todos los estados" }, { value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }] },
      ]}
      resultCount={resultCount}
      hasActiveFilters={Boolean(search.trim() || careerId || status !== "all")}
      onClear={onClear}
    />
  </div>;
}
