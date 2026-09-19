import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getHourRequestContext,
  hourErrorResponse,
  hourJsonResponse,
  invalidHourRequestResponse,
  parseHourPathId,
  parseOptionalEmptyHourJsonBody,
} from "@/features/hours/hour-api";
import { reverseHourMovement } from "@/features/hours/hour-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HourMovementReverseRouteContext = {
  params: Promise<{ movementId: string }>;
};

export async function POST(
  request: Request,
  context: HourMovementReverseRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { movementId } = await context.params;
  const parsedMovementId = parseHourPathId(movementId);

  if (!parsedMovementId.success) {
    return invalidHourRequestResponse();
  }

  const parsedBody = await parseOptionalEmptyHourJsonBody(request);

  if (!parsedBody.success) {
    return invalidHourRequestResponse(parsedBody.error);
  }

  try {
    const result = await reverseHourMovement(
      getDatabase(),
      parsedMovementId.data,
      getHourRequestContext(request, authorization.id),
    );

    return hourJsonResponse(result, 201);
  } catch (error) {
    return hourErrorResponse(error);
  }
}
