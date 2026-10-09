"use client";

import { Button } from "@/components/ui/button";
import { CareerBadge } from "./career-badge";
import type { CareerColor } from "@/shared/career-color";

export interface LegendCareer { id: string; name: string; color: CareerColor }
export interface CareerLegendProps {
  careers: readonly LegendCareer[];
  visibleCareerIds: readonly string[];
  onVisibleCareerIdsChange: (ids: string[]) => void;
}

export function CareerLegend({ careers, visibleCareerIds, onVisibleCareerIdsChange }: CareerLegendProps) {
  const shown = careers.filter(({ id }) => visibleCareerIds.includes(id)).length;
  return (
    <section aria-label="Carreras" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold">Carreras</h3>
        <p role="status" className="text-sm text-muted-foreground">Mostrando {shown} de {careers.length} carreras</p>
        <Button type="button" variant="ghost" disabled={shown === careers.length}
          onClick={() => onVisibleCareerIdsChange(careers.map(({ id }) => id))}>Mostrar todas</Button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {careers.map((career) => {
          const visible = visibleCareerIds.includes(career.id);
          return <li key={career.id}>
            <Button type="button" variant={visible ? "default" : "outline"} className="h-auto min-h-11 py-2" aria-pressed={visible} aria-label={career.name}
              onClick={() => onVisibleCareerIdsChange(visible ? visibleCareerIds.filter((id) => id !== career.id) : [...visibleCareerIds, career.id])}>
              <span aria-hidden="true"><CareerBadge name={career.name} color={career.color} size="sm" /></span>
              <span className="whitespace-normal text-left">{career.name}</span>
            </Button>
          </li>;
        })}
      </ul>
    </section>
  );
}
