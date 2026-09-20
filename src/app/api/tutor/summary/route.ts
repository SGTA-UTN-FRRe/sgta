import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getTutorSelfServiceSummary,
} from "@/features/tutor-self-service/tutor-self-service-service";
import {
  invalidTutorSelfServiceRequestResponse,
  parseTutorSelfServiceSummaryQuery,
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

  const parsedQuery = parseTutorSelfServiceSummaryQuery(request);

  if (!parsedQuery.success) {
    return invalidTutorSelfServiceRequestResponse(parsedQuery.error);
  }

  try {
    const summary = await getTutorSelfServiceSummary(
      getDatabase(),
      authorization.id,
    );

    return tutorSelfServiceJsonResponse(summary);
  } catch (error) {
    return tutorSelfServiceErrorResponse(error);
  }
}

export function POST() {
  return tutorSelfServiceMethodNotAllowedResponse();
}
