import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getTutorDetail,
  updateTutor,
} from "@/features/tutors/tutor-service";
import { updateTutorInputSchema } from "@/features/tutors/tutor-validation";
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

type TutorRouteContext = {
  params: Promise<{ tutorId: string }>;
};

async function getTutorId(context: TutorRouteContext) {
  const { tutorId } = await context.params;
  const parsed = parseTutorPathId(tutorId);

  return parsed.success ? parsed.data : null;
}

export async function GET(
  _request: Request,
  context: TutorRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const tutorId = await getTutorId(context);

  if (tutorId === null) {
    return invalidTutorRequestResponse();
  }

  try {
    const tutor = await getTutorDetail(getDatabase(), tutorId);

    return tutorJsonResponse({ tutor });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: TutorRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const tutorId = await getTutorId(context);

  if (tutorId === null) {
    return invalidTutorRequestResponse();
  }

  const parsedBody = await parseTutorJsonBody(request, updateTutorInputSchema);

  if (!parsedBody.success) {
    return invalidTutorRequestResponse(parsedBody.error);
  }

  try {
    const tutor = await updateTutor(
      getDatabase(),
      tutorId,
      parsedBody.data,
      getTutorRequestContext(request, authorization.id),
    );

    return tutorJsonResponse({ tutor });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}
