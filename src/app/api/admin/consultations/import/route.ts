import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  consultationErrorResponse,
  consultationJsonResponse,
  getConsultationRequestContext,
  invalidConsultationRequestResponse,
  parseConsultationImportBody,
} from "@/features/consultations/consultation-api";
import { runConsultationImport } from "@/features/consultations/consultation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authorization = await requireApiRole("ADMIN");
  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedBody = await parseConsultationImportBody(request);
  if (!parsedBody.success) {
    return invalidConsultationRequestResponse(parsedBody.error);
  }

  try {
    const result = await runConsultationImport(
      getDatabase(),
      parsedBody.data,
      getConsultationRequestContext(request, authorization.id),
    );
    if (result.outcome === "conflict") {
      return consultationJsonResponse(
        { error: "import_already_running", summary: result.summary },
        409,
      );
    }
    if (result.outcome === "failed") {
      return consultationJsonResponse(
        { error: "import_unavailable", summary: result.summary },
        503,
      );
    }
    return consultationJsonResponse(result);
  } catch (error) {
    return consultationErrorResponse(error);
  }
}
