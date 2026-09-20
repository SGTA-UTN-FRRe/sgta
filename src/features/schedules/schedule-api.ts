import "server-only";

import { z } from "zod";

import {
  SCHEDULE_ERROR_CODES,
  ScheduleServiceError,
  type ScheduleMutationContext,
  type ScheduleServiceErrorCode,
} from "./schedule-service";
import {
  createScheduleAssignmentInputSchema,
  createSchedulePlanInputSchema,
  scheduleAssignmentListInputSchema,
  scheduleAssignmentStatusInputSchema,
  schedulePlanListInputSchema,
  schedulePlanStatusInputSchema,
  scheduleWorkspaceInputSchema,
  updateScheduleAssignmentInputSchema,
  updateSchedulePlanInputSchema,
  scheduleIdentifierSchema,
} from "./schedule-validation";

const noStoreHeaders = { "Cache-Control": "no-store" };

const notFoundCodes: ScheduleServiceErrorCode[] = [
  SCHEDULE_ERROR_CODES.actorNotFound,
  SCHEDULE_ERROR_CODES.assignmentNotFound,
  SCHEDULE_ERROR_CODES.cycleNotFound,
  SCHEDULE_ERROR_CODES.planNotFound,
  SCHEDULE_ERROR_CODES.tutorNotFound,
];

const conflictCodes: ScheduleServiceErrorCode[] = [
  SCHEDULE_ERROR_CODES.assignmentConflict,
  SCHEDULE_ERROR_CODES.assignmentDateOutsidePlan,
  SCHEDULE_ERROR_CODES.cycleNotOpen,
  SCHEDULE_ERROR_CODES.dateOutsideCycle,
  SCHEDULE_ERROR_CODES.inactiveTutor,
  SCHEDULE_ERROR_CODES.openCycleRequired,
  SCHEDULE_ERROR_CODES.planHasOccurrences,
  SCHEDULE_ERROR_CODES.planValidityOutsideCycle,
  SCHEDULE_ERROR_CODES.regularPlanConflict,
  SCHEDULE_ERROR_CODES.specialPlanOverlap,
  SCHEDULE_ERROR_CODES.statusAlreadySet,
  SCHEDULE_ERROR_CODES.tutorNotInCycle,
];

const validationCodes: ScheduleServiceErrorCode[] = [
  SCHEDULE_ERROR_CODES.actorRequired,
  SCHEDULE_ERROR_CODES.validationError,
];

export function scheduleJsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export function invalidScheduleRequestResponse(error?: z.ZodError) {
  return scheduleJsonResponse(
    {
      error: "invalid_request",
      ...(error === undefined
        ? {}
        : {
            issues: error.issues.slice(0, 20).map((issue) => ({
              code: issue.code,
              path: issue.path.filter(
                (segment): segment is string | number =>
                  typeof segment === "string" || typeof segment === "number",
              ),
              message: issue.message,
            })),
          }),
    },
    400,
  );
}

export function scheduleErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return invalidScheduleRequestResponse(error);
  }

  if (error instanceof ScheduleServiceError) {
    if (
      error.code === SCHEDULE_ERROR_CODES.queryFailed ||
      error.code === SCHEDULE_ERROR_CODES.transactionFailed ||
      error.code === SCHEDULE_ERROR_CODES.occurrenceCreationFailed
    ) {
      return scheduleJsonResponse({ error: "internal_server_error" }, 500);
    }

    const status = notFoundCodes.includes(error.code)
      ? 404
      : conflictCodes.includes(error.code)
        ? 409
        : validationCodes.includes(error.code)
          ? 400
          : 400;
    const errorCode =
      error.code === SCHEDULE_ERROR_CODES.validationError
        ? "invalid_request"
        : error.code;

    return scheduleJsonResponse(
      {
        error: errorCode,
        ...(error.issues === undefined
          ? {}
          : { issues: error.issues.slice(0, 20) }),
      },
      status,
    );
  }

  return scheduleJsonResponse({ error: "internal_server_error" }, 500);
}

function getBoundedHeader(request: Request, name: string, maxLength: number) {
  const value = request.headers.get(name)?.trim();

  if (value === undefined || value.length === 0 || value.length > maxLength) {
    return undefined;
  }

  return value;
}

export function getScheduleRequestContext(
  request: Request,
  actorId: string,
): ScheduleMutationContext {
  const forwardedFor = getBoundedHeader(request, "x-forwarded-for", 512);
  const forwardedAddress = forwardedFor?.split(",", 1)[0]?.trim();

  return {
    actorId,
    requestId: getBoundedHeader(request, "x-request-id", 255),
    ipAddress:
      forwardedAddress !== undefined && forwardedAddress.length <= 45
        ? forwardedAddress
        : getBoundedHeader(request, "x-real-ip", 45),
  };
}

export async function parseScheduleJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<
  | { success: true; data: z.output<T> }
  | { success: false; error?: z.ZodError }
> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { success: false };
  }

  const parsed = schema.safeParse(body);

  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, error: parsed.error };
}

function getQueryObject(request: Request) {
  const input: Record<string, unknown> = {};

  for (const [key, value] of new URL(request.url).searchParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      input[key] = [input[key], value];
    } else {
      input[key] = value;
    }
  }

  return input;
}

export function parseScheduleWorkspaceQuery(request: Request) {
  return scheduleWorkspaceInputSchema.safeParse(getQueryObject(request));
}

export function parseSchedulePlanListQuery(request: Request) {
  return schedulePlanListInputSchema.safeParse(getQueryObject(request));
}

export function parseScheduleAssignmentListQuery(request: Request) {
  return scheduleAssignmentListInputSchema.safeParse(getQueryObject(request));
}

export function parseSchedulePathId(value: string) {
  return scheduleIdentifierSchema.safeParse(value);
}

export const schedulePlanCreateRequestSchema = createSchedulePlanInputSchema;
export const schedulePlanUpdateRequestSchema = updateSchedulePlanInputSchema;
export const schedulePlanStatusRequestSchema = schedulePlanStatusInputSchema;
export const scheduleAssignmentCreateRequestSchema =
  createScheduleAssignmentInputSchema;
export const scheduleAssignmentUpdateRequestSchema =
  updateScheduleAssignmentInputSchema;
export const scheduleAssignmentStatusRequestSchema =
  scheduleAssignmentStatusInputSchema;
