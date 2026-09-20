import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  createSchedulePlan,
  listSchedulePlans,
} from "@/features/schedules/schedule-service";
import {
  getScheduleRequestContext,
  invalidScheduleRequestResponse,
  parseScheduleJsonBody,
  parseSchedulePlanListQuery,
  scheduleErrorResponse,
  scheduleJsonResponse,
  schedulePlanCreateRequestSchema,
} from "@/features/schedules/schedule-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedQuery = parseSchedulePlanListQuery(request);

  if (!parsedQuery.success) {
    return invalidScheduleRequestResponse(parsedQuery.error);
  }

  try {
    const plans = await listSchedulePlans(getDatabase(), parsedQuery.data);

    return scheduleJsonResponse({ plans });
  } catch (error) {
    return scheduleErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedBody = await parseScheduleJsonBody(
    request,
    schedulePlanCreateRequestSchema,
  );

  if (!parsedBody.success) {
    return invalidScheduleRequestResponse(parsedBody.error);
  }

  try {
    const plan = await createSchedulePlan(
      getDatabase(),
      parsedBody.data,
      getScheduleRequestContext(request, authorization.id),
    );

    return scheduleJsonResponse({ plan }, 201);
  } catch (error) {
    return scheduleErrorResponse(error);
  }
}
