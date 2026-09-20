import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getTutorSelfServiceSchedule,
} from "@/features/tutor-self-service/tutor-self-service-service";
import {
  invalidTutorSelfServiceRequestResponse,
  parseTutorSelfServiceScheduleQuery,
  tutorSelfServiceErrorResponse,
  tutorSelfServiceJsonResponse,
  tutorSelfServiceMethodNotAllowedResponse,
} from "@/features/tutor-self-service/tutor-self-service-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await requireApiRole("TUTOR");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedQuery = parseTutorSelfServiceScheduleQuery(request);

  if (!parsedQuery.success) {
    return invalidTutorSelfServiceRequestResponse(parsedQuery.error);
  }

  try {
    const schedule = await getTutorSelfServiceSchedule(
      getDatabase(),
      authorization.id,
      parsedQuery.data,
    );

    return tutorSelfServiceJsonResponse(schedule);
  } catch (error) {
    return tutorSelfServiceErrorResponse(error);
  }
}

export function POST() {
  return tutorSelfServiceMethodNotAllowedResponse();
}
