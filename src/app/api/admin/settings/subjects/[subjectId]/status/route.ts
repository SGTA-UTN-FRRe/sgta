import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { transitionSubjectStatus } from "@/features/tutors/tutor-service";
import { statusTransitionInputSchema } from "@/features/tutors/tutor-validation";
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

type SubjectStatusRouteContext = {
  params: Promise<{ subjectId: string }>;
};

export async function PATCH(
  request: Request,
  context: SubjectStatusRouteContext,
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

  const parsedBody = await parseTutorJsonBody(
    request,
    statusTransitionInputSchema,
  );

  if (!parsedBody.success) {
    return invalidTutorRequestResponse(parsedBody.error);
  }

  try {
    const subject = await transitionSubjectStatus(
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
