import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getSubject,
  updateSubject,
} from "@/features/tutors/tutor-service";
import { updateSubjectInputSchema } from "@/features/tutors/tutor-validation";
import {
  getTutorRequestContext,
  invalidTutorRequestResponse,
  parseTutorJsonBody,
  parseTutorPathId,
  tutorErrorResponse,
  tutorJsonResponse,
} from "@/features/tutors/tutor-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubjectRouteContext = {
  params: Promise<{ subjectId: string }>;
};

export async function GET(
  _request: Request,
  context: SubjectRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { subjectId } = await context.params;
  const parsedSubjectId = parseTutorPathId(subjectId);

  if (!parsedSubjectId.success) {
    return invalidTutorRequestResponse();
  }

  try {
    const subject = await getSubject(getDatabase(), parsedSubjectId.data);

    return tutorJsonResponse({ subject });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: SubjectRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { subjectId } = await context.params;
  const parsedSubjectId = parseTutorPathId(subjectId);

  if (!parsedSubjectId.success) {
    return invalidTutorRequestResponse();
  }

  const parsedBody = await parseTutorJsonBody(request, updateSubjectInputSchema);

  if (!parsedBody.success) {
    return invalidTutorRequestResponse(parsedBody.error);
  }

  try {
    const subject = await updateSubject(
      getDatabase(),
      parsedSubjectId.data,
      parsedBody.data,
      getTutorRequestContext(request, authorization.id),
    );

    return tutorJsonResponse({ subject });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}
