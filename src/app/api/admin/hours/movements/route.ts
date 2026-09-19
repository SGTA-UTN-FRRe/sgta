import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  hourErrorResponse,
  hourJsonResponse,
  getHourRequestContext,
  parseHourJsonBody,
  parseHourMovementHistoryQuery,
  hourMovementRequestSchema,
  invalidHourRequestResponse,
} from "@/features/hours/hour-api";
import {
  listHourMovements,
  recognizeRecovery,
  recordBulkHourMovement,
} from "@/features/hours/hour-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedQuery = parseHourMovementHistoryQuery(request);

  if (!parsedQuery.success) {
    return invalidHourRequestResponse(parsedQuery.error);
  }

  try {
    const movements = await listHourMovements(getDatabase(), parsedQuery.data);

    return hourJsonResponse({ movements });
  } catch (error) {
    return hourErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedBody = await parseHourJsonBody(request, hourMovementRequestSchema);

  if (!parsedBody.success) {
    return invalidHourRequestResponse(parsedBody.error);
  }

  const { operation, ...movementInput } = parsedBody.data;

  try {
    const result =
      operation === "RECOVERY"
        ? await recognizeRecovery(
            getDatabase(),
            movementInput,
            getHourRequestContext(request, authorization.id),
          )
        : await recordBulkHourMovement(
            getDatabase(),
            movementInput,
            getHourRequestContext(request, authorization.id),
          );

    return hourJsonResponse(result, 201);
  } catch (error) {
    return hourErrorResponse(error);
  }
}
