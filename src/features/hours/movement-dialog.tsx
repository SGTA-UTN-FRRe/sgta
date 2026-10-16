import { useEffect, useRef, type FormEvent, type RefObject } from "react";
import { Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/shared/components/form-field";
import { SystemState } from "@/shared/components/system-state";
import { formatDuration } from "@/shared/format-duration";
import { BulkTutorSelector } from "./bulk-tutor-selector";
import type { HourMovementOperation, HoursScreenData } from "./hours-screen-types";
import { directionLabels, formatActivityKind, formatDate, formatTutorCount, parseDurationMinutes, type MovementDirection } from "./hours-screen-utils";

export function MovementDialog({ category, data, date, direction, durationHours, durationMinutes,
  errorMessage, note, onCategoryChange, onClose, onDateChange, onDirectionChange,
  onDurationHoursChange, onDurationMinutesChange, onNoteChange, onOperationChange,
  onSubmit, onToggleAll, onToggleTutor, operation, open, selectedTutorIds, submitting, returnFocusRef,
}: {
  category: string;
  data: HoursScreenData;
  date: string;
  direction: MovementDirection;
  durationHours: string;
  durationMinutes: string;
  errorMessage: string | null;
  note: string;
  onCategoryChange: (value: string) => void;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onDirectionChange: (value: MovementDirection) => void;
  onDurationHoursChange: (value: string) => void;
  onDurationMinutesChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onOperationChange: (value: HourMovementOperation) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleAll: () => void;
  onToggleTutor: (id: string) => void;
  operation: HourMovementOperation;
  open: boolean;
  selectedTutorIds: string[];
  submitting: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const summary = errorRef.current;
    const region = summary?.parentElement;
    if (!errorMessage || !summary || !region) return;
    const summaryBounds = summary.getBoundingClientRect();
    const regionBounds = region.getBoundingClientRect();
    if (summaryBounds.top < regionBounds.top || summaryBounds.bottom > regionBounds.bottom) {
      summary.focus();
    }
  }, [errorMessage]);
  const selectedCategory = data.categories.find((entry) => entry.id === category);
  const availableCategories = data.categories.filter((entry) => operation === "RECOVERY"
    ? entry.activityKind === "RECOVERY" : entry.activityKind !== "RECOVERY");
  const durationTotal = parseDurationMinutes(durationHours, durationMinutes);
  const canUseDebit = selectedCategory?.activityKind === null || selectedCategory === undefined;
  const canSubmit = Boolean(data.currentCycle?.id && category && date && selectedTutorIds.length > 0 && durationTotal > 0
    && (operation !== "RECOVERY" || selectedCategory?.activityKind === "RECOVERY"));
  const operationLabel = operation === "RECOVERY" ? "Reconocer recuperación" : "Registrar movimiento";
  const selectedOrigin = selectedCategory?.activityKind ? formatActivityKind(selectedCategory.activityKind) : "Carga manual";
  const summary = `${operationLabel} · ${directionLabels[direction]} · ${selectedCategory?.name ?? "Sin categoría"} · ${selectedOrigin} · ${formatDuration(durationTotal)} · ${formatTutorCount(selectedTutorIds.length)} · ${date ? formatDate(date) : "Sin fecha"}`;
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !submitting) onClose(); }}>
      <DialogContent compactLayout="fullscreen" className="flex flex-col overflow-clip p-0"
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}>
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5 pr-16 text-left">
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>Revisar el resumen antes de registrar el mismo movimiento para todos los tutores seleccionados.</DialogDescription>
        </DialogHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-6">
            {errorMessage && <div ref={errorRef} tabIndex={-1}>
              <SystemState variant="error" title="No se pudo completar la operación. Intentar nuevamente." description={errorMessage} />
            </div>}
            <FormField id="movement-operation" label="Tipo de registro">
              <RadioGroup aria-labelledby="movement-operation-label" className="grid-cols-1 sm:grid-cols-2" value={operation}
                disabled={submitting} onValueChange={(value) => onOperationChange(value as HourMovementOperation)}>
                <RadioGroupItem variant="segment" value="MOVEMENT">Movimiento</RadioGroupItem>
                <RadioGroupItem variant="segment" value="RECOVERY">Reconocer recuperación</RadioGroupItem>
              </RadioGroup>
            </FormField>
            <FormField id="movement-direction" label="Dirección"
              description={selectedCategory?.activityKind ? `Las categorías de ${formatActivityKind(selectedCategory.activityKind).toLocaleLowerCase("es-AR")} requieren un crédito.` : undefined}>
              <RadioGroup aria-labelledby="movement-direction-label" className="grid-cols-2" value={direction}
                disabled={submitting} onValueChange={(value) => onDirectionChange(value as MovementDirection)}>
                <RadioGroupItem variant="segment" value="CREDIT">Crédito</RadioGroupItem>
                <RadioGroupItem variant="segment" value="DEBIT" disabled={!canUseDebit || operation === "RECOVERY"}>Débito</RadioGroupItem>
              </RadioGroup>
            </FormField>
            <FormField id="movement-category" label="Categoría">
              <NativeSelect value={category} onChange={(event) => onCategoryChange(event.target.value)} required
                disabled={submitting || !availableCategories.length}>
                <NativeSelectOption value="">{operation === "RECOVERY" && !availableCategories.length ? "No hay categoría de recuperación activa" : "Seleccionar categoría"}</NativeSelectOption>
                {availableCategories.map((entry) => <NativeSelectOption key={entry.id} value={entry.id}>
                  {entry.name}{entry.activityKind ? ` · ${formatActivityKind(entry.activityKind)}` : ""}
                </NativeSelectOption>)}
              </NativeSelect>
            </FormField>
            {!availableCategories.length && <SystemState variant="required-action" title={operation === "RECOVERY"
              ? "No hay categoría de recuperación activa" : "No hay categorías activas disponibles para registrar movimientos."} />}
            <fieldset>
              <legend className="mb-3 font-semibold">Duración</legend>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField id="movement-hours" label="Horas">
                  <Input type="number" inputMode="numeric" min="0" max="1666" value={durationHours} disabled={submitting}
                    onChange={(event) => onDurationHoursChange(event.target.value)} />
                </FormField>
                <FormField id="movement-minutes" label="Minutos">
                  <Input type="number" inputMode="numeric" min="0" max="59" value={durationMinutes} disabled={submitting}
                    onChange={(event) => onDurationMinutesChange(event.target.value)} />
                </FormField>
              </div>
            </fieldset>
            <FormField id="movement-date" label="Fecha">
              <Input type="date" value={date} required disabled={submitting} onChange={(event) => onDateChange(event.target.value)} />
            </FormField>
            <FormField id="movement-note" label="Nota">
              <Textarea value={note} placeholder="Agregar contexto opcional" disabled={submitting} onChange={(event) => onNoteChange(event.target.value)} />
            </FormField>
            <BulkTutorSelector tutors={data.eligibleTutors} selectedTutorIds={selectedTutorIds} submitting={submitting}
              onToggleAll={onToggleAll} onToggleTutor={onToggleTutor} />
            <section aria-labelledby="movement-summary-title" className="border-t border-border pt-4">
              <h3 className="font-display text-lg font-semibold" id="movement-summary-title">Resumen</h3>
              <p className="mt-2 text-sm font-semibold leading-6">{summary}</p>
            </section>
          </div>
          <div className="shrink-0 border-t border-border px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button disabled={submitting} onClick={onClose} type="button" variant="outline">Cancelar</Button>
              <Button disabled={submitting || !canSubmit} type="submit">
                {submitting ? <RefreshCw aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
                {operation === "RECOVERY" ? "Reconocer recuperación" : "Registrar movimientos"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
