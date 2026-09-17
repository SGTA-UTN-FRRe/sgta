import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { transitionScholarshipReferenceStatus } from "@/features/tutors/tutor-service";
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

type ScholarshipReferenceStatusRouteContext = {
  params: Promise<{ scholarshipReferenceId: string }>;
};

export async function PATCH(
  request: Request,
  context: ScholarshipReferenceStatusRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { scholarshipReferenceId } = await context.params;
  const parsedId = parseTutorPathId(scholarshipReferenceId);

  if (!parsedId.success) {
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
    const scholarshipReference = await transitionScholarshipReferenceStatus(
      getDatabase(),
      parsedId.data,
      parsedBody.data,
      getTutorRequestContext(request, authorization.id),
    );

    return tutorJsonResponse({ scholarshipReference });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}
