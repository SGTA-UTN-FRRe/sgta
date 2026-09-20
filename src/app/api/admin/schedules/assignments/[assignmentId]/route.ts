import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { updateScheduleAssignment } from "@/features/schedules/schedule-service";
import {
  getScheduleRequestContext,
  invalidScheduleRequestResponse,
  parseScheduleJsonBody,
  parseSchedulePathId,
  scheduleAssignmentUpdateRequestSchema,
  scheduleErrorResponse,
  scheduleJsonResponse,
} from "@/features/schedules/schedule-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScheduleAssignmentRouteContext = {
  params: Promise<{ assignmentId: string }>;
};

export async function PATCH(
  request: Request,
  context: ScheduleAssignmentRouteContext,
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
    scheduleAssignmentUpdateRequestSchema,
  );

  if (!parsedBody.success) {
    return invalidScheduleRequestResponse(parsedBody.error);
  }

  try {
    const assignment = await updateScheduleAssignment(
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
