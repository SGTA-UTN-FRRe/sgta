import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { getHourWorkspace } from "@/features/hours/hour-service";
import {
  HOUR_API_ERROR_CODES,
  hourErrorResponse,
  hourJsonResponse,
} from "@/features/hours/hour-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  try {
    const workspace = await getHourWorkspace(getDatabase());

    if (workspace.categories.length === 0) {
      return hourJsonResponse(
        { error: HOUR_API_ERROR_CODES.noActiveCategories },
        409,
      );
    }

    if (workspace.eligibleTutors.length === 0) {
      return hourJsonResponse(
        { error: HOUR_API_ERROR_CODES.noEligibleTutors },
        409,
      );
    }

    return hourJsonResponse(workspace);
  } catch (error) {
    return hourErrorResponse(error);
  }
}
