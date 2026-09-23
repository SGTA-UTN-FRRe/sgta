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
import type {
  SafeScheduleAssignment,
  SafeSchedulePlan,
  SafeScheduleTutor,
  SafeScheduleWorkspace,
} from "@/features/schedules/schedule-service";
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
  initialErrorMessage?: string;
  state?: SchedulesScreenState;
  workspace: SafeScheduleWorkspace | null;
}

type AssignmentView = SafeScheduleAssignment & {
  day: string;
  date: string;
  start: string;
  end: string;
  tutor: string;
};

type AssignmentDraft = {
  assignmentDate: string | null;
  endMinutes: number;
  kind: SafeScheduleAssignment["kind"];
  modality: string | null;
  pattern: SafeScheduleAssignment["pattern"];
  startMinutes: number;
  tutorId: string;
  weekday: number | null;
};

type PlanDraft = {
  kind: SafeSchedulePlan["kind"];
  name: string;
  validFrom: string;
  validTo: string;
};

type EditorState =
  | { assignment?: AssignmentView; kind: "assignment"; mode: "add" | "edit" }
  | { kind: "plan" }
  | null;

type ScheduleValidationIssue = {
  message: string;
  path: Array<string | number>;
};

class ScheduleRequestError extends Error {
  readonly code: string;
  readonly issues: ScheduleValidationIssue[];
  readonly status: number;

  constructor(
    code: string,
    status: number,
    issues: ScheduleValidationIssue[] = [],
  ) {
    super(code);
    this.name = "ScheduleRequestError";
    this.code = code;
    this.issues = issues;
    this.status = status;
  }
}

