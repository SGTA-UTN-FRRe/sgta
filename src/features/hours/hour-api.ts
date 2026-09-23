import "server-only";

import { z } from "zod";

import { getAuditRequestContext } from "@/db/audit-request-context";

import {
  HOUR_ERROR_CODES,
  HourServiceError,
  type HourMutationContext,
  type HourServiceErrorCode,
} from "./hour-service";
import {
  hourCategoryStatusSchema,
  hourIdSchema,
  hourMovementHistoryInputSchema,
  recordHourMovementRequestSchema,
} from "./hour-validation";

const noStoreHeaders = { "Cache-Control": "no-store" };

const notFoundCodes: HourServiceErrorCode[] = [
  HOUR_ERROR_CODES.actorNotFound,
  HOUR_ERROR_CODES.categoryNotFound,
  HOUR_ERROR_CODES.cycleNotFound,
  HOUR_ERROR_CODES.movementNotFound,
  HOUR_ERROR_CODES.tutorNotFound,
];

const conflictCodes: HourServiceErrorCode[] = [
  HOUR_ERROR_CODES.activityCreditRequired,
  HOUR_ERROR_CODES.cycleNotOpen,
  HOUR_ERROR_CODES.inactiveCategory,
  HOUR_ERROR_CODES.inactiveTutor,
  HOUR_ERROR_CODES.movementAlreadyReversed,
  HOUR_ERROR_CODES.movementDateOutsideCycle,
  HOUR_ERROR_CODES.openCycleRequired,
  HOUR_ERROR_CODES.recoveryCategoryRequired,
  HOUR_ERROR_CODES.reversalTargetInvalid,
  HOUR_ERROR_CODES.statusAlreadySet,
  HOUR_ERROR_CODES.tutorNotInCycle,
  HOUR_ERROR_CODES.duplicateCategoryName,
];

const validationCodes: HourServiceErrorCode[] = [
  HOUR_ERROR_CODES.actorRequired,
  HOUR_ERROR_CODES.validationError,
];

const categoryListQuerySchema = z
  .object({
    status: hourCategoryStatusSchema.default("ALL"),
  })
  .strict();

const emptyJsonObjectSchema = z.object({}).strict();

export const HOUR_API_ERROR_CODES = {
  noActiveCategories: "no_active_categories",
  noEligibleTutors: "no_eligible_tutors",
} as const;

export const hourMovementRequestSchema = recordHourMovementRequestSchema;

export function hourJsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(body, {
    status,
    headers: noStoreHeaders,
  });
}

export function invalidHourRequestResponse(error?: z.ZodError) {
  if (error === undefined) {
    return hourJsonResponse({ error: "invalid_request" }, 400);
  }

  return hourJsonResponse(
    {
      error: "invalid_request",
      issues: error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.filter(
          (segment): segment is string | number =>
            typeof segment === "string" || typeof segment === "number",
        ),
        message: issue.message,
      })),
    },
    400,
  );
}

export function hourErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return invalidHourRequestResponse(error);
  }

  if (error instanceof HourServiceError) {
    if (
      error.code === HOUR_ERROR_CODES.queryFailed ||
      error.code === HOUR_ERROR_CODES.transactionFailed
    ) {
      return hourJsonResponse({ error: "internal_server_error" }, 500);
    }

    const status = notFoundCodes.includes(error.code)
      ? 404
      : conflictCodes.includes(error.code)
        ? 409
        : validationCodes.includes(error.code)
          ? 400
          : 400;
    const errorCode =
      error.code === HOUR_ERROR_CODES.validationError
        ? "invalid_request"
        : error.code;

    return hourJsonResponse(
      {
        error: errorCode,
        ...(error.issues === undefined ? {} : { issues: error.issues }),
      },
      status,
    );
  }

  return hourJsonResponse({ error: "internal_server_error" }, 500);
}

export function getHourRequestContext(
  request: Request,
  actorId: string,
): HourMutationContext {
  const requestContext = getAuditRequestContext(request);

  return {
    actorId,
    requestId: requestContext.requestId,
    ipAddress: requestContext.ipAddress,
  };
}

export async function parseHourJsonBody<T extends z.ZodType>(
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

export async function parseOptionalEmptyHourJsonBody(request: Request) {
  let body: unknown;

  try {
    const text = await request.text();

    if (text.trim().length === 0) {
      return { success: true as const, data: {} };
    }

    body = JSON.parse(text) as unknown;
  } catch {
    return { success: false as const };
  }

  const parsed = emptyJsonObjectSchema.safeParse(body);

  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, error: parsed.error };
}

function normalizeStatusQuery(value: string) {
  return value.trim().toUpperCase();
}

function getQueryObject(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const input: Record<string, unknown> = {};

  for (const [key, value] of searchParams.entries()) {
    if (
      key !== "cycleId" &&
      key !== "tutorId" &&
      key !== "categoryId" &&
      key !== "offset" &&
      key !== "limit"
    ) {
      input[key] = value;
      continue;
    }

    input[key] = value;
  }

  return input;
}

export function parseHourMovementHistoryQuery(request: Request) {
  return hourMovementHistoryInputSchema.safeParse(getQueryObject(request));
}

export function parseHourCategoryListQuery(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const input: Record<string, unknown> = {};

  for (const [key, value] of searchParams.entries()) {
    if (key === "status") {
      input.status = normalizeStatusQuery(value);
    } else {
      input[key] = value;
    }
  }

  return categoryListQuerySchema.safeParse(input);
}

export function parseHourPathId(value: string) {
  return hourIdSchema.safeParse(value);
}
