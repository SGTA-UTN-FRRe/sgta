import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  consultationErrorResponse,
  consultationJsonResponse,
  getConsultationRequestContext,
  invalidConsultationRequestResponse,
  parseConsultationPathId,
  parseConsultationReviewDetailQuery,
  parseConsultationReviewBody,
} from "@/features/consultations/consultation-api";
import {
  decideConsultationReview,
  getConsultationReview,
} from "@/features/consultations/consultation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConsultationReviewRouteContext = {
  params: Promise<{ stagingId: string }>;
};

async function getStagingId(context: ConsultationReviewRouteContext) {
  const { stagingId } = await context.params;
  const parsed = parseConsultationPathId(stagingId);
  return parsed.success ? parsed.data : null;
}

export async function GET(
  request: Request,
  context: ConsultationReviewRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");
  if (authorization instanceof Response) {
    return authorization;
  }

  const stagingId = await getStagingId(context);
  if (stagingId === null) {
    return invalidConsultationRequestResponse();
  }

  const parsedQuery = parseConsultationReviewDetailQuery(request);
  if (!parsedQuery.success) {
    return invalidConsultationRequestResponse(parsedQuery.error);
  }

  try {
    const review = await getConsultationReview(
      getDatabase(),
      stagingId,
      parsedQuery.data,
    );
    return consultationJsonResponse({ review });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: ConsultationReviewRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");
  if (authorization instanceof Response) {
    return authorization;
  }

  const stagingId = await getStagingId(context);
  if (stagingId === null) {
    return invalidConsultationRequestResponse();
  }

  const parsedBody = await parseConsultationReviewBody(request);
  if (!parsedBody.success) {
    return invalidConsultationRequestResponse(parsedBody.error);
  }

  try {
    const result = await decideConsultationReview(
      getDatabase(),
      stagingId,
      parsedBody.data,
      getConsultationRequestContext(request, authorization.id),
    );
    return consultationJsonResponse(result);
  } catch (error) {
    return consultationErrorResponse(error);
  }
}
