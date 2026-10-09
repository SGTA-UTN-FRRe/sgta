"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

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
  resultCount: number;
  hasActiveFilters: boolean;
  onClear: () => void;
}

export function FilterBar({ search, filters = [], resultCount, hasActiveFilters, onClear }: FilterBarProps) {
  return (
    <div role="search" aria-label="Buscar y filtrar" className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end" data-slot="filter-bar">
      {search && <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor={search.id}>{search.label}</Label>
        <Input id={search.id} type="search" value={search.value} placeholder={search.placeholder} onChange={(event) => search.onChange(event.target.value)} />
      </div>}
      {filters.map((filter) => <div key={filter.id} className="space-y-2">
        <Label htmlFor={filter.id}>{filter.label}</Label>
        <NativeSelect id={filter.id} value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
          {filter.options.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
        </NativeSelect>
      </div>)}
      <p role="status" className="py-2 text-sm text-muted-foreground tabular-nums">{resultCount} {resultCount === 1 ? "resultado" : "resultados"}</p>
      {hasActiveFilters && <Button type="button" variant="ghost" onClick={onClear}>Limpiar filtros</Button>}
    </div>
  );
}
