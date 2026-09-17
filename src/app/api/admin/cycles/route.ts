import { requireApiRole } from "@/auth/authorization";
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
    const cycle = await createAdministrativeCycle(getDatabase(), parsed, {
      actorId: authorization.id,
      requestId: getBoundedHeader(request, "x-request-id", 255),
      ipAddress: getRequestIpAddress(request),
    });

    return Response.json(
      { cycle },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return cycleErrorResponse(error);
  }
}
