import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getTutorSelfServiceHours,
} from "@/features/tutor-self-service/tutor-self-service-service";
import {
  invalidTutorSelfServiceRequestResponse,
  parseTutorSelfServiceHoursQuery,
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

  const parsedQuery = parseTutorSelfServiceHoursQuery(request);

  if (!parsedQuery.success) {
    return invalidTutorSelfServiceRequestResponse(parsedQuery.error);
  }

  try {
    const hours = await getTutorSelfServiceHours(
      getDatabase(),
      authorization.id,
      parsedQuery.data,
    );

    return tutorSelfServiceJsonResponse(hours);
  } catch (error) {
    return tutorSelfServiceErrorResponse(error);
  }
}

export function POST() {
  return tutorSelfServiceMethodNotAllowedResponse();
}
