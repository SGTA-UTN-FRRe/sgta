import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { getCurrentAdministrativeCycle } from "@/features/cycles/cycle-service";

import { cycleErrorResponse } from "@/features/cycles/cycle-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  try {
    const cycle = await getCurrentAdministrativeCycle(getDatabase());

    return Response.json(
      { cycle },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return cycleErrorResponse(error);
  }
}
