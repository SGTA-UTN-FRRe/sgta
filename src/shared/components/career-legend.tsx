"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import { CareerBadge } from "./career-badge";
import type { CareerColor } from "@/shared/career-color";

export interface LegendCareer { id: string; name: string; color: CareerColor }
export interface CareerLegendProps {
  careers: readonly LegendCareer[];
  /** Pressed careers filter the dataset; none pressed shows every career. */
  selectedCareerIds: readonly string[];
  onSelectedCareerIdsChange: (ids: string[]) => void;
  /** Polite summary of the visible records, announced after each change and shown while filtering. */
  summary: string;
  /** `sm` keeps the legend to a compact toolbar row; below Medium the toggles show only the abbreviation. */
  size?: "default" | "sm";
}

export function CareerLegend({ careers, selectedCareerIds, onSelectedCareerIdsChange, summary, size = "default" }: CareerLegendProps) {
  const headingId = useId();
  const filtered = selectedCareerIds.length > 0;
  return (
    <section aria-labelledby={headingId} className="flex flex-wrap items-center gap-2" data-slot="career-legend">
      <h3 id={headingId} className="mr-1 text-sm font-semibold">Carreras</h3>
      <ul className="flex flex-wrap gap-2">
        {careers.map((career) => {
          const pressed = selectedCareerIds.includes(career.id);
          return <li className="max-w-full" key={career.id}>
            <Button type="button" variant={pressed ? "default" : "outline"} aria-pressed={pressed} aria-label={career.name} title={career.name}
              className={cn("h-auto max-w-full pl-1", size === "sm" ? "min-h-8 py-1 pr-3 text-xs max-md:pr-1" : "min-h-11 py-1.5")}
              onClick={() => onSelectedCareerIdsChange(pressed ? selectedCareerIds.filter((id) => id !== career.id) : [...selectedCareerIds, career.id])}>
              <span aria-hidden="true"><CareerBadge name={career.name} color={career.color} size="sm" /></span>
              <span className={cn("whitespace-normal text-left", size === "sm" && "max-md:sr-only")}>{career.name}</span>
            </Button>
          </li>;
        })}
      </ul>
      {filtered && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onSelectedCareerIdsChange([])}>Mostrar todas</Button>
      )}
      <p role="status" className={filtered ? "text-sm text-muted-foreground" : "sr-only"}>{summary}</p>
    </section>
  );
}
