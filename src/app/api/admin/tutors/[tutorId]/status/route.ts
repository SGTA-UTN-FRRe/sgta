import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { transitionTutorStatus } from "@/features/tutors/tutor-service";
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

type TutorStatusRouteContext = {
  params: Promise<{ tutorId: string }>;
};

export async function PATCH(
  request: Request,
  context: TutorStatusRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { tutorId } = await context.params;
  const parsedTutorId = parseTutorPathId(tutorId);

  if (!parsedTutorId.success) {
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
    const tutor = await transitionTutorStatus(
      getDatabase(),
      parsedTutorId.data,
      parsedBody.data,
      getTutorRequestContext(request, authorization.id),
    );

    return tutorJsonResponse({ tutor });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}
