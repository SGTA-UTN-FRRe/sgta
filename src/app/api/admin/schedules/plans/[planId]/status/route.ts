import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { transitionSchedulePlanStatus } from "@/features/schedules/schedule-service";
import {
  getScheduleRequestContext,
  invalidScheduleRequestResponse,
  parseScheduleJsonBody,
  parseSchedulePathId,
  scheduleErrorResponse,
  scheduleJsonResponse,
  schedulePlanStatusRequestSchema,
} from "@/features/schedules/schedule-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SchedulePlanStatusRouteContext = {
  params: Promise<{ planId: string }>;
};

export async function PATCH(
  request: Request,
  context: SchedulePlanStatusRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { planId } = await context.params;
  const parsedPlanId = parseSchedulePathId(planId);

  if (!parsedPlanId.success) {
    return invalidScheduleRequestResponse();
  }

  const parsedBody = await parseScheduleJsonBody(
    request,
    schedulePlanStatusRequestSchema,
  );

  if (!parsedBody.success) {
    return invalidScheduleRequestResponse(parsedBody.error);
  }

  try {
    const plan = await transitionSchedulePlanStatus(
      getDatabase(),
      parsedPlanId.data,
      parsedBody.data,
      getScheduleRequestContext(request, authorization.id),
    );

    return scheduleJsonResponse({ plan });
  } catch (error) {
    return scheduleErrorResponse(error);
  }
}
