import { getCareerAbbreviation } from "@/shared/career-abbreviation";
import type { CareerColor } from "@/shared/career-color";
import { SCHEDULE_MODALITY_LABELS } from "@/shared/schedule-modality";

import type {
  SafeScheduleAssignment,
  SafeSchedulePlan,
  SafeScheduleWorkspace,
} from "./schedule-service";

export type SchedulesScreenState =
  | "default"
  | "loading"
  | "empty-plan"
  | "no-plan"
  | "error"
  | "required-action"
  | "conflict";

export type AssignmentView = SafeScheduleAssignment & {
  date: string;
  /** Name shown in the calendar: the preferred display name, disambiguated within the plan. */
  displayName: string;
  /** Column label, `LUN` to `DOM`. */
  day: string;
  /** Spoken weekday used in accessible names, `lunes` to `domingo`. */
  dayName: string;
  end: string;
  start: string;
};

export type AssignmentDraft = {
  assignmentDate: string | null;
  endMinutes: number;
  kind: SafeScheduleAssignment["kind"];
  modality: string | null;
  pattern: SafeScheduleAssignment["pattern"];
  startMinutes: number;
  tutorId: string;
  weekday: number | null;
};

export type PlanDraft = {
  kind: SafeSchedulePlan["kind"];
  name: string;
  validFrom: string;
  validTo: string;
};

export type ScheduleCareer = { color: CareerColor; name: string };

type ScheduleValidationIssue = {
  message: string;
  path: Array<string | number>;
};

