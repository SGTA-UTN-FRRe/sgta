import type { Metadata } from "next";

import { requireRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getScheduleWorkspace,
  SCHEDULE_ERROR_CODES,
  ScheduleServiceError,
  type SafeScheduleWorkspace,
} from "@/features/schedules/schedule-service";
import { SchedulesScreen } from "@/features/schedules/schedules-screen";
import type {
  ScheduleAssignmentView,
  SchedulesScreenData,
} from "@/features/schedules/schedules-screen-types";

const pageDescription = "Planificar guardias regulares y per\u00edodos especiales.";

export const metadata: Metadata = {
  title: "Horarios | SGTA",
  description: pageDescription,
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emptyData: SchedulesScreenData = {
  description: pageDescription,
  plans: [],
  assignments: [],
  weekdays: ["LUN", "MAR", "MI\u00c9", "JUE", "VIE"],
  primaryAction: "Agregar asignaci\u00f3n",
  secondaryAction: "Nuevo plan",
  emptyPlanLabel: "Este horario todav\u00eda no tiene asignaciones.",
};

const weekdayLabels = ["", "LUN", "MAR", "MI\u00c9", "JUE", "VIE", "S\u00c1B", "DOM"];

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const remainder = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${remainder}`;
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

function assignmentDate(
  assignment: SafeScheduleWorkspace["assignments"][number],
  workspace: SafeScheduleWorkspace,
) {
  if (assignment.assignmentDate !== null) {
    return assignment.assignmentDate;
  }

  if (
    workspace.requestedDate !== null &&
    getIsoWeekday(workspace.requestedDate) === assignment.weekday
  ) {
    return workspace.requestedDate;
  }

  return dateForWeekday(
    workspace.selectedPlan?.validFrom ?? workspace.currentCycle.startDate,
    workspace.selectedPlan?.validTo ?? workspace.currentCycle.endDate,
    assignment.weekday ?? 1,
  );
}

function toAssignmentView(
  assignment: SafeScheduleWorkspace["assignments"][number],
  workspace: SafeScheduleWorkspace,
): ScheduleAssignmentView {
  const date = assignmentDate(assignment, workspace);

  return {
    id: assignment.id,
    planId: assignment.planId,
    day: weekdayLabels[getIsoWeekday(date)] ?? "",
    date,
    start: formatMinutes(assignment.startMinutes),
    end: formatMinutes(assignment.endMinutes),
    tutor: assignment.tutorName,
    modality: assignment.modality ?? "Sin modalidad",
  };
}

function toScreenData(workspace: SafeScheduleWorkspace): SchedulesScreenData {
  return {
    ...emptyData,
    plans: workspace.plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      kind: plan.kind === "REGULAR" ? "regular" : "special",
      kindLabel: plan.kind === "REGULAR" ? "Regular" : "Especial",
      validity: `${formatDate(plan.validFrom)} \u2014 ${formatDate(plan.validTo)}`,
      isActive: plan.status === "ACTIVE",
    })),
    assignments: workspace.assignments.map((assignment) =>
      toAssignmentView(assignment, workspace),
    ),
  };
}

type AdminSchedulesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSchedulesPage({
  searchParams,
}: AdminSchedulesPageProps) {
  const user = await requireRole("ADMIN");
  const query = (await searchParams) ?? {};
  const data = { ...emptyData };
  let state: "default" | "empty-plan" | "no-plan" | "error" | "required-action" | "conflict" =
    "default";
  let liveData = data;

  try {
    const workspace = await getScheduleWorkspace(
      getDatabase(),
      {
        cycleId: firstSearchParam(query.cycleId),
        planId: firstSearchParam(query.planId),
        date: firstSearchParam(query.date),
      },
      { actorId: user.id },
    );

    liveData = toScreenData(workspace);
    state =
      workspace.conflicts.length > 0
        ? "conflict"
        : workspace.plans.length === 0
          ? "no-plan"
          : workspace.assignments.length === 0
            ? "empty-plan"
            : "default";
  } catch (error) {
    state =
      error instanceof ScheduleServiceError &&
      error.code === SCHEDULE_ERROR_CODES.openCycleRequired
        ? "required-action"
        : "error";
  }

  return <SchedulesScreen data={liveData} state={state} />;
}
