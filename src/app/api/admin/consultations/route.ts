import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  consultationErrorResponse,
  consultationJsonResponse,
  invalidConsultationRequestResponse,
  parseConsultationListQuery,
} from "@/features/consultations/consultation-api";
import { getConsultationWorkspace } from "@/features/consultations/consultation-service";

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
    const workspace = await getConsultationWorkspace(
      getDatabase(),
      parsedQuery.data,
    );
    return consultationJsonResponse(workspace);
  } catch (error) {
    return consultationErrorResponse(error);
  }
}
