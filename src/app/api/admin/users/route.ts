import { z } from "zod";

import { requireApiRole } from "@/auth/authorization";
import { provisionUser, provisionUserInputSchema } from "@/auth/provisioning";
import { getAuditRequestContext } from "@/db/audit-request-context";
import { getDatabase } from "@/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function invalidRequestResponse() {
  return Response.json(
    { error: "invalid_request" },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
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
    return invalidRequestResponse();
  }

  const parsed = provisionUserInputSchema.safeParse(body);

  if (!parsed.success) {
    return invalidRequestResponse();
  }

  try {
    const requestContext = getAuditRequestContext(request);
    const user = await provisionUser(getDatabase(), parsed.data, {
      actorId: authorization.id,
      requestId: requestContext.requestId,
      ipAddress: requestContext.ipAddress,
      source: "admin",
    });

    return Response.json(
      { user },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return invalidRequestResponse();
    }

    return Response.json(
      { error: "internal_server_error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
