"use client";

import { CircleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FormField } from "@/shared/components/form-field";
import {
  SCHEDULE_MODALITIES,
  SCHEDULE_MODALITY_LABELS,
  type ScheduleModality,
} from "@/shared/schedule-modality";

import type {
  SafeScheduleAssignment,
  SafeSchedulePlan,
  SafeScheduleTutor,
} from "./schedule-service";
import {
  formatDate,
  formatMinutes,
  formatPlanKind,
  formatValidity,
  getScheduleErrorMessage,
  PLAN_WEEKDAYS,
  toMinutes,
  WEEKDAY_NAMES,
  type AssignmentDraft,
  type AssignmentView,
} from "./schedule-view-model";

export type AssignmentEditorTarget = {
  assignment?: AssignmentView;
  /** Day preselected for a new assignment, `LUN` to `VIE`. */
  initialDay: string;
  mode: "add" | "edit";
};

const weekdayOptions = WEEKDAY_NAMES.slice(1).map((name, index) => ({
  label: `${name.charAt(0).toLocaleUpperCase("es-AR")}${name.slice(1)}`,
  value: String(index + 1),
}));

function AssignmentForm({
  onCancel,
  onDelete,
  onSave,
  plan,
  target,
  tutors,
}: {
  onCancel: () => void;
  onDelete: () => Promise<void>;
  onSave: (draft: AssignmentDraft, originalId?: string) => Promise<void>;
  plan: SafeSchedulePlan;
  target: AssignmentEditorTarget;
  tutors: readonly SafeScheduleTutor[];
}) {
  const { assignment, mode } = target;
  const initialWeekday =
    assignment?.weekday ?? Math.max(1, PLAN_WEEKDAYS.indexOf(target.initialDay) + 1);
  const [tutorId, setTutorId] = useState(assignment?.tutorId ?? tutors[0]?.id ?? "");
  const [pattern, setPattern] = useState<SafeScheduleAssignment["pattern"]>(
    assignment?.pattern ?? "WEEKDAY",
  );
  const [weekday, setWeekday] = useState(String(initialWeekday));
  const [assignmentDate, setAssignmentDate] = useState(
    assignment?.assignmentDate ?? assignment?.date ?? plan.validFrom,
  );
  const [start, setStart] = useState(formatMinutes(assignment?.startMinutes ?? 8 * 60));
  const [end, setEnd] = useState(formatMinutes(assignment?.endMinutes ?? 10 * 60));
  const [kind, setKind] = useState<SafeScheduleAssignment["kind"]>(assignment?.kind ?? "DUTY");
  const [modality, setModality] = useState<ScheduleModality>(assignment?.modality ?? "IN_PERSON");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const busy = saving || deleting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    const parsedWeekday = Number(weekday);

    if (!tutorId || !start || !end) {
      setError("Completar tutor y horario para continuar.");
      return;
    }

    if (
      !Number.isInteger(startMinutes) ||
      !Number.isInteger(endMinutes) ||
      startMinutes < 0 ||
      endMinutes > 1_440 ||
      startMinutes >= endMinutes
    ) {
      setError("El fin debe ser posterior al inicio y pertenecer al día.");
      return;
    }

    if (pattern === "WEEKDAY" && (!Number.isInteger(parsedWeekday) || parsedWeekday < 1 || parsedWeekday > 7)) {
      setError("Seleccionar un día de la semana válido.");
      return;
    }

    if (pattern === "DATE" && !assignmentDate) {
      setError("Seleccionar una fecha para la asignación.");
      return;
    }

    setSaving(true);

    try {
      await onSave(
        {
          assignmentDate: pattern === "DATE" ? assignmentDate : null,
          endMinutes,
          kind,
          modality,
          pattern,
          startMinutes,
          tutorId,
          weekday: pattern === "WEEKDAY" ? parsedWeekday : null,
        },
        assignment?.id,
      );
    } catch (saveError) {
      setError(getScheduleErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);

    try {
      await onDelete();
    } catch (deleteError) {
      setError(getScheduleErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  }

  const tutorName = tutors.find((tutor) => tutor.id === tutorId)?.formalName ?? "Sin tutor";
  const dayLabel =
    pattern === "WEEKDAY"
      ? weekdayOptions.find((option) => option.value === weekday)?.label ?? "Sin día"
      : formatDate(assignmentDate);
  const summary = `${tutorName} · ${dayLabel} · ${start || "--:--"}–${end || "--:--"} · ${
    kind === "RECOVERY" ? "Recuperación" : "Guardia"
  } · ${SCHEDULE_MODALITY_LABELS[modality]}`;

  return (
    <>
      <SheetHeader className="shrink-0 border-b border-border p-6 pr-16">
        <SheetTitle>{mode === "add" ? "Nueva asignación" : "Editar asignación"}</SheetTitle>
        <SheetDescription>
          Los cambios se validan y guardan en el sistema para el plan seleccionado.
        </SheetDescription>
      </SheetHeader>

      <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={handleSubmit}>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {error && (
            <div className="flex items-start gap-3 text-sm" role="alert">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-semibold">Plan seleccionado</p>
            <p className="text-sm text-muted-foreground">
              {plan.name} · {formatPlanKind(plan.kind)} ·{" "}
              <span className="tabular-nums">{formatValidity(plan)}</span>
            </p>
          </div>

          <FormField id="assignment-tutor" label="Tutor">
            <NativeSelect
              disabled={busy || tutors.length === 0}
              onChange={(event) => setTutorId(event.target.value)}
              required
              value={tutorId}
            >
              {tutors.length === 0 && (
                <NativeSelectOption value="">No hay tutores elegibles</NativeSelectOption>
              )}
              {tutors.map((tutor) => (
                <NativeSelectOption key={tutor.id} value={tutor.id}>
                  {tutor.formalName}
                  {tutor.displayName && !tutor.formalName.endsWith(`, ${tutor.displayName}`)
                    ? ` (${tutor.displayName})`
                    : ""}{" "}
                  · {tutor.careerName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>

          <FormField id="assignment-pattern" label="Repetición">
            <NativeSelect
              disabled={busy}
              onChange={(event) => setPattern(event.target.value as SafeScheduleAssignment["pattern"])}
              value={pattern}
            >
              <NativeSelectOption value="WEEKDAY">Día de la semana</NativeSelectOption>
              <NativeSelectOption value="DATE">Fecha específica</NativeSelectOption>
            </NativeSelect>
          </FormField>

          {pattern === "WEEKDAY" ? (
            <FormField id="assignment-day" label="Día">
              <NativeSelect disabled={busy} onChange={(event) => setWeekday(event.target.value)} required value={weekday}>
                {weekdayOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
          ) : (
            <FormField id="assignment-date" label="Fecha">
              <Input
                disabled={busy}
                max={plan.validTo}
                min={plan.validFrom}
                onChange={(event) => setAssignmentDate(event.target.value)}
                required
                type="date"
                value={assignmentDate}
              />
            </FormField>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="assignment-start" label="Inicio">
              <Input disabled={busy} onChange={(event) => setStart(event.target.value)} required type="time" value={start} />
            </FormField>
            <FormField id="assignment-end" label="Fin">
              <Input disabled={busy} onChange={(event) => setEnd(event.target.value)} required type="time" value={end} />
            </FormField>
          </div>

          <FormField id="assignment-kind" label="Tipo de asignación">
            <NativeSelect
              disabled={busy}
              onChange={(event) => setKind(event.target.value as SafeScheduleAssignment["kind"])}
              value={kind}
            >
              <NativeSelectOption value="DUTY">Guardia</NativeSelectOption>
              <NativeSelectOption value="RECOVERY">Recuperación</NativeSelectOption>
            </NativeSelect>
          </FormField>

          <FormField id="assignment-modality" label="Modalidad">
            <NativeSelect
              disabled={busy}
              onChange={(event) => setModality(event.target.value as ScheduleModality)}
              value={modality}
            >
              {SCHEDULE_MODALITIES.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {SCHEDULE_MODALITY_LABELS[value]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>

          <section aria-labelledby="assignment-summary-heading" className="space-y-1 border-t border-border pt-4">
            <h3 className="text-sm font-semibold" id="assignment-summary-heading">
              Resumen de asignación
            </h3>
            <p className="text-sm tabular-nums">{summary}</p>
            <p className="text-sm text-muted-foreground">
              La validación del servidor conserva la vigencia, elegibilidad y conflictos del plan.
            </p>
          </section>
        </div>

        <SheetFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border bg-popover px-6 py-4 sm:flex-row sm:items-center">
          {assignment && (
            <Button disabled={busy} onClick={() => void handleDelete()} type="button" variant="destructive-outline">
              Eliminar asignación
            </Button>
          )}
          <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
            <Button disabled={busy} onClick={onCancel} type="button" variant="outline">
              Cancelar
            </Button>
            <Button disabled={busy} type="submit">
              {saving ? "Guardando..." : "Guardar asignación"}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </>
  );
}

export function AssignmentEditor({
  onCloseAutoFocus,
  onDelete,
  onOpenChange,
  onSave,
  open,
  plan,
  target,
  tutors,
}: {
  onCloseAutoFocus: (event: Event) => void;
  onDelete: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: AssignmentDraft, originalId?: string) => Promise<void>;
  open: boolean;
  plan: SafeSchedulePlan;
  target: AssignmentEditorTarget | null;
  tutors: readonly SafeScheduleTutor[];
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="gap-0" onCloseAutoFocus={onCloseAutoFocus}>
        {target && (
          <AssignmentForm
            key={`${target.mode}:${target.assignment?.id ?? target.initialDay}:${plan.id}`}
            onCancel={() => onOpenChange(false)}
            onDelete={onDelete}
            onSave={onSave}
            plan={plan}
            target={target}
            tutors={tutors}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