const GRID_START_MINUTES = 8 * 60;
const GRID_END_MINUTES = 20 * 60;
const GRID_HOUR_HEIGHT_REM = 4;
const selectClassName =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");
const weekdayLabels = ["", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const stateDetails: Record<
  Exclude<SchedulesScreenState, "default" | "success">,
  { actionLabel?: string; description: string; title: string }
> = {
  conflict: {
    actionLabel: "Revisar conflicto",
    description: "Revisar las asignaciones señaladas antes de continuar.",
    title: "Hay asignaciones superpuestas",
  },
  empty: {
    actionLabel: "Agregar asignación",
    description: "Agregar una asignación para comenzar a organizar las guardias.",
    title: "Este horario todavía no tiene asignaciones.",
  },
  "empty-plan": {
    actionLabel: "Agregar asignación",
    description: "Agregar una asignación para comenzar a organizar las guardias.",
    title: "Este horario todavía no tiene asignaciones.",
  },
  error: {
    actionLabel: "Reintentar",
    description: "Reintentar para volver a consultar el plan seleccionado.",
    title: "No se pudo cargar el horario",
  },
  loading: {
    description: "Estamos preparando el plan y sus asignaciones.",
    title: "Cargando horarios",
  },
  "no-plan": {
    actionLabel: "Crear plan",
    description: "Crear o activar un plan para comenzar a organizar las guardias.",
    title: "No hay un plan de horario activo",
  },
  "required-action": {
    actionLabel: "Configurar ciclo",
    description: "Abrir un ciclo administrativo para comenzar a organizar las guardias.",
    title: "Abrir un ciclo para gestionar horarios",
  },
};

const scheduleErrorMessages: Record<string, string> = {
  assignment_conflict:
    "La asignación se superpone con otra guardia del mismo tutor.",
  assignment_date_outside_plan:
    "La fecha de la asignación debe pertenecer a la vigencia del plan.",
  assignment_not_found:
    "La asignación ya no está disponible. Actualizar el horario e intentar nuevamente.",
  cycle_not_open: "El ciclo seleccionado ya no está abierto.",
  date_outside_cycle: "La fecha debe pertenecer al ciclo administrativo vigente.",
  inactive_tutor: "El tutor seleccionado ya no está activo.",
  internal_server_error: "No se pudo guardar el cambio. Intentar nuevamente.",
  invalid_request: "Revisar los datos ingresados antes de guardar.",
  open_cycle_required: "Abrir un ciclo administrativo antes de gestionar horarios.",
  plan_has_occurrences:
    "El plan conserva ocurrencias históricas y no puede reducir su vigencia.",
  plan_not_found:
    "El plan ya no está disponible. Actualizar el horario e intentar nuevamente.",
  plan_validity_outside_cycle:
    "La vigencia del plan debe estar contenida en el ciclo administrativo.",
  regular_plan_conflict: "Ya existe otro plan regular activo para este ciclo.",
  special_plan_overlap:
    "La vigencia del plan especial se superpone con otro plan especial activo.",
  status_already_set: "El registro ya tiene el estado solicitado.",
  tutor_not_in_cycle: "El tutor seleccionado no pertenece al ciclo vigente.",
  unauthorized: "La sesión expiró. Volver a iniciar sesión para continuar.",
};

function getErrorCode(body: unknown) {
  if (typeof body === "object" && body !== null && "error" in body) {
    const code = (body as { error?: unknown }).error;

    if (typeof code === "string") {
      return code;
    }
  }

  return "internal_server_error";
}

function getErrorIssues(body: unknown) {
  if (typeof body !== "object" || body === null || !("issues" in body)) {
    return [];
  }

  const issues = (body as { issues?: unknown }).issues;

  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.filter(
    (issue): issue is ScheduleValidationIssue =>
      typeof issue === "object" &&
      issue !== null &&
      "path" in issue &&
      Array.isArray((issue as { path?: unknown }).path) &&
      "message" in issue &&
      typeof (issue as { message?: unknown }).message === "string",
  );
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  let response: Response;

  try {
    response = await fetch(input, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ScheduleRequestError("internal_server_error", 500);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ScheduleRequestError(
      getErrorCode(body),
      response.status,
      getErrorIssues(body),
    );
  }

  return body as T;
}

function getScheduleErrorMessage(error: unknown) {
  if (error instanceof ScheduleRequestError) {
    return scheduleErrorMessages[error.code] ?? scheduleErrorMessages.internal_server_error;
  }

  return scheduleErrorMessages.internal_server_error;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const remainder = (minutes % 60).toString().padStart(2, "0");

  return `${hours}:${remainder}`;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return Number.NaN;
  }

  return hours * 60 + minutes;
}

function getIsoWeekday(date: string) {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();

  return weekday === 0 ? 7 : weekday;
}

function dateForWeekday(startDate: string, endDate: string, weekday: number) {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  const offset = (weekday - getIsoWeekday(startDate) + 7) % 7;
  date.setUTCDate(date.getUTCDate() + offset);
  const result = date.toISOString().slice(0, 10);

  return result <= endDate ? result : startDate;
}

function toAssignmentView(
  assignment: SafeScheduleAssignment,
  plan: SafeSchedulePlan,
): AssignmentView {
  const date =
    assignment.assignmentDate ??
    dateForWeekday(
      plan.validFrom,
      plan.validTo,
      assignment.weekday ?? 1,
    );
  const weekday = assignment.weekday ?? getIsoWeekday(date);

  return {
    ...assignment,
    day: weekdayLabels[weekday] ?? "",
    date,
    end: formatMinutes(assignment.endMinutes),
    start: formatMinutes(assignment.startMinutes),
    tutor: assignment.tutorName,
  };
}

function formatTutorCount(count: number) {
  return `${count} ${count === 1 ? "asignación" : "asignaciones"}`;
}

function formatAssignmentLabel(assignment: AssignmentView) {
  return `${assignment.tutor}, ${assignment.day}, ${assignment.start} a ${assignment.end}`;
}

function planStatusVariant(plan: SafeSchedulePlan): StatusBadgeVariant {
  return plan.status === "ACTIVE" ? "success" : "neutral";
}

function deriveWorkspaceState(
  workspace: SafeScheduleWorkspace | null,
): SchedulesScreenState {
  if (workspace === null) {
    return "error";
  }

  if (workspace.conflicts.length > 0) {
    return "conflict";
  }

  if (workspace.plans.length === 0) {
    return "no-plan";
  }

  if (workspace.assignments.length === 0) {
    return "empty-plan";
  }

  return "default";
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
      className={cn("mt-6 flex items-start gap-3 rounded-md border p-4", styles[tone])}
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
            <span className="h-24 border-b border-r border-border-subtle bg-surface-subtle/30" key={key} />
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

function PlanContext({
  isMutating,
  onNewPlan,
  onSelectPlan,
  onTogglePlanStatus,
  plans,
  selectedPlan,
  selectedPlanId,
  workspace,
}: {
  isMutating: boolean;
  onNewPlan: (event: MouseEvent<HTMLButtonElement>) => void;
  onSelectPlan: (planId: string) => void;
  onTogglePlanStatus: () => Promise<void>;
  plans: SafeSchedulePlan[];
  selectedPlan: SafeSchedulePlan;
  selectedPlanId: string;
  workspace: SafeScheduleWorkspace;
}) {
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
              label={selectedPlan.status === "ACTIVE" ? "Activo" : "Inactivo"}
              variant={planStatusVariant(selectedPlan)}
            />
            <StatusBadge
              label={selectedPlan.kind === "REGULAR" ? "Regular" : "Especial"}
              variant="info"
            />
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Ciclo vigente</dt>
              <dd className="mt-1 font-semibold text-foreground">{workspace.currentCycle.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Tipo de plan</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {selectedPlan.kind === "REGULAR" ? "Regular" : "Especial"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Vigencia</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {formatDate(selectedPlan.validFrom)} — {formatDate(selectedPlan.validTo)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Fecha efectiva consultada</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {formatDate(workspace.effective.date)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap gap-2 self-start sm:self-center">
          <Button disabled={isMutating} onClick={onTogglePlanStatus} type="button" variant="outline">
            {selectedPlan.status === "ACTIVE" ? "Desactivar plan" : "Activar plan"}
          </Button>
          <Button disabled={isMutating} onClick={onNewPlan} type="button" variant="outline">
            <Plus aria-hidden="true" />
            Nuevo plan
          </Button>
        </div>
      </div>

      <div className="mt-5 border-t border-border-subtle pt-4">
        <p className="text-xs font-semibold text-foreground-secondary">Seleccionar plan</p>
        <div
          aria-label="Planes de horario"
          className="mt-3 grid gap-2 md:grid-cols-2"
          role="group"
        >
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-12 items-center justify-between gap-3 rounded-sm border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-surface text-foreground-secondary hover:bg-surface-subtle",
                )}
                disabled={isMutating}
                key={plan.id}
                onClick={() => onSelectPlan(plan.id)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{plan.name}</span>
                  <span className="mt-1 block text-xs text-foreground-muted">
                    {formatDate(plan.validFrom)} — {formatDate(plan.validTo)}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold">
                  {isSelected ? "Seleccionado" : plan.kind === "REGULAR" ? "Regular" : "Especial"}
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
  assignment: AssignmentView;
  conflict: boolean;
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
  selected: boolean;
}) {
  const start = Math.max(GRID_START_MINUTES, assignment.startMinutes);
  const end = Math.min(GRID_END_MINUTES, assignment.endMinutes);
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
      data-schedule-assignment-id={assignment.id}
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
        {assignment.modality ?? "Sin modalidad"}
      </span>
      {assignment.kind === "RECOVERY" && (
        <StatusBadge className="mt-auto" label="Recuperación" variant="faro" />
      )}
      {conflict && <StatusBadge className="mt-auto" label="Conflicto" variant="danger" />}
      {selected && !conflict && assignment.kind !== "RECOVERY" && (
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
  assignments: AssignmentView[];
  conflictIds: Set<string>;
  day: string;
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
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
  assignments: AssignmentView[];
  conflictIds: Set<string>;
  days: string[];
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
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
            Seleccionar un bloque para editarlo y guardarlo en el sistema.
          </p>
        </div>
        <span className="text-xs text-foreground-muted">{formatTutorCount(assignments.length)}</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border bg-surface">
        <div
          aria-label={title}
          className="grid min-w-[40rem]"
          role="group"
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
  assignments: AssignmentView[];
  conflictIds: Set<string>;
  days: string[];
  onAdd: (event: MouseEvent<HTMLButtonElement>) => void;
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
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
            Seleccionar un día para revisar y editar sus asignaciones.
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
        role="group"
      >
        {days.map((day) => (
          <button
            aria-pressed={day === selectedDay}
            className={cn(
              "min-h-10 rounded-sm px-1 text-xs font-bold tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
              day === selectedDay
                ? "bg-primary text-primary-foreground"
                : "text-foreground-secondary hover:bg-surface-subtle",
            )}
            key={day}
            onClick={() => onSelectDay(day)}
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
            Agregar una asignación para completar este día del plan.
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
                data-schedule-assignment-id={assignment.id}
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
                    {assignment.modality ?? "Sin modalidad"}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                  {hasConflict && <StatusBadge label="Conflicto" variant="danger" />}
                  {assignment.kind === "RECOVERY" && (
                    <StatusBadge label="Recuperación" variant="faro" />
                  )}
                  {isSelected && !hasConflict && (
                    <span className="text-xs font-semibold text-info">Seleccionada</span>
                  )}
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

function PlanEditor({
  cycle,
  onClose,
  onSave,
  open,
}: {
  cycle: SafeScheduleWorkspace["currentCycle"];
  onClose: () => void;
  onSave: (draft: PlanDraft) => Promise<void>;
  open: boolean;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SafeSchedulePlan["kind"]>("SPECIAL");
  const [validFrom, setValidFrom] = useState(cycle.startDate);
  const [validTo, setValidTo] = useState(cycle.endDate);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useOverlayFocus({
    initialFocusRef: closeButtonRef,
    onClose,
    open,
    panelRef,
  });

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !validFrom || !validTo) {
      setError("Completar nombre y vigencia para continuar.");
      return;
    }

    if (validFrom > validTo) {
      setError("La fecha final debe ser posterior o igual a la fecha inicial.");
      return;
    }

    setSaving(true);

    try {
      await onSave({ kind, name: name.trim(), validFrom, validTo });
    } catch (saveError) {
      setError(getScheduleErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      aria-label="Cerrar nuevo plan"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-brand-navy/30 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby="plan-editor-description"
        aria-labelledby="plan-editor-title"
        aria-modal="true"
        className="flex h-full max-h-[100svh] w-full flex-col border-border bg-surface shadow-2xl sm:h-auto sm:max-h-[calc(100svh-3rem)] sm:max-w-[42rem] sm:rounded-md sm:border"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Nuevo plan</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground" id="plan-editor-title">
              Crear plan de horario
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground-secondary" id="plan-editor-description">
              La vigencia debe pertenecer al ciclo {cycle.name}.
            </p>
          </div>
          <button
            aria-label="Cerrar nuevo plan"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {error && (
              <div aria-live="assertive" className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-surface/60 p-4" role="alert">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                <p className="text-sm leading-6 text-foreground">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="schedule-plan-name">
                Nombre
              </label>
              <Input
                id="schedule-plan-name"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="schedule-plan-kind">
                Tipo de plan
              </label>
              <select
                className={selectClassName}
                id="schedule-plan-kind"
                onChange={(event) => setKind(event.target.value as SafeSchedulePlan["kind"])}
                value={kind}
              >
                <option value="REGULAR">Regular</option>
                <option value="SPECIAL">Especial</option>
              </select>
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-foreground">Vigencia</legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="schedule-plan-valid-from">
                    Desde
                  </label>
                  <Input
                    id="schedule-plan-valid-from"
                    max={cycle.endDate}
                    min={cycle.startDate}
                    onChange={(event) => setValidFrom(event.target.value)}
                    required
                    type="date"
                    value={validFrom}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="schedule-plan-valid-to">
                    Hasta
                  </label>
                  <Input
                    id="schedule-plan-valid-to"
                    max={cycle.endDate}
                    min={cycle.startDate}
                    onChange={(event) => setValidTo(event.target.value)}
                    required
                    type="date"
                    value={validTo}
                  />
                </div>
              </div>
            </fieldset>
          </div>

          <div className="border-t border-border bg-surface px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button disabled={saving} onClick={onClose} type="button" variant="outline">
                Cancelar
              </Button>
              <Button disabled={saving} type="submit">
                <Check aria-hidden="true" />
                {saving ? "Guardando..." : "Guardar plan"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignmentEditor({
  assignment,
  initialDay,
  mode,
  onClose,
  onSave,
  onStatusChange,
  open,
  plan,
  tutors,
}: {
  assignment?: AssignmentView;
  initialDay: string;
  mode: "add" | "edit";
  onClose: () => void;
  onSave: (draft: AssignmentDraft, originalId?: string) => Promise<void>;
  onStatusChange: () => Promise<void>;
  open: boolean;
  plan: SafeSchedulePlan;
  tutors: SafeScheduleTutor[];
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const initialWeekday = assignment?.weekday ?? Math.max(1, ["LUN", "MAR", "MIÉ", "JUE", "VIE"].indexOf(initialDay) + 1);
  const [tutorId, setTutorId] = useState(assignment?.tutorId ?? tutors[0]?.id ?? "");
  const [pattern, setPattern] = useState<SafeScheduleAssignment["pattern"]>(assignment?.pattern ?? "WEEKDAY");
  const [weekday, setWeekday] = useState(String(initialWeekday));
  const [assignmentDate, setAssignmentDate] = useState(
    assignment?.assignmentDate ?? assignment?.date ?? plan.validFrom,
  );
  const [start, setStart] = useState(formatMinutes(assignment?.startMinutes ?? 8 * 60));
  const [end, setEnd] = useState(formatMinutes(assignment?.endMinutes ?? 10 * 60));
  const [kind, setKind] = useState<SafeScheduleAssignment["kind"]>(assignment?.kind ?? "DUTY");
  const [modality, setModality] = useState(assignment?.modality ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  useOverlayFocus({
    initialFocusRef: closeButtonRef,
    onClose,
    open,
    panelRef,
  });

  if (!open) {
    return null;
  }

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
          modality: modality.trim() || null,
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

  async function handleStatusChange() {
    setError(null);
    setChangingStatus(true);

    try {
      await onStatusChange();
    } catch (statusError) {
      setError(getScheduleErrorMessage(statusError));
    } finally {
      setChangingStatus(false);
    }
  }

  const summary = `${tutors.find((tutor) => tutor.id === tutorId)?.formalName ?? "Sin tutor"} · ${
    pattern === "WEEKDAY" ? weekdayLabels[Number(weekday)] ?? "Sin día" : formatDate(assignmentDate)
  } · ${start || "--:--"} — ${end || "--:--"}`;

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
              {mode === "add" ? "Nueva asignación" : "Asignación persistida"}
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground" id="assignment-editor-title">
              {mode === "add" ? "Agregar asignación" : "Editar asignación"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground-secondary" id="assignment-editor-description">
              Los cambios se validan y guardan en el sistema para el plan seleccionado.
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
                {plan.kind === "REGULAR" ? "Regular" : "Especial"} · Vigencia {formatDate(plan.validFrom)} — {formatDate(plan.validTo)}
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
                disabled={saving || changingStatus || tutors.length === 0}
                id="assignment-tutor"
                onChange={(event) => setTutorId(event.target.value)}
                required
                value={tutorId}
              >
                {tutors.length === 0 && <option value="">No hay tutores elegibles</option>}
                {tutors.map((tutor) => (
                  <option key={tutor.id} value={tutor.id}>
                    {tutor.formalName} · {tutor.careerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="assignment-pattern">
                Repetición
              </label>
              <select
                className={selectClassName}
                disabled={saving || changingStatus}
                id="assignment-pattern"
                onChange={(event) => setPattern(event.target.value as SafeScheduleAssignment["pattern"])}
                value={pattern}
              >
                <option value="WEEKDAY">Día de la semana</option>
                <option value="DATE">Fecha específica</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground" htmlFor="assignment-day">
                  Día
                </label>
                <select
                  className={selectClassName}
                  disabled={saving || changingStatus || pattern === "DATE"}
                  id="assignment-day"
                  onChange={(event) => setWeekday(event.target.value)}
                  required={pattern === "WEEKDAY"}
                  value={weekday}
                >
                  {weekdayLabels.slice(1).map((day, index) => (
                    <option key={day} value={index + 1}>
                      {day}
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
                    disabled={saving || changingStatus || pattern === "WEEKDAY"}
                    id="assignment-date"
                    max={plan.validTo}
                    min={plan.validFrom}
                    onChange={(event) => setAssignmentDate(event.target.value)}
                    required={pattern === "DATE"}
                    type="date"
                    value={assignmentDate}
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
                  <Input disabled={saving || changingStatus} id="assignment-start" onChange={(event) => setStart(event.target.value)} required type="time" value={start} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="assignment-end">
                    Fin
                  </label>
                  <Input disabled={saving || changingStatus} id="assignment-end" onChange={(event) => setEnd(event.target.value)} required type="time" value={end} />
                </div>
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="assignment-kind">
                Tipo de asignación
              </label>
              <select
                className={selectClassName}
                disabled={saving || changingStatus}
                id="assignment-kind"
                onChange={(event) => setKind(event.target.value as SafeScheduleAssignment["kind"])}
                value={kind}
              >
                <option value="DUTY">Guardia</option>
                <option value="RECOVERY">Recuperación</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="assignment-modality">
                Modalidad
              </label>
              <Input disabled={saving || changingStatus} id="assignment-modality" onChange={(event) => setModality(event.target.value)} value={modality} />
            </div>

            <section aria-labelledby="assignment-summary-heading" className="rounded-md border border-info/30 bg-info-surface/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-info" id="assignment-summary-heading">
                Resumen de asignación
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{summary}</p>
              <p className="mt-2 text-xs leading-5 text-foreground-secondary">
                La validación del servidor conserva la vigencia, elegibilidad y conflictos del plan.
              </p>
            </section>
          </div>

          <div className="border-t border-border bg-surface px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              {assignment ? (
                <Button
                  disabled={saving || changingStatus}
                  onClick={handleStatusChange}
                  type="button"
                  variant="ghost"
                >
                  {assignment.status === "ACTIVE" ? "Desactivar asignación" : "Activar asignación"}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button disabled={saving || changingStatus} onClick={onClose} type="button" variant="outline">
                  Cancelar
                </Button>
                <Button disabled={saving || changingStatus} type="submit">
                  <Check aria-hidden="true" />
                  {saving ? "Guardando..." : "Guardar asignación"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
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

export function SchedulesScreen({
  initialErrorMessage,
  state = "default",
  workspace: initialWorkspace,
}: SchedulesScreenProps) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [viewState, setViewState] = useState<SchedulesScreenState>(state);
  const [selectedPlanId, setSelectedPlanId] = useState(
    () => initialWorkspace?.selectedPlan?.id ?? initialWorkspace?.plans.find((plan) => plan.status === "ACTIVE")?.id ?? "",
  );
  const [selectedDay, setSelectedDay] = useState("LUN");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage ?? "");
  const [isMutating, setIsMutating] = useState(false);
  const editorTriggerRef = useRef<HTMLElement | null>(null);
  const editorTriggerAssignmentIdRef = useRef<string | null>(null);
  const planEditorTriggerRef = useRef<HTMLElement | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- rehydrate client state after server navigation changes the initial workspace. */
  useEffect(() => {
    setWorkspace(initialWorkspace);
    setViewState(state);
    setErrorMessage(initialErrorMessage ?? "");
    setSelectedPlanId(
      initialWorkspace?.selectedPlan?.id ??
        initialWorkspace?.plans.find((plan) => plan.status === "ACTIVE")?.id ??
        "",
    );
    setSelectedAssignmentId(null);
    setEditor(null);
  }, [initialErrorMessage, initialWorkspace, state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedPlan = useMemo(
    () => workspace?.plans.find((plan) => plan.id === selectedPlanId) ?? workspace?.selectedPlan ?? null,
    [selectedPlanId, workspace],
  );
  const planAssignments = useMemo(
    () =>
      workspace && selectedPlan
        ? workspace.assignments
            .filter((assignment) => assignment.planId === selectedPlan.id)
            .map((assignment) => toAssignmentView(assignment, selectedPlan))
        : [],
    [selectedPlan, workspace],
  );
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();

    for (const conflict of workspace?.conflicts ?? []) {
      ids.add(conflict.assignmentId);
      for (const conflictingId of conflict.conflictingAssignmentIds) {
        ids.add(conflictingId);
      }
    }

    return ids;
  }, [workspace?.conflicts]);
  const currentState = isMutating ? "loading" : viewState;
  const stateDetail = currentState === "default" || currentState === "success"
    ? undefined
    : stateDetails[currentState];
  const isEmptyPlan =
    currentState === "empty" ||
    currentState === "empty-plan" ||
    (selectedPlan !== null && planAssignments.length === 0);

  const closeEditor = useCallback(() => {
    setEditor(null);
    const trigger = editorTriggerRef.current;
    const assignmentId = editorTriggerAssignmentIdRef.current;

    const restoreFocus = () => {
      if (trigger?.isConnected) {
        trigger.focus();
      } else if (assignmentId) {
        document
          .querySelector<HTMLElement>(
            `[data-schedule-assignment-id="${assignmentId}"]`,
          )
          ?.focus();
      }
    };

    restoreFocus();
    window.requestAnimationFrame(() => {
      restoreFocus();
      editorTriggerRef.current = null;
      editorTriggerAssignmentIdRef.current = null;
    });
  }, []);

  const closePlanEditor = useCallback(() => {
    setEditor(null);
    const trigger = planEditorTriggerRef.current;

    if (trigger?.isConnected) {
      trigger.focus();
      window.requestAnimationFrame(() => {
        trigger.focus();
        planEditorTriggerRef.current = null;
      });
    }
  }, []);

  const loadWorkspace = useCallback(
    async (planId?: string) => {
      if (!workspace) {
        throw new ScheduleRequestError("open_cycle_required", 409);
      }

      const params = new URLSearchParams({ cycleId: workspace.currentCycle.id });
      params.set("date", workspace.requestedDate ?? workspace.effective.date);
      if (planId) {
        params.set("planId", planId);
      }

      return requestJson<SafeScheduleWorkspace>(`/api/admin/schedules?${params.toString()}`);
    },
    [workspace],
  );

  const refreshWorkspace = useCallback(
    async (planId?: string) => {
      setIsMutating(true);
      setViewState("loading");
      setErrorMessage("");

      try {
        const nextWorkspace = await loadWorkspace(planId ?? selectedPlanId);
        setWorkspace(nextWorkspace);
        setSelectedPlanId(nextWorkspace.selectedPlan?.id ?? planId ?? "");
        setViewState(deriveWorkspaceState(nextWorkspace));
        return nextWorkspace;
      } catch (error) {
        setViewState("error");
        setErrorMessage(getScheduleErrorMessage(error));
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [loadWorkspace, selectedPlanId],
  );

  const selectPlan = useCallback(
    async (planId: string) => {
      if (planId === selectedPlanId || isMutating) {
        return;
      }

      setSelectedAssignmentId(null);
      setAnnouncement(null);

      try {
        await refreshWorkspace(planId);
      } catch {
        // The error notice preserves the previous workspace and selected plan context.
      }
    },
    [isMutating, refreshWorkspace, selectedPlanId],
  );

  const openAddEditor = useCallback(
    (trigger: HTMLElement) => {
      if (!selectedPlan || isMutating) {
        return;
      }

      editorTriggerRef.current = trigger;
      editorTriggerAssignmentIdRef.current = null;
      setSelectedAssignmentId(null);
      setEditor({ kind: "assignment", mode: "add" });
    },
    [isMutating, selectedPlan],
  );

  const openEditEditor = useCallback(
    (assignment: AssignmentView, trigger: HTMLElement) => {
      editorTriggerRef.current = trigger;
      editorTriggerAssignmentIdRef.current = assignment.id;
      setSelectedDay(assignment.day);
      setSelectedAssignmentId(assignment.id);
      setEditor({ assignment, kind: "assignment", mode: "edit" });
    },
    [],
  );

  const openPlanEditor = useCallback((trigger: HTMLElement) => {
    planEditorTriggerRef.current = trigger;
    setEditor({ kind: "plan" });
  }, []);

  const savePlan = useCallback(
    async (draft: PlanDraft) => {
      if (!workspace) {
        throw new ScheduleRequestError("open_cycle_required", 409);
      }

      setIsMutating(true);
      setErrorMessage("");

      try {
        const response = await requestJson<{ plan: SafeSchedulePlan }>("/api/admin/schedules/plans", {
          body: JSON.stringify({ ...draft, cycleId: workspace.currentCycle.id, status: "ACTIVE" }),
          method: "POST",
        });
        await refreshWorkspace(response.plan.id);
        setSelectedPlanId(response.plan.id);
        setViewState("success");
        setAnnouncement("El plan se guardó correctamente.");
        closePlanEditor();
      } catch (error) {
        setErrorMessage(getScheduleErrorMessage(error));
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [closePlanEditor, refreshWorkspace, workspace],
  );

  const saveAssignment = useCallback(
    async (draft: AssignmentDraft, originalId?: string) => {
      if (!workspace || !selectedPlan) {
        throw new ScheduleRequestError("plan_not_found", 404);
      }

      setIsMutating(true);
      setErrorMessage("");

      try {
        const path = originalId
          ? `/api/admin/schedules/assignments/${originalId}`
          : "/api/admin/schedules/assignments";
        const response = await requestJson<{ assignment: SafeScheduleAssignment }>(path, {
          body: JSON.stringify(
            originalId
              ? draft
              : {
                  ...draft,
                  planId: selectedPlan.id,
                },
          ),
          method: originalId ? "PATCH" : "POST",
        });
        await refreshWorkspace(selectedPlan.id);
        setSelectedAssignmentId(response.assignment.id);
        setViewState("success");
        setAnnouncement("La asignación se guardó correctamente.");
        closeEditor();
      } catch (error) {
        setErrorMessage(getScheduleErrorMessage(error));
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [closeEditor, refreshWorkspace, selectedPlan, workspace],
  );

  const toggleAssignmentStatus = useCallback(
    async (assignment: AssignmentView) => {
      setIsMutating(true);
      setErrorMessage("");

      try {
        await requestJson<{ assignment: SafeScheduleAssignment }>(
          `/api/admin/schedules/assignments/${assignment.id}/status`,
          {
            body: JSON.stringify({
              status: assignment.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            }),
            method: "PATCH",
          },
        );
        await refreshWorkspace(selectedPlan?.id);
        setViewState("success");
        setAnnouncement("El estado de la asignación se actualizó correctamente.");
        closeEditor();
      } catch (error) {
        setErrorMessage(getScheduleErrorMessage(error));
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [closeEditor, refreshWorkspace, selectedPlan],
  );

  const togglePlanStatus = useCallback(async () => {
    if (!selectedPlan) {
      return;
    }

    setIsMutating(true);
    setErrorMessage("");

    try {
      await requestJson<{ plan: SafeSchedulePlan }>(
        `/api/admin/schedules/plans/${selectedPlan.id}/status`,
        {
          body: JSON.stringify({ status: selectedPlan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
          method: "PATCH",
        },
      );
      await refreshWorkspace(selectedPlan.id);
      setViewState("success");
      setAnnouncement("El estado del plan se actualizó correctamente.");
    } catch (error) {
      setErrorMessage(getScheduleErrorMessage(error));
      setViewState("error");
    } finally {
      setIsMutating(false);
    }
  }, [refreshWorkspace, selectedPlan]);

  const headerAction =
    currentState === "no-plan" ? (
      workspace ? (
        <Button disabled={isMutating} onClick={(event) => openPlanEditor(event.currentTarget)} type="button">
          <Plus aria-hidden="true" />
          Crear plan
        </Button>
      ) : (
        <PreviewActionLink href="/admin/settings" label="Configurar ciclo" />
      )
    ) : currentState === "required-action" ? (
      <PreviewActionLink href="/admin/settings" label="Configurar ciclo" />
    ) : (
      <Button
        disabled={isMutating || !selectedPlan}
        onClick={(event) => openAddEditor(event.currentTarget)}
        type="button"
      >
        <Plus aria-hidden="true" />
        Agregar asignación
      </Button>
    );

  return (
    <>
      <div
        aria-hidden={editor ? true : undefined}
        data-slot="schedules-screen"
        data-state={currentState}
      >
        <PageHeader
          action={headerAction}
          description="Planificar guardias regulares y períodos especiales."
          title="Horarios"
        />

        {currentState === "success" && (
          <InlineStateNotice
            description={announcement ?? "Los cambios se guardaron correctamente."}
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            title="Cambios guardados"
            tone="success"
          />
        )}

        {announcement && currentState !== "success" && (
          <div aria-live="polite" className="mt-6 flex items-start gap-3 rounded-md border border-info/30 bg-info-surface/60 p-4" role="status">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <p className="text-sm leading-6 text-foreground">{announcement}</p>
          </div>
        )}

        {currentState === "error" && stateDetail && (
          <InlineStateNotice
            action={
              workspace ? (
                <Button onClick={() => void refreshWorkspace(selectedPlanId)} size="sm" type="button" variant="outline">
                  {stateDetail.actionLabel ?? "Reintentar"}
                </Button>
              ) : (
                <PreviewActionLink href="/admin/schedules" label={stateDetail.actionLabel ?? "Reintentar"} />
              )
            }
            description={errorMessage || stateDetail.description}
            icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
            title={stateDetail.title}
            tone="danger"
          />
        )}

        {(currentState === "no-plan" || currentState === "required-action") && stateDetail && (
          <InlineStateNotice
            action={
              currentState === "no-plan" && workspace ? (
                <Button onClick={(event) => openPlanEditor(event.currentTarget)} size="sm" type="button" variant="outline">
                  {stateDetail.actionLabel ?? "Crear plan"}
                </Button>
              ) : (
                <PreviewActionLink href="/admin/settings" label={stateDetail.actionLabel ?? "Configurar ciclo"} />
              )
            }
            description={stateDetail.description}
            icon={<Settings2 aria-hidden="true" className="h-5 w-5" />}
            title={stateDetail.title}
            tone="warning"
          />
        )}

        {currentState === "loading" && <LoadingScheduleWorkspace />}

        {workspace && currentState !== "loading" && currentState !== "no-plan" && currentState !== "required-action" && selectedPlan && (
          <>
            <PlanContext
              isMutating={isMutating}
              onNewPlan={(event) => openPlanEditor(event.currentTarget)}
              onSelectPlan={(planId) => void selectPlan(planId)}
              onTogglePlanStatus={togglePlanStatus}
              plans={workspace.plans}
              selectedPlan={selectedPlan}
              selectedPlanId={selectedPlan.id}
              workspace={workspace}
            />

            {currentState === "conflict" && stateDetail && (
              <InlineStateNotice
                action={
                  <Button
                    onClick={(event) => {
                      const firstConflict = planAssignments.find((assignment) => conflictIds.has(assignment.id));
                      if (firstConflict) {
                        openEditEditor(firstConflict, event.currentTarget);
                      }
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {stateDetail.actionLabel ?? "Revisar conflicto"}
                  </Button>
                }
                description={
                  workspace.conflicts
                    .map((conflict) => `Asignación ${conflict.assignmentId.slice(0, 8)} en conflicto con ${conflict.conflictingAssignmentIds.length} registro(s).`)
                    .join(" ") || stateDetail.description
                }
                icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
                title={stateDetail.title}
                tone="danger"
              />
            )}

            {isEmptyPlan ? (
              <div className="mt-4">
                <EmptyState
                  action={
                    <Button onClick={(event) => openAddEditor(event.currentTarget)} type="button">
                      <Plus aria-hidden="true" />
                      Agregar asignación
                    </Button>
                  }
                  description="Agregar una asignación para comenzar a organizar las guardias."
                  title="Este horario todavía no tiene asignaciones."
                />
              </div>
            ) : (
              <>
                <div className="hidden lg:block">
                  <ScheduleGrid
                    assignments={planAssignments}
                    conflictIds={conflictIds}
                    days={["LUN", "MAR", "MIÉ", "JUE", "VIE"]}
                    onEdit={openEditEditor}
                    selectedAssignmentId={selectedAssignmentId}
                    title="Grilla semanal"
                  />
                </div>
                <div className="hidden md:block lg:hidden">
                  <ScheduleGrid
                    assignments={planAssignments}
                    conflictIds={conflictIds}
                    days={["LUN", "MAR", "MIÉ"]}
                    onEdit={openEditEditor}
                    selectedAssignmentId={selectedAssignmentId}
                    title="Grilla reducida"
                  />
                  <p className="mt-3 text-xs leading-5 text-foreground-muted">
                    La vista Medium muestra tres días a la vez; utilizar Compact para recorrer cada día.
                  </p>
                </div>
                <CompactSchedule
                  assignments={planAssignments}
                  conflictIds={conflictIds}
                  days={["LUN", "MAR", "MIÉ", "JUE", "VIE"]}
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
      </div>

      {workspace && editor?.kind === "plan" && (
        <PlanEditor
          cycle={workspace.currentCycle}
          onClose={closePlanEditor}
          onSave={savePlan}
          open
        />
      )}

      {workspace && selectedPlan && editor?.kind === "assignment" && (
        <AssignmentEditor
          assignment={editor.assignment}
          initialDay={selectedDay}
          key={`${editor.mode}:${editor.assignment?.id ?? "new"}:${selectedPlan.id}`}
          mode={editor.mode}
          onClose={closeEditor}
          onSave={saveAssignment}
          onStatusChange={() =>
            editor.assignment
              ? toggleAssignmentStatus(editor.assignment)
              : Promise.resolve()
          }
          open
          plan={selectedPlan}
          tutors={workspace.eligibleTutors}
        />
      )}
    </>
  );
}