export const WEEKDAY_LABELS = ["", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
export const WEEKDAY_NAMES = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const PLAN_WEEKDAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE"];
const WEEKEND_DAYS = ["SÁB", "DOM"];

export class ScheduleRequestError extends Error {
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

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
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

export function getScheduleErrorMessage(error: unknown) {
  if (error instanceof ScheduleRequestError) {
    return scheduleErrorMessages[error.code] ?? scheduleErrorMessages.internal_server_error;
  }

  return scheduleErrorMessages.internal_server_error;
}

export function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

export function formatValidity(plan: Pick<SafeSchedulePlan, "validFrom" | "validTo">) {
  return `${formatDate(plan.validFrom)} — ${formatDate(plan.validTo)}`;
}

export function formatPlanKind(kind: SafeSchedulePlan["kind"]) {
  return kind === "REGULAR" ? "Regular" : "Especial";
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const remainder = (minutes % 60).toString().padStart(2, "0");

  return `${hours}:${remainder}`;
}

export function toMinutes(value: string) {
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

export function toAssignmentView(
  assignment: SafeScheduleAssignment,
  plan: SafeSchedulePlan,
): AssignmentView {
  const date =
    assignment.assignmentDate ??
    dateForWeekday(plan.validFrom, plan.validTo, assignment.weekday ?? 1);
  const weekday = assignment.weekday ?? getIsoWeekday(date);

  return {
    ...assignment,
    date,
    displayName: assignment.tutorDisplayName,
    day: WEEKDAY_LABELS[weekday] ?? "",
    dayName: WEEKDAY_NAMES[weekday] ?? "",
    end: formatMinutes(assignment.endMinutes),
    start: formatMinutes(assignment.startMinutes),
  };
}

/** Formal name, followed by the preferred name when it differs from the first name. */
export function formatAssignmentPerson(assignment: Pick<AssignmentView, "tutorDisplayName" | "tutorName">) {
  const firstName = assignment.tutorName.split(", ").slice(1).join(", ") || assignment.tutorName;

  return assignment.tutorDisplayName && assignment.tutorDisplayName !== firstName
    ? `${assignment.tutorName} (${assignment.tutorDisplayName})`
    : assignment.tutorName;
}

/** `<Tutor>, <Carrera>, <día>, <inicio> a <fin>` with the modality, recovery, and conflict cues. */
export function formatAssignmentLabel(assignment: AssignmentView, conflict: boolean) {
  return [
    formatAssignmentPerson(assignment),
    assignment.careerName,
    assignment.dayName,
    `${assignment.start} a ${assignment.end}`,
    assignment.modality === "VIRTUAL" ? SCHEDULE_MODALITY_LABELS.VIRTUAL : null,
    assignment.kind === "RECOVERY" ? "Recuperación" : null,
    conflict ? "conflicto de horario" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Careers present in the assignments, ordered by name. */
export function getScheduleCareers(assignments: readonly SafeScheduleAssignment[]) {
  const careers = new Map<string, ScheduleCareer>();

  for (const assignment of assignments) {
    if (!careers.has(assignment.careerName)) {
      careers.set(assignment.careerName, {
        color: assignment.careerColor,
        name: assignment.careerName,
      });
    }
  }

  return [...careers.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "es-AR"),
  );
}

export function deriveWorkspaceState(
  workspace: SafeScheduleWorkspace | null,
): SchedulesScreenState {
  if (workspace === null) {
    return "error";
  }

  if (workspace.conflicts.length > 0) {
    return "conflict";
  }

  if (!workspace.plans.some((plan) => plan.status === "ACTIVE")) {
    return "no-plan";
  }

  if (!workspace.assignments.some((assignment) => assignment.status === "ACTIVE")) {
    return "empty-plan";
  }

  return "default";
}

/**
 * Display names for a plan's assignments. Tutors sharing a display name are told apart by the
 * initial of their last name, then by career abbreviation.
 */
export function withDisplayNames(assignments: readonly AssignmentView[]): AssignmentView[] {
  const tutorsByName = new Map<string, Set<string>>();

  for (const assignment of assignments) {
    const key = assignment.tutorDisplayName.toLocaleLowerCase("es-AR");
    tutorsByName.set(key, (tutorsByName.get(key) ?? new Set<string>()).add(assignment.tutorId));
  }

  const labels = new Map<string, string>();

  for (const assignment of assignments) {
    if (labels.has(assignment.tutorId)) {
      continue;
    }

    const key = assignment.tutorDisplayName.toLocaleLowerCase("es-AR");
    const shared = (tutorsByName.get(key)?.size ?? 0) > 1;
    const lastInitial = assignment.tutorName.split(",")[0]?.trim().charAt(0);
    labels.set(
      assignment.tutorId,
      shared && lastInitial ? `${assignment.tutorDisplayName} ${lastInitial}.` : assignment.tutorDisplayName,
    );
  }

  const counts = new Map<string, Set<string>>();
  for (const [tutorId, label] of labels) {
    counts.set(label, (counts.get(label) ?? new Set<string>()).add(tutorId));
  }

  return assignments.map((assignment) => {
    const label = labels.get(assignment.tutorId) ?? assignment.tutorDisplayName;
    return {
      ...assignment,
      displayName:
        (counts.get(label)?.size ?? 0) > 1
          ? `${label} ${getCareerAbbreviation(assignment.careerName)}`
          : label,
    };
  });
}

/** Monday to Friday, plus Saturday and Sunday only when the plan uses them. */
export function getPlanDays(assignments: readonly Pick<AssignmentView, "day">[]) {
  return [...PLAN_WEEKDAYS, ...WEEKEND_DAYS.filter((day) => assignments.some((item) => item.day === day))];
}

export type CoverageLevel = "closed" | "uncovered" | "minimal" | "covered";

export type MatrixCell = {
  assignments: AssignmentView[];
  coverage: CoverageLevel;
};

export type MatrixRow =
  | { cells: Record<string, MatrixCell>; endMinutes: number; kind: "hour"; startMinutes: number }
  | { endMinutes: number; kind: "gap"; startMinutes: number };

export type CoverageSummary = { minimal: number; uncovered: number };

type TimeRange = Pick<AssignmentView, "endMinutes" | "startMinutes">;

function overlapsHour(assignment: TimeRange, hourStart: number) {
  return assignment.startMinutes < hourStart + 60 && assignment.endMinutes > hourStart;
}

function staffedHours(assignments: readonly TimeRange[]) {
  const hours = new Set<number>();

  for (const assignment of assignments) {
    for (let hour = Math.floor(assignment.startMinutes / 60) * 60; hour < assignment.endMinutes; hour += 60) {
      hours.add(hour);
    }
  }

  return [...hours].sort((left, right) => left - right);
}

/** Adds one-hour holes between staffed hours; longer gaps are treated as closed. */
function withSingleHourHoles(hours: readonly number[]) {
  const holes = hours.flatMap((hour, index) =>
    index > 0 && hour - hours[index - 1] === 120 ? [hours[index - 1] + 60] : [],
  );

  return [...hours, ...holes].sort((left, right) => left - right);
}

/**
 * Hour rows for the weekly matrix. Coverage counts distinct in-person Tutors across every plan
 * assignment, so a career filter never hides an uncovered hour. Opening hours are inferred: an
 * hour is open when someone is assigned, or when it is a one-hour hole between staffed hours of
 * the same day. Longer gaps across the whole week collapse into a single separator row.
 */
export function buildScheduleMatrix(
  allAssignments: readonly AssignmentView[],
  displayedAssignments: readonly AssignmentView[],
  days: readonly string[],
): { rows: MatrixRow[]; summary: CoverageSummary } {
  const weekHours = withSingleHourHoles(staffedHours(allAssignments));
  const openHoursByDay = new Map(
    days.map((day) => [
      day,
      new Set(withSingleHourHoles(staffedHours(allAssignments.filter((item) => item.day === day)))),
    ]),
  );
  const summary: CoverageSummary = { minimal: 0, uncovered: 0 };
  const rows: MatrixRow[] = [];

  for (const [index, hour] of weekHours.entries()) {
    const previous = weekHours[index - 1];

    if (previous !== undefined && hour - previous > 60) {
      rows.push({ endMinutes: hour, kind: "gap", startMinutes: previous + 60 });
    }

    const cells: Record<string, MatrixCell> = {};

    for (const day of days) {
      const inPersonCount = new Set(
        allAssignments
          .filter((item) => item.day === day && item.modality === "IN_PERSON" && overlapsHour(item, hour))
          .map((item) => item.tutorId),
      ).size;
      const coverage: CoverageLevel = !openHoursByDay.get(day)?.has(hour)
        ? "closed"
        : inPersonCount === 0
          ? "uncovered"
          : inPersonCount === 1
            ? "minimal"
            : "covered";

      if (coverage === "uncovered") summary.uncovered += 1;
      if (coverage === "minimal") summary.minimal += 1;

      cells[day] = {
        assignments: displayedAssignments
          .filter((item) => item.day === day && overlapsHour(item, hour))
          .sort(
            (left, right) =>
              left.startMinutes - right.startMinutes ||
              left.displayName.localeCompare(right.displayName, "es-AR"),
          ),
        coverage,
      };
    }

    rows.push({ cells, endMinutes: hour + 60, kind: "hour", startMinutes: hour });
  }

  return { rows, summary };
}
