import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  createCareer,
  listCareers,
} from "@/features/tutors/tutor-service";
import { createCareerInputSchema } from "@/features/tutors/tutor-validation";
import {
  getTutorRequestContext,
  invalidTutorRequestResponse,
  parseReferenceListQuery,
  parseTutorJsonBody,
  tutorErrorResponse,
  tutorJsonResponse,
} from "@/features/tutors/tutor-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedQuery = parseReferenceListQuery(request);

  if (!parsedQuery.success) {
    return invalidTutorRequestResponse(parsedQuery.error);
  }

  try {
    const careers = await listCareers(getDatabase(), parsedQuery.data.status);

    return tutorJsonResponse({ careers });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedBody = await parseTutorJsonBody(request, createCareerInputSchema);

  if (!parsedBody.success) {
    return invalidTutorRequestResponse(parsedBody.error);
  }

  try {
    const career = await createCareer(
      getDatabase(),
      parsedBody.data,
      getTutorRequestContext(request, authorization.id),
    );

    return tutorJsonResponse({ career }, 201);
  } catch (error) {
    return tutorErrorResponse(error);
  }
}
