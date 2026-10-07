"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Edit3,
  History,
  Plus,
  RotateCcw,
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
  useId,
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
import {
  layoutDayAssignments,
  SCHEDULE_GRID_END_MINUTES,
  SCHEDULE_GRID_HOUR_HEIGHT_REM,
  SCHEDULE_GRID_MIN_DAY_WIDTH_REM,
  SCHEDULE_GRID_MIN_LANE_WIDTH_REM,
  SCHEDULE_GRID_START_MINUTES,
  type LaidOutScheduleAssignment,
} from "@/features/schedules/schedule-layout";
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

  const activePlans = workspace.plans.filter((plan) => plan.status === "ACTIVE");

  if (activePlans.length === 0) {
    return "no-plan";
  }

  if (
    workspace.assignments.filter(
      (assignment) => assignment.status === "ACTIVE",
    ).length === 0
  ) {
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
  onArchivePlan,
  onNewPlan,
  onOpenArchive,
  onSelectPlan,
  plans,
  selectedPlan,
  selectedPlanId,
  workspace,
}: {
  isMutating: boolean;
  onArchivePlan: () => void;
  onNewPlan: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpenArchive: () => void;
  onSelectPlan: (planId: string) => void;
  plans: SafeSchedulePlan[];
  selectedPlan: SafeSchedulePlan;
  selectedPlanId: string;
  workspace: SafeScheduleWorkspace;
}) {
  return (
    <section
      aria-labelledby="schedule-plan-context-title"
      className="mt-4 rounded-md border border-border bg-surface p-3 sm:mt-6 sm:p-5"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between xl:gap-5">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            Contexto del plan
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2
              className="text-base font-bold tracking-tight text-foreground sm:text-lg"
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
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:mt-4 sm:gap-3 sm:text-sm lg:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-foreground-muted">Ciclo vigente</dt>
              <dd className="mt-1 break-words font-semibold text-foreground">
                {workspace.currentCycle.name}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-foreground-muted">Vigencia</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {formatDate(selectedPlan.validFrom)} — {formatDate(selectedPlan.validTo)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-foreground-muted">Fecha de referencia</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {formatDate(workspace.effective.date)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap gap-2 self-start sm:self-center">
          <Button disabled={isMutating} onClick={onArchivePlan} type="button" variant="outline">
            <Archive aria-hidden="true" />
            Archivar plan
          </Button>
          <Button disabled={isMutating} onClick={onOpenArchive} type="button" variant="outline">
            <History aria-hidden="true" />
            Archivo de planes
          </Button>
          <Button disabled={isMutating} onClick={onNewPlan} type="button" variant="outline">
            <Plus aria-hidden="true" />
            Nuevo plan
          </Button>
        </div>
      </div>

      <div className="mt-3 border-t border-border-subtle pt-3 sm:mt-5 sm:pt-4">
        <p className="text-xs font-semibold text-foreground-secondary">Seleccionar plan</p>
        <div
          aria-label="Planes de horario"
          className={cn(
            "mt-2 grid gap-2 sm:mt-3",
            plans.length > 1 ? "grid-cols-2" : "grid-cols-1",
          )}
          role="group"
        >
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-12 flex-col items-stretch gap-1 rounded-sm border px-2 py-1 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-surface text-foreground-secondary hover:bg-surface-subtle",
                )}
                disabled={isMutating}
                key={plan.id}
                onClick={() => onSelectPlan(plan.id)}
                type="button"
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-1">
                  <span className="block min-w-0 truncate font-semibold" title={plan.name}>
                    {plan.name}
                  </span>
                  <span className="shrink-0 text-xs font-semibold">
                    {isSelected ? "Seleccionado" : plan.kind === "REGULAR" ? "Regular" : "Especial"}
                  </span>
                </span>
                <span className="block w-full whitespace-nowrap text-xs leading-4 text-foreground-muted">
                  {formatDate(plan.validFrom)} — {formatDate(plan.validTo)}
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
  layout,
  onEdit,
  readOnly = false,
  selected,
}: {
  assignment: AssignmentView;
  conflict: boolean;
  layout: LaidOutScheduleAssignment<AssignmentView>;
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
  readOnly?: boolean;
  selected: boolean;
}) {
  const assignmentDurationMinutes =
    assignment.endMinutes - assignment.startMinutes;
  const isCompact = assignmentDurationMinutes <= 60;
  const hasRecoveryStatus = assignment.kind === "RECOVERY";
  const hasSelectedStatus = selected && !conflict && !hasRecoveryStatus;
  const accessibleLabel = `${formatAssignmentLabel(assignment)}${
    conflict ? ", conflicto de horario" : ""
  }`;
  const statusDescriptionId = `schedule-assignment-status-${useId().replaceAll(":", "")}`;

  return (
    <button
      aria-label={accessibleLabel}
      aria-describedby={
        isCompact && (conflict || hasRecoveryStatus)
          ? statusDescriptionId
          : undefined
      }
      aria-pressed={selected}
      className={cn(
        "absolute z-10 box-border overflow-hidden rounded-sm border text-left shadow-xs transition-colors",
        !readOnly && "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
        readOnly && "cursor-default opacity-85",
        conflict
          ? "border-danger bg-danger-surface text-foreground"
          : selected
            ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/30"
            : "border-info/30 bg-info-surface text-foreground",
        !readOnly && (conflict ? "hover:bg-danger-surface/80" : "hover:bg-info-surface/80"),
      )}
      data-schedule-assignment-id={assignment.id}
      data-duration-layout={isCompact ? "compact" : "full"}
      disabled={readOnly}
      onClick={readOnly ? undefined : (event) => onEdit(assignment, event.currentTarget)}
      style={{
        height: `${layout.height}rem`,
        left: `calc(${(layout.lane / layout.laneCount) * 100}% + 0.125rem)`,
        top: `${layout.top}rem`,
        width: `calc(${100 / layout.laneCount}% - 0.25rem)`,
      }}
      title={accessibleLabel}
      type="button"
    >
      {isCompact ? (
        <span className="flex w-full min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-xs font-bold">
            {assignment.tutor}
          </span>
          <span
            className="shrink-0 whitespace-nowrap text-xs font-semibold font-numeric tabular-nums"
            data-schedule-assignment-time
          >
            {assignment.start}–{assignment.end}
          </span>
          {(hasRecoveryStatus || conflict) && (
            <span aria-hidden="true" className="flex shrink-0 items-center gap-0.5">
              {conflict && <AlertTriangle className="h-3 w-3" />}
              {hasRecoveryStatus && <RotateCcw className="h-3 w-3" />}
            </span>
          )}
          {(hasRecoveryStatus || conflict) && (
            <span className="sr-only" id={statusDescriptionId}>
              {conflict ? "Conflicto. " : ""}
              {hasRecoveryStatus ? "Recuperación." : ""}
            </span>
          )}
        </span>
      ) : (
        <>
          <span className="w-full truncate text-xs font-bold">{assignment.tutor}</span>
          <span className="mt-1 flex items-center gap-1 text-xs font-numeric tabular-nums">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="shrink-0 whitespace-nowrap" data-schedule-assignment-time>
              {assignment.start} — {assignment.end}
            </span>
          </span>
          <span className="mt-1 w-full truncate text-[11px] text-foreground-secondary">
            {assignment.modality ?? "Sin modalidad"}
          </span>
          <span className="mt-auto flex flex-wrap gap-1">
            {hasRecoveryStatus && (
              <StatusBadge label="Recuperación" variant="faro" />
            )}
            {conflict && <StatusBadge label="Conflicto" variant="danger" />}
            {hasSelectedStatus && (
              <StatusBadge label="Seleccionada" variant="info" />
            )}
          </span>
        </>
      )}
    </button>
  );
}

