import type { Metadata } from "next";

import { requireRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getTutorSelfServiceSummary,
  TutorSelfServiceError,
  type TutorSelfServiceSummary,
} from "@/features/tutor-self-service/tutor-self-service-service";
import { getTutorSelfServiceErrorMessage } from "@/features/tutor-self-service/tutor-self-service-screen-utils";
import { TutorSummaryScreen } from "@/features/tutor-self-service/tutor-summary-screen";

export const metadata: Metadata = {
  title: "Mi resumen | SGTA",
  description: "Estado personal, materias y próximas guardias.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  return error instanceof TutorSelfServiceError
    ? getTutorSelfServiceErrorMessage(error.code)
    : "No se pudo cargar el resumen. Intentar nuevamente.";
}

export default async function TutorOverviewPage() {
  const user = await requireRole("TUTOR");
  let data: TutorSelfServiceSummary | null = null;
  let state: "default" | "empty" | "required-action" | "error" = "default";
  let initialErrorMessage: string | undefined;

  try {
    data = await getTutorSelfServiceSummary(getDatabase(), user.id);
    state =
      data.state === "required-action"
        ? "required-action"
        : data.tutor.subjects.length === 0 && data.nextDuty === null
          ? "empty"
          : "default";
  } catch (error) {
    state = "error";
    initialErrorMessage = getErrorMessage(error);
  }

  return (
    <TutorSummaryScreen
      data={data}
      initialErrorMessage={initialErrorMessage}
      state={state}
    />
  );
}
