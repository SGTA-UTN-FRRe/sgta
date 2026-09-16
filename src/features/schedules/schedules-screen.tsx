"use client";

import Link from "next/link";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Edit3,
  Plus,
  Settings2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  goldenScreenStateFixtures,
  type GoldenStateFixture,
  type ScheduleAssignmentGoldenFixture,
  type SchedulePlanGoldenFixture,
  type SchedulesGoldenFixture,
} from "@/features/golden-screens/fixtures";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import {
  StatusBadge,
  type StatusBadgeVariant,
} from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

export type SchedulesScreenState =
  | "default"
  | "loading"
  | "empty"
  | "empty-plan"
  | "no-plan"
  | "error"
  | "success"
  | "required-action"
  | "conflict";

export interface SchedulesScreenProps {
  fixture: SchedulesGoldenFixture;
  state?: SchedulesScreenState;
}

type EditorState = {
  assignment?: ScheduleAssignmentGoldenFixture;
  mode: "add" | "edit";
} | null;

type AssignmentDraft = Omit<ScheduleAssignmentGoldenFixture, "id">;

const selectClassName =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const GRID_START_MINUTES = 8 * 60;
const GRID_END_MINUTES = 20 * 60;
const GRID_HOUR_HEIGHT_REM = 4;

function findStateFixture(state: SchedulesScreenState): GoldenStateFixture | undefined {
  if (state === "default" || state === "success") {
    return undefined;
  }

  const fixtureState =
    state === "empty-plan" || state === "empty"
      ? "empty"
      : state === "no-plan"
        ? "required-action"
        : state;

  return goldenScreenStateFixtures.schedules.find(
    (stateFixture) => stateFixture.state === fixtureState,
  );
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

function formatTutorCount(count: number) {
  return `${count} ${count === 1 ? "asignación" : "asignaciones"}`;
}

function formatAssignmentLabel(assignment: ScheduleAssignmentGoldenFixture) {
  return `${assignment.tutor}, ${assignment.day}, ${assignment.start} a ${assignment.end}`;
}

function planStatusVariant(plan: SchedulePlanGoldenFixture): StatusBadgeVariant {
  return plan.isActive ? "success" : "neutral";
}

function PreviewActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
      href={href}
    >
      {label}
    </Link>
  );
}

