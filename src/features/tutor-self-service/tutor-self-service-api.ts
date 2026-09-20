import "server-only";

import { z } from "zod";

import {
  TUTOR_SELF_SERVICE_ERROR_CODES,
  TutorSelfServiceError,
  type TutorSelfServiceErrorCode,
} from "./tutor-self-service-service";
import {
  tutorSelfServiceHoursQuerySchema,
  tutorSelfServiceScheduleQuerySchema,
  tutorSelfServiceSummaryQuerySchema,
} from "./tutor-self-service-validation";

const noStoreHeaders = { "Cache-Control": "no-store" };

export const TUTOR_SELF_SERVICE_API_ERROR_CODES = {
  accountNotLinked: "account_not_linked",
  cycleMembershipRequired: "cycle_membership_required",
  dateOutsideCycle: "date_outside_cycle",
  internalServerError: "internal_server_error",
  invalidRequest: "invalid_request",
  methodNotAllowed: "method_not_allowed",
  openCycleRequired: "open_cycle_required",
  specialPlanOverlap: "special_plan_overlap",
} as const;

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

export function parseTutorSelfServiceSummaryQuery(request: Request) {
  return tutorSelfServiceSummaryQuerySchema.safeParse(getQueryObject(request));
}

export function parseTutorSelfServiceScheduleQuery(request: Request) {
  return tutorSelfServiceScheduleQuerySchema.safeParse(getQueryObject(request));
}

export function parseTutorSelfServiceHoursQuery(request: Request) {
  return tutorSelfServiceHoursQuerySchema.safeParse(getQueryObject(request));
}

export function tutorSelfServiceJsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export function invalidTutorSelfServiceRequestResponse(error?: z.ZodError) {
  return tutorSelfServiceJsonResponse(
    {
      error: TUTOR_SELF_SERVICE_API_ERROR_CODES.invalidRequest,
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

const conflictCodes = new Set<TutorSelfServiceErrorCode>([
  TUTOR_SELF_SERVICE_ERROR_CODES.dateOutsideCycle,
  TUTOR_SELF_SERVICE_ERROR_CODES.specialPlanOverlap,
]);

export function tutorSelfServiceErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return invalidTutorSelfServiceRequestResponse(error);
  }

  if (error instanceof TutorSelfServiceError) {
    if (error.code === TUTOR_SELF_SERVICE_ERROR_CODES.queryFailed) {
      return tutorSelfServiceJsonResponse(
        { error: TUTOR_SELF_SERVICE_API_ERROR_CODES.internalServerError },
        500,
      );
    }

    if (error.code === TUTOR_SELF_SERVICE_ERROR_CODES.ownerNotAllowed) {
      return tutorSelfServiceJsonResponse({ error: "forbidden" }, 403);
    }

    const code =
      error.code === TUTOR_SELF_SERVICE_ERROR_CODES.ownerNotFound
        ? TUTOR_SELF_SERVICE_API_ERROR_CODES.accountNotLinked
        : error.code === TUTOR_SELF_SERVICE_ERROR_CODES.validationError
          ? TUTOR_SELF_SERVICE_API_ERROR_CODES.invalidRequest
          : error.code === TUTOR_SELF_SERVICE_ERROR_CODES.dateOutsideCycle
            ? TUTOR_SELF_SERVICE_API_ERROR_CODES.dateOutsideCycle
            : error.code === TUTOR_SELF_SERVICE_ERROR_CODES.specialPlanOverlap
              ? TUTOR_SELF_SERVICE_API_ERROR_CODES.specialPlanOverlap
              : error.code;
    const status =
      error.code === TUTOR_SELF_SERVICE_ERROR_CODES.validationError
        ? 400
        : conflictCodes.has(error.code)
          ? 409
          : 400;

    return tutorSelfServiceJsonResponse({ error: code }, status);
  }

  return tutorSelfServiceJsonResponse(
    { error: TUTOR_SELF_SERVICE_API_ERROR_CODES.internalServerError },
    500,
  );
}

export function tutorSelfServiceMethodNotAllowedResponse() {
  return new Response(
    JSON.stringify({
      error: TUTOR_SELF_SERVICE_API_ERROR_CODES.methodNotAllowed,
    }),
    {
      status: 405,
      headers: {
        Allow: "GET",
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    },
  );
}
