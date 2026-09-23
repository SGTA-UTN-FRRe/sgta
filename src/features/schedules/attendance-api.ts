import "server-only";

import { z } from "zod";

import { getAuditRequestContext } from "@/db/audit-request-context";

import {
  ATTENDANCE_ERROR_CODES,
  AttendanceServiceError,
  type AttendanceMutationContext,
  type AttendanceServiceErrorCode,
} from "./attendance-service";
import {
  absenceDebitInputSchema,
  attendanceCorrectionInputSchema,
  attendanceDateInputSchema,
  attendanceEmptyInputSchema,
  attendanceStatusInputSchema,
  recoveryRecognitionInputSchema,
} from "./attendance-validation";
import { scheduleIdentifierSchema } from "./schedule-validation";

const noStoreHeaders = { "Cache-Control": "no-store" };

const attendanceMutationOperationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("PRESENT") }).strict(),
  z.object({ operation: z.literal("ABSENT") }).strict(),
  z.object({ operation: z.literal("CANCEL_DEBIT") }).strict(),
  z.object({ operation: z.literal("REOPEN_DEBIT") }).strict(),
  z
    .object({
      operation: z.literal("CONFIRM_DEBIT"),
      categoryId: scheduleIdentifierSchema,
      debitMinutes: z.number().int().min(1).max(1_440).optional(),
      note: z
        .string()
        .trim()
        .min(1)
        .max(2_000)
        .nullable()
        .optional(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("CORRECT"),
      status: z.enum(["PRESENT", "ABSENT"]),
      categoryId: scheduleIdentifierSchema.optional(),
      debitMinutes: z.number().int().min(1).max(1_440).optional(),
      note: z
        .string()
        .trim()
        .min(1)
        .max(2_000)
        .nullable()
        .optional(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("RECOGNIZE_RECOVERY"),
      categoryId: scheduleIdentifierSchema,
      note: z
        .string()
        .trim()
        .min(1)
        .max(2_000)
        .nullable()
        .optional(),
    })
    .strict(),
]);

export const attendanceMutationRequestSchema = z.union([
  attendanceMutationOperationSchema,
  attendanceStatusInputSchema,
  attendanceEmptyInputSchema,
  absenceDebitInputSchema,
  attendanceCorrectionInputSchema,
  recoveryRecognitionInputSchema,
]);

export type AttendanceMutationRequest = z.output<
  typeof attendanceMutationRequestSchema
>;

export function attendanceJsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export function invalidAttendanceRequestResponse(error?: z.ZodError) {
  return attendanceJsonResponse(
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

const notFoundCodes: AttendanceServiceErrorCode[] = [
  ATTENDANCE_ERROR_CODES.actorNotFound,
  ATTENDANCE_ERROR_CODES.attendanceNotFound,
  ATTENDANCE_ERROR_CODES.categoryNotFound,
  ATTENDANCE_ERROR_CODES.cycleNotFound,
  ATTENDANCE_ERROR_CODES.occurrenceNotFound,
];

const conflictCodes: AttendanceServiceErrorCode[] = [
  ATTENDANCE_ERROR_CODES.absenceProposalNotFound,
  ATTENDANCE_ERROR_CODES.cycleNotOpen,
  ATTENDANCE_ERROR_CODES.correctionRequired,
  ATTENDANCE_ERROR_CODES.dateOutsideCycle,
  ATTENDANCE_ERROR_CODES.debitAlreadyConfirmed,
  ATTENDANCE_ERROR_CODES.debitFieldsRequireAbsence,
  ATTENDANCE_ERROR_CODES.debitMinutesInvalid,
  ATTENDANCE_ERROR_CODES.inactiveCategory,
  ATTENDANCE_ERROR_CODES.recoveryAlreadyRecognized,
  ATTENDANCE_ERROR_CODES.recoveryCategoryRequired,
  ATTENDANCE_ERROR_CODES.recoveryNotEligible,
  ATTENDANCE_ERROR_CODES.scheduleConflict,
  ATTENDANCE_ERROR_CODES.statusAlreadySet,
];

const validationCodes: AttendanceServiceErrorCode[] = [
  ATTENDANCE_ERROR_CODES.actorRequired,
  ATTENDANCE_ERROR_CODES.validationError,
];

export function attendanceErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return invalidAttendanceRequestResponse(error);
  }

  if (error instanceof AttendanceServiceError) {
    if (
      error.code === ATTENDANCE_ERROR_CODES.queryFailed ||
      error.code === ATTENDANCE_ERROR_CODES.transactionFailed
    ) {
      return attendanceJsonResponse({ error: "internal_server_error" }, 500);
    }

    const status = notFoundCodes.includes(error.code)
      ? 404
      : conflictCodes.includes(error.code)
        ? 409
        : validationCodes.includes(error.code)
          ? 400
          : 400;
    const errorCode =
      error.code === ATTENDANCE_ERROR_CODES.validationError
        ? "invalid_request"
        : error.code;

    return attendanceJsonResponse(
      {
        error: errorCode,
        ...(error.issues === undefined
          ? {}
          : { issues: error.issues.slice(0, 20) }),
      },
      status,
    );
  }

  return attendanceJsonResponse({ error: "internal_server_error" }, 500);
}

export function getAttendanceRequestContext(
  request: Request,
  actorId: string,
): AttendanceMutationContext {
  const requestContext = getAuditRequestContext(request);

  return {
    actorId,
    requestId: requestContext.requestId,
    ipAddress: requestContext.ipAddress,
  };
}

export async function parseAttendanceJsonBody<T extends z.ZodType>(
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

export function parseAttendanceDateQuery(request: Request) {
  return attendanceDateInputSchema.safeParse(getQueryObject(request));
}

export function parseAttendancePathId(value: string) {
  return scheduleIdentifierSchema.safeParse(value);
}

export function parseAttendanceMutationRequest(input: unknown) {
  return attendanceMutationRequestSchema.safeParse(input);
}

export function toAttendanceServiceOperation(input: AttendanceMutationRequest) {
  if ("operation" in input) {
    switch (input.operation) {
      case "PRESENT":
      case "ABSENT":
        return { kind: "status" as const, input: { status: input.operation } };
      case "CANCEL_DEBIT":
        return { kind: "cancel" as const, input: {} };
      case "REOPEN_DEBIT":
        return { kind: "reopen" as const, input: {} };
      case "CONFIRM_DEBIT":
        return {
          kind: "confirm" as const,
          input: {
            categoryId: input.categoryId,
            debitMinutes: input.debitMinutes,
            note: input.note,
          },
        };
      case "CORRECT":
        return {
          kind: "correct" as const,
          input: {
            status: input.status,
            categoryId: input.categoryId,
            debitMinutes: input.debitMinutes,
            note: input.note,
          },
        };
      case "RECOGNIZE_RECOVERY":
        return {
          kind: "recovery" as const,
          input: { categoryId: input.categoryId, note: input.note },
        };
    }
  }

  if ("status" in input) {
    if (
      "categoryId" in input ||
      "debitMinutes" in input ||
      "note" in input
    ) {
      return { kind: "correct" as const, input };
    }

    return { kind: "status" as const, input };
  }

  if ("categoryId" in input) {
    return { kind: "confirm" as const, input };
  }

  return { kind: "cancel" as const, input: {} };
}
