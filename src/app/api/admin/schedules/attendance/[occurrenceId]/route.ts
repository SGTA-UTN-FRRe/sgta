import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  cancelAbsenceDebit,
  confirmAbsenceDebit,
  correctAttendance,
  getAttendanceOccurrence,
  recognizeScheduledRecovery,
  reopenAbsenceDebit,
  setAttendanceStatus,
} from "@/features/schedules/attendance-service";
import {
  attendanceErrorResponse,
  attendanceJsonResponse,
  attendanceMutationRequestSchema,
  getAttendanceRequestContext,
  invalidAttendanceRequestResponse,
  parseAttendanceJsonBody,
  parseAttendancePathId,
  toAttendanceServiceOperation,
} from "@/features/schedules/attendance-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AttendanceOccurrenceRouteContext = {
  params: Promise<{ occurrenceId: string }>;
};

export async function GET(
  request: Request,
  context: AttendanceOccurrenceRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { occurrenceId } = await context.params;
  const parsedOccurrenceId = parseAttendancePathId(occurrenceId);

  if (!parsedOccurrenceId.success) {
    return invalidAttendanceRequestResponse();
  }

  try {
    const attendance = await getAttendanceOccurrence(
      getDatabase(),
      parsedOccurrenceId.data,
      getAttendanceRequestContext(request, authorization.id),
    );

    return attendanceJsonResponse({ attendance });
  } catch (error) {
    return attendanceErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: AttendanceOccurrenceRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { occurrenceId } = await context.params;
  const parsedOccurrenceId = parseAttendancePathId(occurrenceId);

  if (!parsedOccurrenceId.success) {
    return invalidAttendanceRequestResponse();
  }

  const parsedBody = await parseAttendanceJsonBody(
    request,
    attendanceMutationRequestSchema,
  );

  if (!parsedBody.success) {
    return invalidAttendanceRequestResponse(parsedBody.error);
  }

  const operation = toAttendanceServiceOperation(parsedBody.data);

  try {
    const database = getDatabase();
    const requestContext = getAttendanceRequestContext(
      request,
      authorization.id,
    );
    let result;

    switch (operation.kind) {
      case "status":
        result = await setAttendanceStatus(
          database,
          parsedOccurrenceId.data,
          operation.input,
          requestContext,
        );
        break;
      case "cancel":
        result = await cancelAbsenceDebit(
          database,
          parsedOccurrenceId.data,
          operation.input,
          requestContext,
        );
        break;
      case "reopen":
        result = await reopenAbsenceDebit(
          database,
          parsedOccurrenceId.data,
          operation.input,
          requestContext,
        );
        break;
      case "confirm":
        result = await confirmAbsenceDebit(
          database,
          parsedOccurrenceId.data,
          operation.input,
          requestContext,
        );
        break;
      case "correct":
        result = await correctAttendance(
          database,
          parsedOccurrenceId.data,
          operation.input,
          requestContext,
        );
        break;
      case "recovery":
        result = await recognizeScheduledRecovery(
          database,
          parsedOccurrenceId.data,
          operation.input,
          requestContext,
        );
        break;
    }

    return attendanceJsonResponse(result);
  } catch (error) {
    return attendanceErrorResponse(error);
  }
}
