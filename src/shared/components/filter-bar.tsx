"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface SelectFilter {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}
export interface FilterBarProps {
  search?: { id: string; label: string; value: string; placeholder?: string; onChange: (value: string) => void };
  filters?: readonly SelectFilter[];
  essentialFilterId?: string;
  resultCount: number;
  hasActiveFilters: boolean;
  onClear: () => void;
}

function FilterControl({ filter, compact = false }: { filter: SelectFilter; compact?: boolean }) {
  const id = compact ? `${filter.id}-compact` : filter.id;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{filter.label}</Label>
      <NativeSelect id={id} value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
        {filter.options.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  );
}

export function FilterBar({ search, filters = [], essentialFilterId, resultCount, hasActiveFilters, onClear }: FilterBarProps) {
  const essentialFilter = search ? undefined : filters.find((filter) => filter.id === essentialFilterId) ?? filters[0];
  const secondaryFilters = filters.filter((filter) => filter !== essentialFilter);
  const activeCount = secondaryFilters.filter((filter) => filter.value !== "").length;
  const filterLabel = activeCount ? `Filtros, ${activeCount} ${activeCount === 1 ? "activo" : "activos"}` : "Filtros";
  return (
    <div role="search" aria-label="Buscar y filtrar" className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end" data-slot="filter-bar">
      {search && <div className="min-w-0 flex-1 space-y-2 md:min-w-48">
        <Label htmlFor={search.id}>{search.label}</Label>
        <Input id={search.id} type="search" value={search.value} placeholder={search.placeholder} onChange={(event) => search.onChange(event.target.value)} />
      </div>}
      {filters.map((filter) => <div key={filter.id} className={filter === essentialFilter ? undefined : "hidden md:block"}>
        <FilterControl filter={filter} />
      </div>)}
      {secondaryFilters.length > 0 && <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" aria-label={filterLabel}>
              Filtros {activeCount > 0 && <Badge variant="secondary" aria-hidden="true">{activeCount}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent aria-describedby={undefined}>
            <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
            <div className="space-y-4 px-4 pb-4">
              {secondaryFilters.map((filter) => <FilterControl key={filter.id} filter={filter} compact />)}
            </div>
          </SheetContent>
        </Sheet>
      </div>}
      <p role="status" className="py-2 text-sm text-muted-foreground tabular-nums">{resultCount} {resultCount === 1 ? "resultado" : "resultados"}</p>
      {hasActiveFilters && <Button type="button" variant="ghost" onClick={onClear}>Limpiar filtros</Button>}
    </div>
  );
}
