import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import type { SafeHourMovement } from "./hour-service";
import { FilterBar, type SelectFilter } from "@/shared/components/filter-bar";
import { activityKindLabels, directionLabels, formatCycleStatus, reversalLabels, type DirectionFilter, type ReversalFilter, type SourceFilter } from "./movement-history-utils";

interface HistoryFiltersProps {
  cycles: SafeAdministrativeCycle[];
  categories: SafeHourMovement["category"][];
  tutors: SafeHourMovement["tutor"][];
  cycleId: string;
  defaultCycleId: string;
  categoryId: string;
  tutorId: string;
  search: string;
  direction: DirectionFilter;
  source: SourceFilter;
  reversal: ReversalFilter;
  resultCount: number;
  hasActiveFilters: boolean;
  disabled: boolean;
  onCycleChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTutorChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onDirectionChange: (value: DirectionFilter) => void;
  onSourceChange: (value: SourceFilter) => void;
  onReversalChange: (value: ReversalFilter) => void;
  onClear: () => void;
}

export function HistoryFilters(props: HistoryFiltersProps) {
  const { cycles, categories, tutors, cycleId, defaultCycleId, categoryId, tutorId, direction, source, reversal } = props;
  const filters: SelectFilter[] = [
    {
      id: "movement-history-cycle", label: "Ciclo", value: cycleId === defaultCycleId ? "" : cycleId,
      options: cycles.length ? cycles.map((cycle) => ({
        value: cycle.id === defaultCycleId ? "" : cycle.id,
        label: `${cycle.name} · ${formatCycleStatus(cycle.status)}`,
      })) : [{ value: "", label: "Sin ciclos disponibles" }],
      onChange: (value) => props.onCycleChange(value || defaultCycleId),
    },
    {
      id: "movement-history-tutor", label: "Tutor", value: tutorId,
      options: [
        { value: "", label: "Todos los tutores" },
        ...(tutorId && !tutors.some((tutor) => tutor.id === tutorId) ? [{ value: tutorId, label: "Tutor seleccionado" }] : []),
        ...tutors.map((tutor) => ({ value: tutor.id, label: tutor.formalName })),
      ], onChange: props.onTutorChange,
    },
    {
      id: "movement-history-category", label: "Categoría", value: categoryId,
      options: [{ value: "", label: "Todas las categorías" }, ...categories.map((category) => ({ value: category.id, label: category.name }))],
      onChange: props.onCategoryChange,
    },
    {
      id: "movement-history-direction", label: "Dirección", value: direction === "ALL" ? "" : direction,
      options: [{ value: "", label: "Todas" }, ...Object.entries(directionLabels).map(([value, label]) => ({ value, label }))],
      onChange: (value) => props.onDirectionChange((value || "ALL") as DirectionFilter),
    },
    {
      id: "movement-history-source", label: "Origen", value: source === "ALL" ? "" : source,
      options: [{ value: "", label: "Todos los orígenes" }, { value: "MANUAL", label: "Carga manual" }, ...Object.entries(activityKindLabels).map(([value, label]) => ({ value, label }))],
      onChange: (value) => props.onSourceChange((value || "ALL") as SourceFilter),
    },
    {
      id: "movement-history-reversal", label: "Estado", value: reversal === "ALL" ? "" : reversal,
      options: [{ value: "", label: "Todos los estados" }, ...Object.entries(reversalLabels).map(([value, label]) => ({ value, label }))],
      onChange: (value) => props.onReversalChange((value || "ALL") as ReversalFilter),
    },
  ];
  return <FilterBar
    search={{ id: "movement-history-search", label: "Buscar", placeholder: "Buscar tutor, categoría o nota", value: props.search, onChange: props.onSearchChange }}
    filters={filters.map((filter) => ({ ...filter, disabled: props.disabled }))} resultCount={props.resultCount} hasActiveFilters={props.hasActiveFilters} onClear={props.onClear}
  />;
}
