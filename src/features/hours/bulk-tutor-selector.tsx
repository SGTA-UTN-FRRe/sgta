import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/shared/components/form-field";
import { SystemState } from "@/shared/components/system-state";
import type { SafeHourTutor } from "./hour-service";

export function BulkTutorSelector({ tutors, selectedTutorIds, submitting, onToggleAll, onToggleTutor }: {
  tutors: SafeHourTutor[];
  selectedTutorIds: string[];
  submitting: boolean;
  onToggleAll: () => void;
  onToggleTutor: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const visibleTutors = useMemo(() => {
    const normalize = (value: string) => value.toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return tutors.filter((tutor) => normalize(`${tutor.formalName} ${tutor.careerName}`).includes(normalize(search.trim())));
  }, [search, tutors]);
  const allSelected = tutors.length > 0 && selectedTutorIds.length === tutors.length;
  const partial = selectedTutorIds.length > 0 && !allSelected;
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 font-semibold">Tutores</legend>
      <FormField id="movement-tutor-search" label="Buscar tutor">
        <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} disabled={submitting} />
      </FormField>
      <p role="status" className="text-sm text-muted-foreground">
        {selectedTutorIds.length} de {tutors.length} tutores seleccionados{search ? "; la selección incluye los tutores ocultos por la búsqueda" : ""}.
      </p>
      <div className="flex min-h-11 items-center gap-3 border-b border-border pb-3">
        <Checkbox id="movement-select-all" aria-label="Seleccionar todos" checked={partial ? "indeterminate" : allSelected}
          disabled={submitting || !tutors.length} onCheckedChange={onToggleAll} />
        <Label htmlFor="movement-select-all">Seleccionar todos</Label>
        <span className="ml-auto text-xs text-muted-foreground">{selectedTutorIds.length} de {tutors.length}</span>
      </div>
      <div aria-live="polite" className="sr-only">
        Seleccionar todos: {selectedTutorIds.length} de {tutors.length} tutores seleccionados{partial ? ", selección mixta" : ""}.
      </div>
      {!tutors.length ? <SystemState variant="empty" title="No hay tutores elegibles disponibles para registrar movimientos." /> :
        !visibleTutors.length ? <SystemState variant="empty" title="No hay resultados para la búsqueda actual." /> :
          <div className="divide-y divide-border">
            {visibleTutors.map((tutor) => (
              <div key={tutor.id} className="flex min-h-11 items-center gap-3 py-3">
                <Checkbox id={`movement-tutor-${tutor.id}`} aria-label={`Seleccionar a ${tutor.formalName}`}
                  checked={selectedTutorIds.includes(tutor.id)} disabled={submitting} onCheckedChange={() => onToggleTutor(tutor.id)} />
                <Label htmlFor={`movement-tutor-${tutor.id}`} className="flex min-w-0 flex-col items-start gap-1">
                  <span className="font-semibold">{tutor.formalName}</span>
                  <span className="text-xs font-normal text-muted-foreground">{tutor.careerName}</span>
                </Label>
              </div>
            ))}
          </div>}
    </fieldset>
  );
}
