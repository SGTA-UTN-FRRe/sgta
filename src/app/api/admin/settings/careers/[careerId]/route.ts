import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getCareer,
  updateCareer,
} from "@/features/tutors/tutor-service";
import { updateCareerInputSchema } from "@/features/tutors/tutor-validation";
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

type CareerRouteContext = {
  params: Promise<{ careerId: string }>;
};

export async function GET(
  _request: Request,
  context: CareerRouteContext,
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

  try {
    const career = await getCareer(getDatabase(), parsedCareerId.data);

    return tutorJsonResponse({ career });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: CareerRouteContext,
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

  const parsedBody = await parseTutorJsonBody(request, updateCareerInputSchema);

  if (!parsedBody.success) {
    return invalidTutorRequestResponse(parsedBody.error);
  }

  try {
    const career = await updateCareer(
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
