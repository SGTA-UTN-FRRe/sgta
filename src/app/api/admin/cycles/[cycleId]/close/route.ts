import { requireApiRole } from "@/auth/authorization";
import { getAuditRequestContext } from "@/db/audit-request-context";
import { getDatabase } from "@/db/client";
import {
  closeAdministrativeCycle,
  parseCycleId,
} from "@/features/cycles/cycle-service";

import {
  cycleErrorResponse,
  invalidCycleRequestResponse,
} from "@/features/cycles/cycle-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CloseCycleRouteContext = {
  params: Promise<{ cycleId: string }>;
};

export async function POST(
  request: Request,
  context: CloseCycleRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { cycleId } = await context.params;

  try {
    parseCycleId(cycleId);
  } catch {
    return invalidCycleRequestResponse();
  }

  try {
    const requestContext = getAuditRequestContext(request);
    const cycle = await closeAdministrativeCycle(getDatabase(), cycleId, {
      actorId: authorization.id,
      requestId: requestContext.requestId,
      ipAddress: requestContext.ipAddress,
    });

    return Response.json(
      { cycle },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return cycleErrorResponse(error);
  }
}
