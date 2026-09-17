import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getScholarshipReference,
  updateScholarshipReference,
} from "@/features/tutors/tutor-service";
import { updateScholarshipReferenceInputSchema } from "@/features/tutors/tutor-validation";
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

type ScholarshipReferenceRouteContext = {
  params: Promise<{ scholarshipReferenceId: string }>;
};

export async function GET(
  _request: Request,
  context: ScholarshipReferenceRouteContext,
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

  try {
    const scholarshipReference = await getScholarshipReference(
      getDatabase(),
      parsedId.data,
    );

    return tutorJsonResponse({ scholarshipReference });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: ScholarshipReferenceRouteContext,
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
    updateScholarshipReferenceInputSchema,
  );

  if (!parsedBody.success) {
    return invalidTutorRequestResponse(parsedBody.error);
  }

  try {
    const scholarshipReference = await updateScholarshipReference(
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
