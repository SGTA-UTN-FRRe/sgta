import type { Metadata } from "next";

import { requireRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { TutorHoursScreen } from "@/features/tutor-self-service/tutor-hours-screen";
import {
  getTutorSelfServiceErrorMessage,
} from "@/features/tutor-self-service/tutor-self-service-screen-utils";
import {
  getTutorSelfServiceHours,
  TutorSelfServiceError,
  type TutorSelfServiceHours,
} from "@/features/tutor-self-service/tutor-self-service-service";

export const metadata: Metadata = {
  title: "Mis horas | SGTA",
  description: "Balance e historial personal del ciclo vigente.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  return error instanceof TutorSelfServiceError
    ? getTutorSelfServiceErrorMessage(error.code)
    : "No se pudieron cargar las horas. Intentar nuevamente.";
}

export default async function TutorHoursPage() {
  const user = await requireRole("TUTOR");
  let data: TutorSelfServiceHours | null = null;
  let state: "default" | "empty" | "required-action" | "error" = "default";
  let initialErrorMessage: string | undefined;

  try {
    data = await getTutorSelfServiceHours(getDatabase(), user.id);
    state =
      data.state === "required-action"
        ? "required-action"
        : data.movements.length === 0
          ? "empty"
          : "default";
  } catch (error) {
    state = "error";
    initialErrorMessage = getErrorMessage(error);
  }

  return (
    <TutorHoursScreen
      data={data}
      initialErrorMessage={initialErrorMessage}
      state={state}
    />
  );
}
