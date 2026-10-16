"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "./form-field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface SelectFilter {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  /** A required filter, such as a period endpoint, always applies and is not counted as active. */
  alwaysApplied?: boolean;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}
export interface DateFilter extends Omit<SelectFilter, "options"> {
  type: "date";
  /** Preserve malformed URL dates so the user can correct them. */
  inputType?: "date" | "text";
}
type FilterControlValue = SelectFilter | DateFilter;
export interface FilterBarProps {
  search?: { id: string; label: string; value: string; placeholder?: string; maxLength?: number; onChange: (value: string) => void };
  filters?: readonly FilterControlValue[];
  essentialFilterId?: string;
  resultCount?: number;
  /** Explicit-submit filters can submit the owning form from the portaled sheet. */
  sheetAction?: ReactNode;
  hasActiveFilters: boolean;
  onClear: () => void;
}

function FilterControl({ filter, compact = false }: { filter: FilterControlValue; compact?: boolean }) {
  const id = compact ? `${filter.id}-compact` : filter.id;
  return (
    <FormField id={id} label={filter.label}>
      {"type" in filter ? <Input id={id} type={filter.inputType ?? "date"} value={filter.value} disabled={filter.disabled} onChange={(event) => filter.onChange(event.target.value)} /> : <NativeSelect id={id} value={filter.value} disabled={filter.disabled} onChange={(event) => filter.onChange(event.target.value)}>
        {filter.options.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
      </NativeSelect>}
    </FormField>
  );
}

export function FilterBar({ search, filters = [], essentialFilterId, resultCount, sheetAction, hasActiveFilters, onClear }: FilterBarProps) {
  const essentialFilter = search ? undefined : filters.find((filter) => filter.id === essentialFilterId) ?? filters[0];
  const secondaryFilters = filters.filter((filter) => filter !== essentialFilter);
  const activeCount = secondaryFilters.filter((filter) => !filter.alwaysApplied && filter.value !== "").length;
  const filterLabel = activeCount ? `Filtros, ${activeCount} ${activeCount === 1 ? "activo" : "activos"}` : "Filtros";
  return (
    <div role="search" aria-label="Buscar y filtrar" className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end" data-slot="filter-bar">
      {search && <div className="min-w-0 flex-1 space-y-2 md:min-w-48">
        <Label htmlFor={search.id}>{search.label}</Label>
        <Input id={search.id} type="search" maxLength={search.maxLength} value={search.value} placeholder={search.placeholder} onChange={(event) => search.onChange(event.target.value)} />
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
              {sheetAction}
            </div>
          </SheetContent>
        </Sheet>
      </div>}
      {resultCount !== undefined && <p role="status" className="py-2 text-sm text-muted-foreground tabular-nums">{resultCount} {resultCount === 1 ? "resultado" : "resultados"}</p>}
      {hasActiveFilters && <Button type="button" variant="ghost" onClick={onClear}>Limpiar filtros</Button>}
    </div>
  );
}
