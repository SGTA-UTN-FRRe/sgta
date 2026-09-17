import { requireApiRole } from "@/auth/authorization";
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

function getBoundedHeader(request: Request, name: string, maxLength: number) {
  const value = request.headers.get(name)?.trim();

  if (value === undefined || value.length === 0 || value.length > maxLength) {
    return undefined;
  }

  return value;
}

function getRequestIpAddress(request: Request) {
  const forwardedFor = getBoundedHeader(request, "x-forwarded-for", 512);
  const candidate = forwardedFor?.split(",", 1)[0]?.trim();

  if (candidate !== undefined && candidate.length <= 45) {
    return candidate;
  }

  return getBoundedHeader(request, "x-real-ip", 45);
}

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
    const cycle = await closeAdministrativeCycle(getDatabase(), cycleId, {
      actorId: authorization.id,
      requestId: getBoundedHeader(request, "x-request-id", 255),
      ipAddress: getRequestIpAddress(request),
    });

    return Response.json(
      { cycle },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return cycleErrorResponse(error);
  }
}
