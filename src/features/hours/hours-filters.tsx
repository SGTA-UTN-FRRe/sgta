import { FilterBar } from "@/shared/components/filter-bar";
import type { SafeHourCategory } from "./hour-service";
import type { BalanceFilter } from "./hours-screen-utils";

export function HoursFilters({ categories, category, categoryLabel, disabled, onCategoryChange,
  onClear, onSearchChange, onStatusChange, search, searchPlaceholder, status, statusLabel, resultCount,
}: {
  categories: SafeHourCategory[];
  category: string;
  categoryLabel: string;
  disabled: boolean;
  onCategoryChange: (value: string) => void;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: BalanceFilter) => void;
  search: string;
  searchPlaceholder: string;
  status: BalanceFilter;
  statusLabel: string;
  resultCount: number;
}) {
  return (
    <fieldset className="mt-6 min-w-0" disabled={disabled}>
      <legend className="sr-only">Buscar y filtrar saldos</legend>
      <FilterBar
        search={{ id: "hours-search", label: "Buscar", value: search, placeholder: searchPlaceholder, onChange: onSearchChange }}
        filters={[
          { id: "hours-status", label: statusLabel, value: status === "all" ? "" : status,
            options: [{ value: "", label: "Todos" }, { value: "current", label: "Al día" }, { value: "owes", label: "Debe horas" }],
            onChange: (value) => onStatusChange((value || "all") as BalanceFilter) },
          { id: "hours-category", label: categoryLabel, value: category,
            options: [{ value: "", label: "Todas" }, ...categories.map((entry) => ({ value: entry.id, label: entry.name }))], onChange: onCategoryChange },
        ]}
        resultCount={resultCount}
        hasActiveFilters={Boolean(search || category || status !== "all")}
        onClear={onClear}
      />
    </fieldset>
  );
}
