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
  deriveWorkspaceState,
  type SchedulesScreenState,
} from "@/features/schedules/schedule-view-model";
import { SchedulesScreen } from "@/features/schedules/schedules-screen";

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
  const cycleId = firstSearchParam(query.cycleId);
  const planId = firstSearchParam(query.planId);
  let date = firstSearchParam(query.date);
  const screenKey = [cycleId, planId, date].join("|");

  try {
    const database = getDatabase();

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
        planId,
        date,
      },
      { actorId: user.id },
    );
    state = deriveWorkspaceState(workspace);
  } catch (error) {
    if (
      error instanceof ScheduleServiceError &&
      error.code === SCHEDULE_ERROR_CODES.openCycleRequired
    ) {
      state = "required-action";
    } else {
      state = "error";
    }
  }

  return (
    <SchedulesScreen
      key={`${screenKey}|${state}`}
      state={state}
      workspace={workspace}
    />
  );
}
