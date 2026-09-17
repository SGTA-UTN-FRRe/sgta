import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  createSubject,
  listSubjects,
} from "@/features/tutors/tutor-service";
import { createSubjectInputSchema } from "@/features/tutors/tutor-validation";
import {
  getTutorRequestContext,
  invalidTutorRequestResponse,
  parseSubjectListQuery,
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

  const parsedQuery = parseSubjectListQuery(request);

  if (!parsedQuery.success) {
    return invalidTutorRequestResponse(parsedQuery.error);
  }

  try {
    const subjects = await listSubjects(
      getDatabase(),
      parsedQuery.data.status,
      { activeCareerOnly: parsedQuery.data.activeCareerOnly },
    );

    return tutorJsonResponse({ subjects });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedBody = await parseTutorJsonBody(request, createSubjectInputSchema);

  if (!parsedBody.success) {
    return invalidTutorRequestResponse(parsedBody.error);
  }

  try {
    const subject = await createSubject(
      getDatabase(),
      parsedBody.data,
      getTutorRequestContext(request, authorization.id),
    );

    return tutorJsonResponse({ subject }, 201);
  } catch (error) {
    return tutorErrorResponse(error);
  }
}
