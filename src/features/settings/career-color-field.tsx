"use client";

import { useId } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CareerBadge } from "@/shared/components/career-badge";
import { FormField } from "@/shared/components/form-field";
import { CAREER_COLORS, CAREER_COLOR_LABELS, type CareerColor } from "@/shared/career-color";

export function CareerColorField({ name, value, mode, onChange, disabled = false }: {
  name: string;
  value?: CareerColor;
  mode: "create" | "edit";
  onChange: (color: CareerColor) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const description = mode === "create"
    ? "Identifica a los tutores de esta carrera en la grilla de horarios. Si no se elige un color, se asigna automáticamente el menos usado."
    : "Identifica a los tutores de esta carrera en la grilla de horarios.";
  return (
    <FormField id={id} label="Color en Horarios" description={description}>
      <RadioGroup aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4" disabled={disabled} value={value ?? ""}
        onValueChange={(color) => onChange(color as CareerColor)}>
        {CAREER_COLORS.map((color) => (
          <label key={color} htmlFor={`${id}-${color}`} className="grid min-h-11 min-w-0 cursor-pointer grid-cols-2 items-center gap-2 rounded-md border border-input bg-card p-2 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-primary">
            <RadioGroupItem id={`${id}-${color}`} value={color} aria-label={CAREER_COLOR_LABELS[color]} />
            <span aria-hidden="true"><CareerBadge name={name.trim() || "Carrera"} color={color} size="sm" /></span>
            <span className="col-span-2">{CAREER_COLOR_LABELS[color]}</span>
          </label>
        ))}
      </RadioGroup>
    </FormField>
  );
}
