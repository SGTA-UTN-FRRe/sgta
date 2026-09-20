import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { listAttendanceForDate } from "@/features/schedules/attendance-service";
import {
  attendanceErrorResponse,
  attendanceJsonResponse,
  getAttendanceRequestContext,
  invalidAttendanceRequestResponse,
  parseAttendanceDateQuery,
} from "@/features/schedules/attendance-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedQuery = parseAttendanceDateQuery(request);

  if (!parsedQuery.success) {
    return invalidAttendanceRequestResponse(parsedQuery.error);
  }

  try {
    const attendance = await listAttendanceForDate(
      getDatabase(),
      parsedQuery.data,
      getAttendanceRequestContext(request, authorization.id),
    );

    return attendanceJsonResponse(attendance);
  } catch (error) {
    return attendanceErrorResponse(error);
  }
}