function InlineStateNotice({
  action,
  description,
  icon,
  title,
  tone,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
  tone: "danger" | "success" | "warning";
}) {
  const styles = {
    danger: "border-danger/30 bg-danger-surface/60",
    success: "border-success/30 bg-success-surface/60",
    warning: "border-warning/30 bg-warning-surface/60",
  } as const;
  const iconStyles = {
    danger: "text-danger",
    success: "text-success",
    warning: "text-warning",
  } as const;

  return (
    <div
      aria-live="polite"
      className={cn(
        "mt-6 flex items-start gap-3 rounded-md border p-4",
        styles[tone],
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className={cn("mt-0.5 shrink-0", iconStyles[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-foreground-secondary">{description}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

function PlanContext({
  fixture,
  onNewPlan,
  onSelectPlan,
  selectedPlan,
  selectedPlanId,
}: {
  fixture: SchedulesGoldenFixture;
  onNewPlan: (event: MouseEvent<HTMLButtonElement>) => void;
  onSelectPlan: (planId: string) => void;
  selectedPlan?: SchedulePlanGoldenFixture;
  selectedPlanId: string;
}) {
  if (!selectedPlan) {
    return null;
  }

  return (
    <section
      aria-labelledby="schedule-plan-context-title"
      className="mt-6 rounded-md border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            Contexto del plan
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2
              className="text-lg font-bold tracking-tight text-foreground"
              id="schedule-plan-context-title"
            >
              {selectedPlan.name}
            </h2>
            <StatusBadge
              label={selectedPlan.isActive ? "Activo" : "Disponible"}
              variant={planStatusVariant(selectedPlan)}
            />
            <StatusBadge label={selectedPlan.kindLabel} variant="info" />
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Tipo de plan</dt>
              <dd className="mt-1 font-semibold text-foreground">{selectedPlan.kindLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Vigencia</dt>
              <dd className="mt-1 font-semibold text-foreground">{selectedPlan.validity}</dd>
            </div>
          </dl>
        </div>

        <Button onClick={onNewPlan} type="button" variant="outline">
          <Plus aria-hidden="true" />
          {fixture.secondaryAction}
        </Button>
      </div>

      <div className="mt-5 border-t border-border-subtle pt-4">
        <p className="text-xs font-semibold text-foreground-secondary">Seleccionar plan</p>
        <div
          aria-label="Planes de horario"
          className="mt-3 grid gap-2 md:grid-cols-2"
          role="tablist"
        >
          {fixture.plans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;

            return (
              <button
                aria-controls="schedule-workspace"
                aria-selected={isSelected}
                className={cn(
                  "flex min-h-12 items-center justify-between gap-3 rounded-sm border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-surface text-foreground-secondary hover:bg-surface-subtle",
                )}
                key={plan.id}
                onClick={() => onSelectPlan(plan.id)}
                role="tab"
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{plan.name}</span>
                  <span className="mt-1 block text-xs text-foreground-muted">
                    {plan.validity}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold">
                  {isSelected ? "Seleccionado" : plan.kindLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ScheduleBlock({
  assignment,
  conflict,
  onEdit,
  selected,
}: {
  assignment: ScheduleAssignmentGoldenFixture;
  conflict: boolean;
  onEdit: (assignment: ScheduleAssignmentGoldenFixture, trigger: HTMLElement) => void;
  selected: boolean;
}) {
  const start = Math.max(GRID_START_MINUTES, toMinutes(assignment.start));
  const end = Math.min(GRID_END_MINUTES, toMinutes(assignment.end));
  const top = ((start - GRID_START_MINUTES) / 60) * GRID_HOUR_HEIGHT_REM;
  const height = Math.max(((end - start) / 60) * GRID_HOUR_HEIGHT_REM, 3.25);
  const accessibleLabel = `${formatAssignmentLabel(assignment)}${
    conflict ? ", conflicto de horario" : ""
  }`;

  return (
    <button
      aria-label={accessibleLabel}
      aria-pressed={selected}
      className={cn(
        "absolute left-2 right-2 z-10 flex flex-col items-start overflow-hidden rounded-sm border p-2 text-left shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
        conflict
          ? "border-danger bg-danger-surface text-foreground hover:bg-danger-surface/80"
          : selected
            ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/30"
            : "border-info/30 bg-info-surface text-foreground hover:bg-info-surface/80",
      )}
      onClick={(event) => onEdit(assignment, event.currentTarget)}
      style={{ height: `${height}rem`, top: `${top}rem` }}
      type="button"
    >
      <span className="sr-only">{selected ? "Seleccionada. " : ""}</span>
      <span className="w-full truncate text-xs font-bold">{assignment.tutor}</span>
      <span className="mt-1 flex items-center gap-1 text-xs font-numeric tabular-nums">
        <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        {assignment.start} — {assignment.end}
      </span>
      <span className="mt-1 w-full truncate text-[11px] text-foreground-secondary">
        {assignment.modality}
      </span>
      {conflict && (
        <StatusBadge className="mt-auto" label="Conflicto" variant="danger" />
      )}
      {selected && !conflict && (
        <StatusBadge className="mt-auto" label="Seleccionada" variant="info" />
      )}
    </button>
  );
}

function TimeRail() {
  const hours = Array.from(
    { length: (GRID_END_MINUTES - GRID_START_MINUTES) / 60 },
    (_, index) => index + GRID_START_MINUTES / 60,
  );

  return (
    <div
      aria-hidden="true"
      className="relative h-[48rem] border-r border-border-subtle bg-surface-subtle/30"
    >
      {hours.map((hour) => (
        <span
          className="absolute right-2 -translate-y-1/2 text-[11px] font-numeric tabular-nums text-foreground-muted"
          key={hour}
          style={{ top: `${(hour - GRID_START_MINUTES / 60) * GRID_HOUR_HEIGHT_REM}rem` }}
        >
          {String(hour).padStart(2, "0")}:00
        </span>
      ))}
    </div>
  );
}

function ScheduleDayColumn({
  assignments,
  conflictIds,
  day,
  onEdit,
  selectedAssignmentId,
}: {
  assignments: ScheduleAssignmentGoldenFixture[];
  conflictIds: Set<string>;
  day: string;
  onEdit: (assignment: ScheduleAssignmentGoldenFixture, trigger: HTMLElement) => void;
  selectedAssignmentId: string | null;
}) {
  const hours = Array.from(
    { length: (GRID_END_MINUTES - GRID_START_MINUTES) / 60 },
    (_, index) => index,
  );

  return (
    <div className="relative h-[48rem] border-r border-border-subtle last:border-r-0">
      {hours.map((hour) => (
        <span
          className="absolute inset-x-0 border-t border-border-subtle"
          key={hour}
          style={{ top: `${hour * GRID_HOUR_HEIGHT_REM}rem` }}
        />
      ))}
      {assignments
        .filter((assignment) => assignment.day === day)
        .map((assignment) => (
          <ScheduleBlock
            assignment={assignment}
            conflict={conflictIds.has(assignment.id)}
            key={assignment.id}
            onEdit={onEdit}
            selected={assignment.id === selectedAssignmentId}
          />
        ))}
    </div>
  );
}

function ScheduleGrid({
  assignments,
  conflictIds,
  days,
  onEdit,
  selectedAssignmentId,
  title,
}: {
  assignments: ScheduleAssignmentGoldenFixture[];
  conflictIds: Set<string>;
  days: string[];
  onEdit: (assignment: ScheduleAssignmentGoldenFixture, trigger: HTMLElement) => void;
  selectedAssignmentId: string | null;
  title: string;
}) {
  return (
    <section aria-labelledby={`${title}-title`} className="mt-4" id="schedule-workspace">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground" id={`${title}-title`}>
            {title}
          </h2>
          <p className="mt-1 text-xs text-foreground-muted">
            Seleccioná un bloque para editarlo desde el formulario.
          </p>
        </div>
        <span className="text-xs text-foreground-muted">{formatTutorCount(assignments.length)}</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border bg-surface">
        <div
          aria-label={title}
          className="grid min-w-[40rem]"
          role="grid"
          style={{
            gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(10rem, 1fr))`,
          }}
        >
          <div className="border-b border-border bg-surface-subtle/60 p-3 text-xs font-semibold text-foreground-muted">
            Hora
          </div>
          {days.map((day) => (
            <div
              className="border-b border-l border-border bg-surface-subtle/60 p-3 text-center text-xs font-bold tracking-[0.12em] text-foreground-secondary"
              key={day}
            >
              {day}
            </div>
          ))}
          <TimeRail />
          {days.map((day) => (
            <ScheduleDayColumn
              assignments={assignments}
              conflictIds={conflictIds}
              day={day}
              key={day}
              onEdit={onEdit}
              selectedAssignmentId={selectedAssignmentId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CompactSchedule({
  assignments,
  conflictIds,
  days,
  onAdd,
  onEdit,
  onSelectDay,
  selectedAssignmentId,
  selectedDay,
}: {
  assignments: ScheduleAssignmentGoldenFixture[];
  conflictIds: Set<string>;
  days: string[];
  onAdd: (event: MouseEvent<HTMLButtonElement>) => void;
  onEdit: (assignment: ScheduleAssignmentGoldenFixture, trigger: HTMLElement) => void;
  onSelectDay: (day: string) => void;
  selectedAssignmentId: string | null;
  selectedDay: string;
}) {
  const dayAssignments = assignments.filter((assignment) => assignment.day === selectedDay);

  return (
    <section aria-labelledby="compact-schedule-title" className="mt-4 md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground" id="compact-schedule-title">
            Editor por día
          </h2>
          <p className="mt-1 text-xs leading-5 text-foreground-muted">
            Seleccioná un día para revisar y editar sus asignaciones.
          </p>
        </div>
        <Button onClick={onAdd} size="sm" type="button">
          <Plus aria-hidden="true" />
          Agregar
        </Button>
      </div>

      <div
        aria-label="Días del plan"
        className="mt-4 grid grid-cols-5 gap-1 rounded-md border border-border bg-surface p-1"
        role="tablist"
      >
        {days.map((day) => (
          <button
            aria-selected={day === selectedDay}
            className={cn(
              "min-h-10 rounded-sm px-1 text-xs font-bold tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
              day === selectedDay
                ? "bg-primary text-primary-foreground"
                : "text-foreground-secondary hover:bg-surface-subtle",
            )}
            key={day}
            onClick={() => onSelectDay(day)}
            role="tab"
            type="button"
          >
            {day}
          </button>
        ))}
      </div>

      {dayAssignments.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-border p-5 text-center">
          <p className="text-sm font-semibold text-foreground">No hay asignaciones para {selectedDay}</p>
          <p className="mt-1 text-sm leading-6 text-foreground-secondary">
            Agregá una asignación para completar este día del plan.
          </p>
          <Button className="mt-4" onClick={onAdd} size="sm" type="button">
            <Plus aria-hidden="true" />
            Agregar asignación
          </Button>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-border-subtle overflow-hidden rounded-md border border-border bg-surface">
          {dayAssignments.map((assignment) => {
            const isSelected = assignment.id === selectedAssignmentId;
            const hasConflict = conflictIds.has(assignment.id);

            return (
              <button
                aria-label={formatAssignmentLabel(assignment)}
                aria-pressed={isSelected}
                className={cn(
                  "flex w-full items-start justify-between gap-4 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  hasConflict
                    ? "bg-danger-surface/60 hover:bg-danger-surface"
                    : isSelected
                      ? "bg-info-surface/60"
                      : "hover:bg-surface-subtle",
                )}
                key={assignment.id}
                onClick={(event) => onEdit(assignment, event.currentTarget)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {assignment.tutor}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs font-numeric tabular-nums text-foreground-secondary">
                    <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    {assignment.start} — {assignment.end}
                  </span>
                  <span className="mt-1 block truncate text-xs text-foreground-muted">
                    {assignment.modality}
                  </span>
                  {isSelected && (
                    <span className="mt-2 block text-xs font-semibold text-info">Seleccionada</span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                  {hasConflict && <StatusBadge label="Conflicto" variant="danger" />}
                  <Edit3 aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LoadingScheduleWorkspace() {
  const rows = ["one", "two", "three", "four", "five"];

  return (
    <div
      aria-label="Cargando horarios"
      aria-live="polite"
      className="mt-6 overflow-hidden rounded-md border border-border bg-surface"
      role="status"
    >
      <span className="sr-only">Cargando horarios</span>
      <div className="hidden md:block">
        <div className="grid grid-cols-[4.5rem_repeat(5,1fr)] border-b border-border">
          {rows.map((key) => (
            <span className="m-3 h-3 animate-pulse rounded-sm bg-surface-subtle" key={key} />
          ))}
        </div>
        <div className="grid grid-cols-[4.5rem_repeat(5,1fr)]">
          {rows.map((key) => (
            <span className="h-24 border-r border-border-subtle border-b bg-surface-subtle/30" key={key} />
          ))}
        </div>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {rows.slice(0, 3).map((key) => (
          <div className="space-y-2 rounded-md border border-border-subtle p-4" key={key}>
            <span className="block h-4 w-32 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="block h-4 w-48 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="block h-8 w-full animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}

function useOverlayFocus({
  initialFocusRef,
  onClose,
  open,
  panelRef,
}: {
  initialFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (!open || !panelRef.current) {
      return;
    }

    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      initialFocusRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelector),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [initialFocusRef, onClose, open, panelRef]);
}

function AssignmentEditor({
  assignment,
  fixture,
  initialDay,
  mode,
  onClose,
  onSave,
  open,
  plan,
  tutors,
}: {
  assignment?: ScheduleAssignmentGoldenFixture;
  fixture: SchedulesGoldenFixture;
  initialDay: string;
  mode: "add" | "edit";
  onClose: () => void;
  onSave: (draft: AssignmentDraft, originalId?: string) => void;
  open: boolean;
  plan: SchedulePlanGoldenFixture;
  tutors: string[];
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [tutor, setTutor] = useState(assignment?.tutor ?? tutors[0] ?? "");
  const [day, setDay] = useState(assignment?.day ?? initialDay);
  const [date, setDate] = useState(assignment?.date ?? "2026-09-14");
  const [start, setStart] = useState(assignment?.start ?? "08:00");
  const [end, setEnd] = useState(assignment?.end ?? "10:00");
  const [modality, setModality] = useState(assignment?.modality ?? "Presencial · Aula 204");
  const [error, setError] = useState<string | null>(null);

  useOverlayFocus({
    initialFocusRef: closeButtonRef,
    onClose,
    open,
    panelRef,
  });

  if (!open) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tutor || !day || !date || !start || !end || !modality.trim()) {
      setError("Completá tutor, día, fecha, inicio, fin y modalidad para continuar.");
      return;
    }

    if (toMinutes(end) <= toMinutes(start)) {
      setError("El fin debe ser posterior al inicio.");
      return;
    }

    onSave(
      {
        date,
        day,
        end,
        modality: modality.trim(),
        planId: plan.id,
        start,
        tutor,
      },
      assignment?.id,
    );
  }

  const summary = `${tutor || "Sin tutor"} · ${day || "Sin día"} · ${start || "--:--"} — ${
    end || "--:--"
  } · ${date ? formatDate(date) : "Sin fecha"}`;

  return (
    <div
      aria-label="Cerrar editor de asignación"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-brand-navy/30 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby="assignment-editor-description"
        aria-labelledby="assignment-editor-title"
        aria-modal="true"
        className="flex h-full max-h-[100svh] w-full flex-col border-border bg-surface shadow-2xl sm:h-auto sm:max-h-[calc(100svh-3rem)] sm:max-w-[42rem] sm:rounded-md sm:border"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Editor local
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground" id="assignment-editor-title">
              {mode === "add" ? "Agregar asignación" : "Editar asignación"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground-secondary" id="assignment-editor-description">
              Revisá el formulario para actualizar la vista del plan seleccionado.
            </p>
          </div>
          <button
            aria-label="Cerrar editor de asignación"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
            <section aria-labelledby="assignment-plan-heading" className="rounded-md border border-border-subtle bg-surface-subtle/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted" id="assignment-plan-heading">
                Plan seleccionado
              </p>
              <p className="mt-2 text-sm font-bold text-foreground">{plan.name}</p>
              <p className="mt-1 text-xs leading-5 text-foreground-secondary">
                {plan.kindLabel} · Vigencia {plan.validity}
              </p>
            </section>

            {error && (
              <div aria-live="assertive" className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-surface/60 p-4" role="alert">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                <p className="text-sm leading-6 text-foreground">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="assignment-tutor">
                Tutor
              </label>
              <select
                className={selectClassName}
                id="assignment-tutor"
                onChange={(event) => setTutor(event.target.value)}
                required
                value={tutor}
              >
                {tutors.map((tutorOption) => (
                  <option key={tutorOption} value={tutorOption}>
                    {tutorOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground" htmlFor="assignment-day">
                  Día
                </label>
                <select
                  className={selectClassName}
                  id="assignment-day"
                  onChange={(event) => setDay(event.target.value)}
                  required
                  value={day}
                >
                  {fixture.weekdays.map((weekday) => (
                    <option key={weekday} value={weekday}>
                      {weekday}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground" htmlFor="assignment-date">
                  Fecha
                </label>
                <div className="relative">
                  <CalendarDays aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                  <Input
                    className="pl-9"
                    id="assignment-date"
                    onChange={(event) => setDate(event.target.value)}
                    required
                    type="date"
                    value={date}
                  />
                </div>
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-foreground">Horario</legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="assignment-start">
                    Inicio
                  </label>
                  <Input id="assignment-start" onChange={(event) => setStart(event.target.value)} required type="time" value={start} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="assignment-end">
                    Fin
                  </label>
                  <Input id="assignment-end" onChange={(event) => setEnd(event.target.value)} required type="time" value={end} />
                </div>
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="assignment-modality">
                Modalidad
              </label>
              <Input id="assignment-modality" onChange={(event) => setModality(event.target.value)} required value={modality} />
            </div>

            <section aria-labelledby="assignment-summary-heading" className="rounded-md border border-info/30 bg-info-surface/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-info" id="assignment-summary-heading">
                Resumen de asignación
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{summary}</p>
              <p className="mt-2 text-xs leading-5 text-foreground-secondary">
                La edición equivalente por formulario permanece disponible sin drag-and-drop.
              </p>
            </section>
          </div>

          <div className="border-t border-border bg-surface px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={onClose} type="button" variant="outline">
                Cancelar
              </Button>
              <Button type="submit">
                <Check aria-hidden="true" />
                Guardar asignación
              </Button>
            </div>
            <p className="mt-3 text-center text-xs leading-5 text-foreground-muted sm:text-right">
              Esta vista previa actualiza solo la pantalla. No se guardaron cambios en el sistema.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SchedulesScreen({ fixture, state = "default" }: SchedulesScreenProps) {
  const [selectedPlanId, setSelectedPlanId] = useState(
    () => fixture.plans.find((plan) => plan.isActive)?.id ?? fixture.plans[0]?.id ?? "",
  );
  const [localAssignments, setLocalAssignments] = useState<ScheduleAssignmentGoldenFixture[]>(
    () => fixture.assignments,
  );
  const [selectedDay, setSelectedDay] = useState(fixture.weekdays[0] ?? "LUN");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const editorTriggerRef = useRef<HTMLElement | null>(null);

  const selectedPlan = useMemo(
    () => fixture.plans.find((plan) => plan.id === selectedPlanId),
    [fixture.plans, selectedPlanId],
  );
  const planAssignments = useMemo(
    () => localAssignments.filter((assignment) => assignment.planId === selectedPlanId),
    [localAssignments, selectedPlanId],
  );
  const tutors = useMemo(
    () => Array.from(new Set(fixture.assignments.map((assignment) => assignment.tutor))),
    [fixture.assignments],
  );
  const stateFixture = findStateFixture(state);
  const conflictIds = useMemo(
    () =>
      state === "conflict"
        ? new Set(planAssignments.slice(0, 2).map((assignment) => assignment.id))
        : new Set<string>(),
    [planAssignments, state],
  );
  const isEmptyPlan = state === "empty" || state === "empty-plan" || planAssignments.length === 0;

  const openAddEditor = useCallback(
    (trigger: HTMLElement) => {
      editorTriggerRef.current = trigger;
      setSelectedAssignmentId(null);
      setEditor({ mode: "add" });
    },
    [],
  );

  const openEditEditor = useCallback(
    (assignment: ScheduleAssignmentGoldenFixture, trigger: HTMLElement) => {
      editorTriggerRef.current = trigger;
      setSelectedDay(assignment.day);
      setSelectedAssignmentId(assignment.id);
      setEditor({ assignment, mode: "edit" });
    },
    [],
  );

  const closeEditor = useCallback(() => {
    setEditor(null);
    const trigger = editorTriggerRef.current;

    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
        editorTriggerRef.current = null;
      });
    }
  }, []);

  const handleSaveAssignment = useCallback(
    (draft: AssignmentDraft, originalId?: string) => {
      const nextId = originalId ?? `assignment-preview-${localAssignments.length + 1}`;
      const savedAssignment: ScheduleAssignmentGoldenFixture = {
        ...draft,
        id: nextId,
      };

      setLocalAssignments((currentAssignments) =>
        originalId
          ? currentAssignments.map((assignment) =>
              assignment.id === originalId ? savedAssignment : assignment,
            )
          : [...currentAssignments, savedAssignment],
      );
      setSelectedPlanId(draft.planId);
      setSelectedDay(draft.day);
      setSelectedAssignmentId(nextId);
      setAnnouncement(
        `${originalId ? "Asignación actualizada" : "Asignación preparada"} en esta vista previa. No se guardaron cambios en el sistema.`,
      );
      closeEditor();
    },
    [closeEditor, localAssignments.length],
  );

  const handlePreviewNewPlan = useCallback(() => {
    setAnnouncement(
      "La creación de un plan queda disponible como vista previa. No se guardaron cambios en el sistema.",
    );
  }, []);

  const headerAction =
    state === "no-plan" ? (
      <Button onClick={handlePreviewNewPlan} type="button">
        <Plus aria-hidden="true" />
        Crear plan
      </Button>
    ) : state === "required-action" ? (
      <PreviewActionLink href="/admin/configuracion" label="Configurar ciclo" />
    ) : (
      <Button
        disabled={state === "loading"}
        onClick={(event) => openAddEditor(event.currentTarget)}
        type="button"
      >
        <Plus aria-hidden="true" />
        {fixture.primaryAction}
      </Button>
    );

  return (
    <>
      <div
        aria-hidden={editor ? true : undefined}
        data-slot="schedules-screen"
        data-state={state}
      >
        <PageHeader
          action={headerAction}
          description={fixture.description}
          title="Horarios"
        />

        {state === "success" && (
          <InlineStateNotice
            description="La asignación está lista para revisión local. No se guardaron planes ni ocurrencias."
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            title="Vista previa actualizada"
            tone="success"
          />
        )}

        {announcement && (
          <div
            aria-live="polite"
            className="mt-6 flex items-start gap-3 rounded-md border border-info/30 bg-info-surface/60 p-4"
            role="status"
          >
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <p className="text-sm leading-6 text-foreground">{announcement}</p>
          </div>
        )}

        {state === "error" && stateFixture && (
          <InlineStateNotice
            action={
              <PreviewActionLink
                href="/admin/horarios"
                label={stateFixture.actionLabel ?? "Reintentar"}
              />
            }
            description={stateFixture.description}
            icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
            title={stateFixture.title}
            tone="danger"
          />
        )}

        {(state === "no-plan" || state === "required-action") && stateFixture && (
          <InlineStateNotice
            action={
              state === "no-plan" ? (
                <Button onClick={handlePreviewNewPlan} size="sm" type="button" variant="outline">
                  {stateFixture.actionLabel ?? "Crear plan"}
                </Button>
              ) : (
                <PreviewActionLink
                  href="/admin/configuracion"
                  label={stateFixture.actionLabel ?? "Configurar ciclo"}
                />
              )
            }
            description={stateFixture.description}
            icon={<Settings2 aria-hidden="true" className="h-5 w-5" />}
            title={stateFixture.title}
            tone="warning"
          />
        )}

        {state !== "loading" && state !== "error" && state !== "no-plan" && state !== "required-action" && selectedPlan && (
          <>
            <PlanContext
              fixture={fixture}
              onNewPlan={handlePreviewNewPlan}
              onSelectPlan={(planId) => {
                setSelectedPlanId(planId);
                setSelectedAssignmentId(null);
                setAnnouncement(null);
              }}
              selectedPlan={selectedPlan}
              selectedPlanId={selectedPlanId}
            />

            {state === "conflict" && stateFixture && (
              <InlineStateNotice
                action={
                  <Button
                    onClick={(event) => {
                      const firstConflict = planAssignments.find((assignment) =>
                        conflictIds.has(assignment.id),
                      );
                      if (firstConflict) {
                        openEditEditor(firstConflict, event.currentTarget);
                      }
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {stateFixture.actionLabel ?? "Revisar conflicto"}
                  </Button>
                }
                description={stateFixture.description}
                icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
                title={stateFixture.title}
                tone="danger"
              />
            )}

            {isEmptyPlan ? (
              <div className="mt-4">
                <EmptyState
                  action={
                    <Button
                      onClick={(event) => openAddEditor(event.currentTarget)}
                      type="button"
                    >
                      <Plus aria-hidden="true" />
                      {stateFixture?.actionLabel ?? fixture.primaryAction}
                    </Button>
                  }
                  description={
                    stateFixture?.description ??
                    "Agregá una asignación para comenzar a organizar las guardias."
                  }
                  title={stateFixture?.title ?? fixture.emptyPlanLabel}
                />
              </div>
            ) : (
              <>
                <div className="hidden lg:block">
                  <ScheduleGrid
                    assignments={planAssignments}
                    conflictIds={conflictIds}
                    days={fixture.weekdays}
                    onEdit={openEditEditor}
                    selectedAssignmentId={selectedAssignmentId}
                    title="Grilla semanal"
                  />
                </div>
                <div className="hidden md:block lg:hidden">
                  <ScheduleGrid
                    assignments={planAssignments}
                    conflictIds={conflictIds}
                    days={fixture.weekdays.slice(0, 3)}
                    onEdit={openEditEditor}
                    selectedAssignmentId={selectedAssignmentId}
                    title="Grilla reducida"
                  />
                  <p className="mt-3 text-xs leading-5 text-foreground-muted">
                    La vista Medium muestra tres días a la vez; usá Compact para recorrer cada día.
                  </p>
                </div>
                <CompactSchedule
                  assignments={planAssignments}
                  conflictIds={conflictIds}
                  days={fixture.weekdays}
                  onAdd={(event) => openAddEditor(event.currentTarget)}
                  onEdit={openEditEditor}
                  onSelectDay={setSelectedDay}
                  selectedAssignmentId={selectedAssignmentId}
                  selectedDay={selectedDay}
                />
              </>
            )}
          </>
        )}

        {state === "loading" && <LoadingScheduleWorkspace />}
      </div>

      {selectedPlan && editor && (
        <AssignmentEditor
          assignment={editor?.assignment}
          fixture={fixture}
          initialDay={selectedDay}
          mode={editor?.mode ?? "add"}
          onClose={closeEditor}
          onSave={handleSaveAssignment}
          open
          plan={selectedPlan}
          tutors={tutors}
        />
      )}
    </>
  );
}
