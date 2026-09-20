import type { Metadata } from "next";

import { requireRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getTutorSelfServiceSchedule,
  TutorSelfServiceError,
  type TutorSelfServiceSchedule,
} from "@/features/tutor-self-service/tutor-self-service-service";
import { getTutorSelfServiceErrorMessage } from "@/features/tutor-self-service/tutor-self-service-screen-utils";
import { TutorScheduleScreen } from "@/features/tutor-self-service/tutor-schedule-screen";
import { tutorSelfServiceScheduleQuerySchema } from "@/features/tutor-self-service/tutor-self-service-validation";

export const metadata: Metadata = {
  title: "Mi horario | SGTA",
  description: "Guardias efectivas y próximas asignaciones personales.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TutorSchedulePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getErrorMessage(error: unknown) {
  return error instanceof TutorSelfServiceError
    ? getTutorSelfServiceErrorMessage(error.code)
    : "No se pudo cargar el horario. Intentar nuevamente.";
}

export default async function TutorSchedulePage({
  searchParams,
}: TutorSchedulePageProps) {
  const user = await requireRole("TUTOR");
  const query = (await searchParams) ?? {};
  const parsedQuery = tutorSelfServiceScheduleQuerySchema.safeParse(query);
  let data: TutorSelfServiceSchedule | null = null;
  let state: "default" | "empty" | "required-action" | "error" = "default";
  let initialErrorMessage: string | undefined;
  let initialDate: string | undefined;

  if (!parsedQuery.success) {
    state = "error";
    initialErrorMessage = "Revisar la fecha seleccionada antes de intentar nuevamente.";
  } else {
    initialDate = parsedQuery.data.date ?? parsedQuery.data.weekStart;

    try {
      data = await getTutorSelfServiceSchedule(
        getDatabase(),
        user.id,
        parsedQuery.data,
      );
      state =
        data.state === "required-action"
          ? "required-action"
          : data.state === "empty-upcoming" ||
              data.days.every((day) => day.assignments.length === 0)
            ? "empty"
            : "default";
    } catch (error) {
      state = "error";
      initialErrorMessage = getErrorMessage(error);
    }
  }

  return (
    <TutorScheduleScreen
      data={data}
      initialDate={initialDate}
      initialErrorMessage={initialErrorMessage}
      state={state}
    />
  );
}
