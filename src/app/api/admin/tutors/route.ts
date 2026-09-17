import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  createTutor,
  listTutors,
} from "@/features/tutors/tutor-service";
import {
  createTutorInputSchema,
} from "@/features/tutors/tutor-validation";
import {
  getTutorRequestContext,
  invalidTutorRequestResponse,
  parseTutorJsonBody,
  parseTutorListQuery,
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

  const parsedQuery = parseTutorListQuery(request);

  if (!parsedQuery.success) {
    return invalidTutorRequestResponse(parsedQuery.error);
  }

  try {
    const tutors = await listTutors(getDatabase(), parsedQuery.data);

    return tutorJsonResponse({ tutors });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedBody = await parseTutorJsonBody(request, createTutorInputSchema);

  if (!parsedBody.success) {
    return invalidTutorRequestResponse(parsedBody.error);
  }

  try {
    const tutor = await createTutor(
      getDatabase(),
      parsedBody.data,
      getTutorRequestContext(request, authorization.id),
    );

    return tutorJsonResponse({ tutor }, 201);
  } catch (error) {
    return tutorErrorResponse(error);
  }
}