function TimeRail() {
  const startHour = SCHEDULE_GRID_START_MINUTES / 60;
  const hours = Array.from(
    {
      length:
        (SCHEDULE_GRID_END_MINUTES - SCHEDULE_GRID_START_MINUTES) / 60 + 1,
    },
    (_, index) => index + startHour,
  );

  return (
    <div
      aria-hidden="true"
      className="relative h-[48rem] border-r border-border-subtle bg-surface-subtle/30"
    >
      {hours.map((hour, index) => {
        const isFirst = index === 0;
        const isLast = index === hours.length - 1;

        return (
          <span
            className={cn(
              "absolute right-2 text-[11px] font-numeric tabular-nums text-foreground-muted select-none",
              isFirst
                ? "translate-y-1"
                : isLast
                  ? "-translate-y-[calc(100%+4px)]"
                  : "-translate-y-1/2",
            )}
            key={hour}
            style={{
              top: `${(hour - startHour) * SCHEDULE_GRID_HOUR_HEIGHT_REM}rem`,
            }}
          >
            {String(hour).padStart(2, "0")}:00
          </span>
        );
      })}
    </div>
  );
}

function ScheduleDayColumn({
  conflictIds,
  day,
  layouts,
  onEdit,
  readOnly = false,
  selectedAssignmentId,
}: {
  conflictIds: Set<string>;
  day: string;
  layouts: LaidOutScheduleAssignment<AssignmentView>[];
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
  readOnly?: boolean;
  selectedAssignmentId: string | null;
}) {
  const hours = Array.from(
    {
      length:
        (SCHEDULE_GRID_END_MINUTES - SCHEDULE_GRID_START_MINUTES) / 60,
    },
    (_, index) => index,
  );

  return (
    <div
      className="relative h-[48rem] border-r border-border-subtle last:border-r-0"
      data-schedule-day-column={day}
    >
      {hours.map((hour) => (
        <span
          className="absolute inset-x-0 border-t border-border-subtle"
          key={hour}
          style={{ top: `${hour * SCHEDULE_GRID_HOUR_HEIGHT_REM}rem` }}
        />
      ))}
      {layouts.map(({ assignment, ...layout }) => (
        <ScheduleBlock
          assignment={assignment}
          conflict={conflictIds.has(assignment.id)}
          key={assignment.id}
          layout={{ assignment, ...layout }}
          onEdit={onEdit}
          readOnly={readOnly}
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
  readOnly = false,
  selectedAssignmentId,
  title,
}: {
  assignments: AssignmentView[];
  conflictIds: Set<string>;
  days: string[];
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
  readOnly?: boolean;
  selectedAssignmentId: string | null;
  title: string;
}) {
  const dayLayouts = days.map((day) => {
    const dayAssignments = assignments.filter(
      (assignment) => assignment.day === day,
    );
    const layouts = layoutDayAssignments(dayAssignments);
    const laneCount = layouts.reduce(
      (maximum, layout) => Math.max(maximum, layout.laneCount),
      1,
    );

    return {
      day,
      layouts,
      minimumWidthRem: Math.max(
        SCHEDULE_GRID_MIN_DAY_WIDTH_REM,
        laneCount * SCHEDULE_GRID_MIN_LANE_WIDTH_REM,
      ),
    };
  });

  return (
    <section aria-labelledby={`${title}-title`} className="mt-4" id="schedule-workspace">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground" id={`${title}-title`}>
            {title}
          </h2>
          <p className="mt-1 text-xs text-foreground-muted">
            {readOnly
              ? "Modo solo lectura para el plan archivado."
              : "Seleccionar una guardia para editarla."}
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
            gridTemplateColumns: `4.5rem ${dayLayouts
              .map(({ minimumWidthRem }) => `minmax(${minimumWidthRem}rem, 1fr)`)
              .join(" ")}`,
          }}
        >
          <div className="border-b border-border bg-surface-subtle/60 p-3 text-xs font-semibold text-foreground-muted">
            Hora
          </div>
          {dayLayouts.map(({ day }) => (
            <div
              className="border-b border-l border-border bg-surface-subtle/60 p-3 text-center text-xs font-bold tracking-[0.12em] text-foreground-secondary"
              key={day}
            >
              {day}
            </div>
          ))}
          <TimeRail />
          {dayLayouts.map(({ day, layouts }) => (
            <ScheduleDayColumn
              conflictIds={conflictIds}
              day={day}
              layouts={layouts}
              key={day}
              onEdit={onEdit}
              readOnly={readOnly}
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
    <section aria-labelledby="compact-schedule-title" className="mt-3 md:hidden sm:mt-4">
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
        className="mt-3 grid grid-cols-5 gap-1 rounded-md border border-border bg-surface p-1 sm:mt-4"
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
        <div className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-md border border-border bg-surface sm:mt-4">
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
              {mode === "add" ? "Nueva asignación" : "Asignación guardada"}
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
                  className="border border-danger/30 bg-danger-surface text-danger hover:bg-danger-surface/80 hover:text-danger"
                  disabled={saving || changingStatus}
                  onClick={handleStatusChange}
                  type="button"
                  variant="ghost"
                >
                  Eliminar asignación
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

function ArchivePlanConfirmationDialog({
  isMutating,
  onCancel,
  onConfirm,
  open,
  plan,
}: {
  isMutating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  plan: SafeSchedulePlan;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useOverlayFocus({
    initialFocusRef: cancelButtonRef,
    onClose: onCancel,
    open,
    panelRef,
  });

  if (!open) {
    return null;
  }

  return (
    <div
      aria-label="Cerrar confirmación de archivar plan"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-brand-navy/30 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isMutating) {
          onCancel();
        }
      }}
    >
      <div
        aria-describedby="archive-plan-dialog-description"
        aria-labelledby="archive-plan-dialog-title"
        aria-modal="true"
        className="flex w-full flex-col border-border bg-surface p-6 shadow-2xl sm:max-w-md sm:rounded-md sm:border"
        ref={panelRef}
        role="alertdialog"
        tabIndex={-1}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Archive aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground" id="archive-plan-dialog-title">
              ¿Archivar este plan?
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground-secondary" id="archive-plan-dialog-description">
              El plan <strong className="text-foreground">{plan.name}</strong> se moverá al archivo de planes y dejará de estar disponible en la grilla operativa principal. Podrás reactivarlo en cualquier momento desde el Archivo de planes.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-border-subtle pt-4">
          <button
            className={cn(buttonVariants({ variant: "outline" }))}
            disabled={isMutating}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Cancelar
          </button>
          <Button
            disabled={isMutating}
            onClick={onConfirm}
            type="button"
            variant="outline"
          >
            {isMutating ? "Archivando..." : "Archivar plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlansArchiveDialog({
  archivedPlans,
  cycle,
  isMutating,
  onClose,
  onReactivatePlan,
  open,
  workspaceAssignments,
}: {
  archivedPlans: SafeSchedulePlan[];
  cycle: { id: string; name: string };
  isMutating: boolean;
  onClose: () => void;
  onReactivatePlan: (plan: SafeSchedulePlan) => Promise<void>;
  open: boolean;
  workspaceAssignments: SafeScheduleAssignment[];
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedArchivedPlanId, setSelectedArchivedPlanId] = useState<string | null>(null);
  const [remoteAssignments, setRemoteAssignments] = useState<
    Record<string, SafeScheduleAssignment[]>
  >({});

  useOverlayFocus({
    initialFocusRef: closeButtonRef,
    onClose,
    open,
    panelRef,
  });

  const selectedArchivedPlan =
    (selectedArchivedPlanId
      ? archivedPlans.find((plan) => plan.id === selectedArchivedPlanId)
      : null) ??
    archivedPlans[0] ??
    null;

  useEffect(() => {
    if (!selectedArchivedPlan || !open) {
      return;
    }

    const planId = selectedArchivedPlan.id;
    const hasLocal = workspaceAssignments.some(
      (assignment) => assignment.planId === planId,
    );
    if (hasLocal || remoteAssignments[planId] !== undefined) {
      return;
    }

    let active = true;

    requestJson<SafeScheduleWorkspace>(
      `/api/admin/schedules?cycleId=${cycle.id}&planId=${planId}`,
    )
      .then((data) => {
        if (active) {
          setRemoteAssignments((previous) => ({
            ...previous,
            [planId]: data.assignments ?? [],
          }));
        }
      })
      .catch(() => {
        if (active) {
          setRemoteAssignments((previous) => ({
            ...previous,
            [planId]: [],
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [cycle.id, open, remoteAssignments, selectedArchivedPlan, workspaceAssignments]);

  const previewAssignments = useMemo(() => {
    if (!selectedArchivedPlan) {
      return [];
    }
    const local = workspaceAssignments.filter(
      (assignment) => assignment.planId === selectedArchivedPlan.id,
    );
    const source =
      local.length > 0
        ? local
        : (remoteAssignments[selectedArchivedPlan.id] ?? []);
    return source
      .filter((assignment) => assignment.status === "ACTIVE")
      .map((assignment) => toAssignmentView(assignment, selectedArchivedPlan));
  }, [remoteAssignments, selectedArchivedPlan, workspaceAssignments]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-label="Cerrar archivo de planes"
      className="fixed inset-0 z-[75] flex items-end justify-center bg-brand-navy/30 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isMutating) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby="plans-archive-dialog-description"
        aria-labelledby="plans-archive-dialog-title"
        aria-modal="true"
        className="flex h-full max-h-[100svh] w-full flex-col border-border bg-surface shadow-2xl sm:h-auto sm:max-h-[calc(100svh-3rem)] sm:max-w-4xl sm:rounded-md sm:border"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Histórico
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground" id="plans-archive-dialog-title">
              Archivo de planes
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-foreground-secondary" id="plans-archive-dialog-description">
              Planes inactivados en el ciclo. Podés consultar sus asignaciones en modo solo lectura o reactivarlos.
            </p>
          </div>
          <button
            aria-label="Cerrar archivo de planes"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            disabled={isMutating}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {archivedPlans.length === 0 ? (
            <EmptyState
              description="Los planes que archives aparecerán aquí para su consulta histórica o reactivación."
              illustration={<Archive className="h-10 w-10 text-foreground-muted" />}
              title="No hay planes archivados"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
                  Planes archivados ({archivedPlans.length})
                </p>
                <div
                  aria-label="Listado de planes archivados"
                  className="space-y-2"
                  role="listbox"
                >
                  {archivedPlans.map((plan) => {
                    const isSelected = plan.id === selectedArchivedPlan?.id;

                    return (
                      <div
                        className={cn(
                          "flex flex-col gap-2 rounded-md border p-3 transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-surface hover:bg-surface-subtle",
                        )}
                        key={plan.id}
                      >
                        <button
                          aria-pressed={isSelected}
                          className="w-full text-left focus-visible:outline-none"
                          onClick={() => setSelectedArchivedPlanId(plan.id)}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-foreground" title={plan.name}>
                              {plan.name}
                            </span>
                            <StatusBadge label="Archivado" variant="neutral" />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-secondary">
                            <span>{plan.kind === "REGULAR" ? "Regular" : "Especial"}</span>
                            <span>·</span>
                            <span>{formatDate(plan.validFrom)} — {formatDate(plan.validTo)}</span>
                          </div>
                        </button>
                        <div className="flex items-center justify-between border-t border-border-subtle pt-2">
                          <span className="text-[11px] text-foreground-muted">
                            {cycle.name}
                          </span>
                          <Button
                            disabled={isMutating}
                            onClick={() => void onReactivatePlan(plan)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <RotateCcw aria-hidden="true" />
                            Reactivar plan
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-0 lg:col-span-7">
                {selectedArchivedPlan && (
                  <div className="flex flex-col gap-4">
                    <div className="rounded-md border border-border bg-surface-subtle/50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground">
                              {selectedArchivedPlan.name}
                            </h3>
                            <StatusBadge label="Solo lectura" variant="info" />
                          </div>
                          <p className="mt-1 text-xs text-foreground-secondary">
                            {selectedArchivedPlan.kind === "REGULAR" ? "Plan Regular" : "Plan Especial"} · Vigencia: {formatDate(selectedArchivedPlan.validFrom)} — {formatDate(selectedArchivedPlan.validTo)}
                          </p>
                        </div>
                        <Button
                          disabled={isMutating}
                          onClick={() => void onReactivatePlan(selectedArchivedPlan)}
                          type="button"
                        >
                          <RotateCcw aria-hidden="true" />
                          Reactivar plan
                        </Button>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1">
                      <ScheduleGrid
                        assignments={previewAssignments}
                        conflictIds={new Set()}
                        days={["LUN", "MAR", "MIÉ", "JUE", "VIE"]}
                        onEdit={() => {}}
                        readOnly={true}
                        selectedAssignmentId={null}
                        title={`Asignaciones de ${selectedArchivedPlan.name}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isArchiveConfirmationOpen, setIsArchiveConfirmationOpen] = useState(false);

  const activePlans = useMemo(
    () => (workspace?.plans ?? []).filter((plan) => plan.status === "ACTIVE"),
    [workspace?.plans],
  );
  const archivedPlans = useMemo(
    () => (workspace?.plans ?? []).filter((plan) => plan.status === "INACTIVE"),
    [workspace?.plans],
  );

  const [selectedPlanId, setSelectedPlanId] = useState(
    () =>
      initialWorkspace?.selectedPlan?.status === "ACTIVE"
        ? initialWorkspace.selectedPlan.id
        : initialWorkspace?.plans.find((plan) => plan.status === "ACTIVE")?.id ?? "",
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
      initialWorkspace?.selectedPlan?.status === "ACTIVE"
        ? initialWorkspace.selectedPlan.id
        : initialWorkspace?.plans.find((plan) => plan.status === "ACTIVE")?.id ?? "",
    );
    setSelectedAssignmentId(null);
    setEditor(null);
  }, [initialErrorMessage, initialWorkspace, state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedPlan = useMemo(() => {
    if (activePlans.length === 0) {
      return null;
    }
    const matched = activePlans.find((plan) => plan.id === selectedPlanId);
    return matched ?? activePlans[0] ?? null;
  }, [activePlans, selectedPlanId]);
  const planAssignments = useMemo(
    () =>
      workspace && selectedPlan
        ? workspace.assignments
            .filter((assignment) => assignment.planId === selectedPlan.id && assignment.status === "ACTIVE")
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
        setAnnouncement("La asignación se eliminó correctamente.");
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

  const reactivatePlan = useCallback(
    async (plan: SafeSchedulePlan) => {
      setIsMutating(true);
      setErrorMessage("");

      try {
        await requestJson<{ plan: SafeSchedulePlan }>(
          `/api/admin/schedules/plans/${plan.id}/status`,
          {
            body: JSON.stringify({ status: "ACTIVE" }),
            method: "PATCH",
          },
        );
        setIsArchiveOpen(false);
        try {
          const nextWorkspace = await refreshWorkspace(plan.id);
          setSelectedPlanId(plan.id);
          setViewState(deriveWorkspaceState(nextWorkspace));
        } catch {
          setWorkspace((current) => {
            if (!current) return current;
            return {
              ...current,
              plans: current.plans.map((p) =>
                p.id === plan.id ? { ...p, status: "ACTIVE" as const } : p,
              ),
              selectedPlan: { ...plan, status: "ACTIVE" as const },
            };
          });
          setSelectedPlanId(plan.id);
        }
        setViewState("success");
        setAnnouncement("El plan fue reactivado correctamente.");
      } catch (error) {
        setErrorMessage(getScheduleErrorMessage(error));
        setViewState("error");
      } finally {
        setIsMutating(false);
      }
    },
    [refreshWorkspace],
  );

  const archivePlan = useCallback(async () => {
    if (!selectedPlan) {
      return;
    }

    setIsMutating(true);
    setErrorMessage("");

    try {
      await requestJson<{ plan: SafeSchedulePlan }>(
        `/api/admin/schedules/plans/${selectedPlan.id}/status`,
        {
          body: JSON.stringify({ status: "INACTIVE" }),
          method: "PATCH",
        },
      );
      setIsArchiveConfirmationOpen(false);
      try {
        const nextWorkspace = await refreshWorkspace();
        setViewState(deriveWorkspaceState(nextWorkspace));
      } catch {
        setWorkspace((current) => {
          if (!current) return current;
          const updatedPlans = current.plans.map((p) =>
            p.id === selectedPlan.id ? { ...p, status: "INACTIVE" as const } : p,
          );
          const remainingActive = updatedPlans.filter((p) => p.status === "ACTIVE");
          return {
            ...current,
            plans: updatedPlans,
            selectedPlan: remainingActive[0] ?? null,
          };
        });
      }
      setViewState("success");
      setAnnouncement("El plan fue archivado correctamente.");
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
        <div className="flex flex-wrap items-center gap-2">
          {archivedPlans.length > 0 && (
            <Button
              disabled={isMutating}
              onClick={() => setIsArchiveOpen(true)}
              type="button"
              variant="outline"
            >
              <History aria-hidden="true" />
              Archivo de planes
            </Button>
          )}
          <Button
            disabled={isMutating}
            onClick={(event) => openPlanEditor(event.currentTarget)}
            type="button"
          >
            <Plus aria-hidden="true" />
            Crear plan
          </Button>
        </div>
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={(event) => openPlanEditor(event.currentTarget)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {stateDetail.actionLabel ?? "Crear plan"}
                  </Button>
                  {archivedPlans.length > 0 && (
                    <Button
                      onClick={() => setIsArchiveOpen(true)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <History aria-hidden="true" />
                      Archivo de planes
                    </Button>
                  )}
                </div>
              ) : (
                <PreviewActionLink href="/admin/settings" label={stateDetail.actionLabel ?? "Configurar ciclo"} />
              )
            }
            description={
              archivedPlans.length > 0
                ? "No hay planes activos en este ciclo. Podés crear uno nuevo o reactivar un plan desde el archivo de planes."
                : stateDetail.description
            }
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
              onArchivePlan={() => setIsArchiveConfirmationOpen(true)}
              onNewPlan={(event) => openPlanEditor(event.currentTarget)}
              onOpenArchive={() => setIsArchiveOpen(true)}
              onSelectPlan={(planId) => void selectPlan(planId)}
              plans={activePlans}
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

      {workspace && (
        <PlansArchiveDialog
          archivedPlans={archivedPlans}
          cycle={workspace.currentCycle}
          isMutating={isMutating}
          onClose={() => setIsArchiveOpen(false)}
          onReactivatePlan={reactivatePlan}
          open={isArchiveOpen}
          workspaceAssignments={workspace.assignments}
        />
      )}

      {workspace && selectedPlan && (
        <ArchivePlanConfirmationDialog
          isMutating={isMutating}
          onCancel={() => setIsArchiveConfirmationOpen(false)}
          onConfirm={() => void archivePlan()}
          open={isArchiveConfirmationOpen}
          plan={selectedPlan}
        />
      )}

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
