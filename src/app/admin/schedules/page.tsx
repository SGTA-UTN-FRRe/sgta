import type { Metadata } from "next";

import { requireRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { listAdministrativeCycles } from "@/features/cycles/cycle-service";
import {
  getScheduleWorkspace,
  SCHEDULE_ERROR_CODES,
  ScheduleServiceError,
  type SafeScheduleWorkspace,
} from "@/features/schedules/schedule-service";
import { resolveDefaultOperationalDate } from "@/features/schedules/schedule-date";
import {
  SchedulesScreen,
  type SchedulesScreenState,
} from "@/features/schedules/schedules-screen";

const pageDescription = "Planificar guardias regulares y períodos especiales.";

export const metadata: Metadata = {
  title: "Horarios | SGTA",
  description: pageDescription,
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getWorkspaceState(
  workspace: SafeScheduleWorkspace,
): SchedulesScreenState {
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

type AdminSchedulesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSchedulesPage({
  searchParams,
}: AdminSchedulesPageProps) {
  const user = await requireRole("ADMIN");
  const query = (await searchParams) ?? {};
  let workspace: SafeScheduleWorkspace | null = null;
  let state: SchedulesScreenState = "default";
  let initialErrorMessage: string | undefined;

  try {
    const database = getDatabase();
    const cycleId = firstSearchParam(query.cycleId);
    let date = firstSearchParam(query.date);

    if (date === undefined) {
      const cycles = await listAdministrativeCycles(database);
      const cycle =
        (cycleId === undefined
          ? cycles.find((item) => item.status === "OPEN")
          : cycles.find((item) => item.id === cycleId)) ?? null;

      if (cycle !== null) {
        date = resolveDefaultOperationalDate(cycle);
      }
    }

    workspace = await getScheduleWorkspace(
      database,
      {
        cycleId,
        planId: firstSearchParam(query.planId),
        date,
      },
      { actorId: user.id },
    );
    state = getWorkspaceState(workspace);
  } catch (error) {
    if (
      error instanceof ScheduleServiceError &&
      error.code === SCHEDULE_ERROR_CODES.openCycleRequired
    ) {
      state = "required-action";
      initialErrorMessage =
        "Abrir un ciclo administrativo antes de gestionar horarios.";
    } else {
      state = "error";
      initialErrorMessage =
        "No se pudo cargar el horario. Intentar nuevamente.";
    }
  }

  return (
    <SchedulesScreen
      initialErrorMessage={initialErrorMessage}
      state={state}
      workspace={workspace}
    />
  );
}
