import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  consultationErrorResponse,
  consultationJsonResponse,
  getConsultationRequestContext,
  invalidConsultationRequestResponse,
  parseConsultationBulkBody,
  parseConsultationListQuery,
} from "@/features/consultations/consultation-api";
import {
  bulkConsolidateConsultations,
  getConsultationBulkSelection,
} from "@/features/consultations/consultation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await requireApiRole("ADMIN");
  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedQuery = parseConsultationListQuery(request);
  if (!parsedQuery.success) {
    return invalidConsultationRequestResponse(parsedQuery.error);
  }

  try {
    const selection = await getConsultationBulkSelection(
      getDatabase(),
      parsedQuery.data,
    );
    return consultationJsonResponse(selection);
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const authorization = await requireApiRole("ADMIN");
  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedBody = await parseConsultationBulkBody(request);
  if (!parsedBody.success) {
    return invalidConsultationRequestResponse(parsedBody.error);
  }

  try {
    const result = await bulkConsolidateConsultations(
      getDatabase(),
      parsedBody.data,
      getConsultationRequestContext(request, authorization.id),
    );
    return consultationJsonResponse(result);
  } catch (error) {
    return consultationErrorResponse(error);
  }
}
