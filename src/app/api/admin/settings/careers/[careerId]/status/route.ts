import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { transitionCareerStatus } from "@/features/tutors/tutor-service";
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

type CareerStatusRouteContext = {
  params: Promise<{ careerId: string }>;
};

export async function PATCH(
  request: Request,
  context: CareerStatusRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { careerId } = await context.params;
  const parsedCareerId = parseTutorPathId(careerId);

  if (!parsedCareerId.success) {
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
    const career = await transitionCareerStatus(
      getDatabase(),
      parsedCareerId.data,
      parsedBody.data,
      getTutorRequestContext(request, authorization.id),
    );

    return tutorJsonResponse({ career });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}
