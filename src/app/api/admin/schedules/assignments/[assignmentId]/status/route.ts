import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { transitionScheduleAssignmentStatus } from "@/features/schedules/schedule-service";
import {
  getScheduleRequestContext,
  invalidScheduleRequestResponse,
  parseScheduleJsonBody,
  parseSchedulePathId,
  scheduleAssignmentStatusRequestSchema,
  scheduleErrorResponse,
  scheduleJsonResponse,
} from "@/features/schedules/schedule-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScheduleAssignmentStatusRouteContext = {
  params: Promise<{ assignmentId: string }>;
};

export async function PATCH(
  request: Request,
  context: ScheduleAssignmentStatusRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { assignmentId } = await context.params;
  const parsedAssignmentId = parseSchedulePathId(assignmentId);

  if (!parsedAssignmentId.success) {
    return invalidScheduleRequestResponse();
  }

  const parsedBody = await parseScheduleJsonBody(
    request,
    scheduleAssignmentStatusRequestSchema,
  );

  if (!parsedBody.success) {
    return invalidScheduleRequestResponse(parsedBody.error);
  }

  try {
    const assignment = await transitionScheduleAssignmentStatus(
      getDatabase(),
      parsedAssignmentId.data,
      parsedBody.data,
      getScheduleRequestContext(request, authorization.id),
    );

    return scheduleJsonResponse({ assignment });
  } catch (error) {
    return scheduleErrorResponse(error);
  }
}
