import { requireApiRole } from "@/auth/authorization";
import { getAuditRequestContext } from "@/db/audit-request-context";
import { getDatabase } from "@/db/client";
import {
  createAdministrativeCycle,
  parseCreateCycleInput,
  listAdministrativeCycles,
  type CreateCycleInput,
} from "@/features/cycles/cycle-service";

import {
  cycleErrorResponse,
  invalidCycleRequestResponse,
} from "@/features/cycles/cycle-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  try {
    const cycles = await listAdministrativeCycles(getDatabase());

    return Response.json(
      { cycles },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return cycleErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidCycleRequestResponse();
  }

  let parsed: ReturnType<typeof parseCreateCycleInput>;

  try {
    parsed = parseCreateCycleInput(body as CreateCycleInput);
  } catch (error) {
    return cycleErrorResponse(error);
  }

  try {
    const requestContext = getAuditRequestContext(request);
    const cycle = await createAdministrativeCycle(getDatabase(), parsed, {
      actorId: authorization.id,
      requestId: requestContext.requestId,
      ipAddress: requestContext.ipAddress,
    });

    return Response.json(
      { cycle },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return cycleErrorResponse(error);
  }
}
