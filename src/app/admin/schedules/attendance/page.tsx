import type { Metadata } from "next";

import { requireRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  ATTENDANCE_ERROR_CODES,
  AttendanceServiceError,
  listAttendanceForDate,
} from "@/features/schedules/attendance-service";
import { AttendanceScreen } from "@/features/schedules/attendance-screen";
import { listAdministrativeCycles } from "@/features/cycles/cycle-service";

export const metadata: Metadata = {
  title: "Asistencia | SGTA",
  description: "Consultar las ocurrencias efectivas y su estado de asistencia.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type AttendancePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAttendancePage({
  searchParams,
}: AttendancePageProps) {
  const user = await requireRole("ADMIN");
  const query = (await searchParams) ?? {};
  const database = getDatabase();

  let state: "default" | "empty" | "error" | "required-action" = "default";
  let data = null as Awaited<ReturnType<typeof listAttendanceForDate>> | null;

  try {
    const cycles = await listAdministrativeCycles(database);
    const requestedCycleId = firstSearchParam(query.cycleId);
    const cycle =
      (requestedCycleId === undefined
        ? cycles.find((item) => item.status === "OPEN")
        : cycles.find((item) => item.id === requestedCycleId)) ?? null;

    if (cycle === null) {
      state = "required-action";
    } else {
      data = await listAttendanceForDate(
        database,
        {
          cycleId: cycle.id,
          date: firstSearchParam(query.date) ?? cycle.startDate,
        },
        { actorId: user.id },
      );
      state = data.occurrences.length === 0 ? "empty" : "default";
    }
  } catch (error) {
    state =
      error instanceof AttendanceServiceError &&
      (error.code === ATTENDANCE_ERROR_CODES.cycleNotFound ||
        error.code === ATTENDANCE_ERROR_CODES.cycleNotOpen)
        ? "required-action"
        : "error";
  }

  return <AttendanceScreen data={data} state={state} />;
}
