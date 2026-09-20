import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  createScheduleAssignment,
  listScheduleAssignments,
} from "@/features/schedules/schedule-service";
import {
  getScheduleRequestContext,
  invalidScheduleRequestResponse,
  parseScheduleAssignmentListQuery,
  parseScheduleJsonBody,
  scheduleAssignmentCreateRequestSchema,
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

  const parsedQuery = parseScheduleAssignmentListQuery(request);

  if (!parsedQuery.success) {
    return invalidScheduleRequestResponse(parsedQuery.error);
  }

  try {
    const assignments = await listScheduleAssignments(
      getDatabase(),
      parsedQuery.data,
    );

    return scheduleJsonResponse({ assignments });
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
    scheduleAssignmentCreateRequestSchema,
  );

  if (!parsedBody.success) {
    return invalidScheduleRequestResponse(parsedBody.error);
  }

  try {
    const assignment = await createScheduleAssignment(
      getDatabase(),
      parsedBody.data,
      getScheduleRequestContext(request, authorization.id),
    );

    return scheduleJsonResponse({ assignment }, 201);
  } catch (error) {
    return scheduleErrorResponse(error);
  }
}
