import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  getScheduleWorkspace,
} from "@/features/schedules/schedule-service";
import {
  getScheduleRequestContext,
  invalidScheduleRequestResponse,
  parseScheduleWorkspaceQuery,
  scheduleErrorResponse,
  scheduleJsonResponse,
} from "@/features/schedules/schedule-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedQuery = parseScheduleWorkspaceQuery(request);

  if (!parsedQuery.success) {
    return invalidScheduleRequestResponse(parsedQuery.error);
  }

  try {
    const workspace = await getScheduleWorkspace(
      getDatabase(),
      parsedQuery.data,
      getScheduleRequestContext(request, authorization.id),
    );

    return scheduleJsonResponse(workspace);
  } catch (error) {
    return scheduleErrorResponse(error);
  }
}
