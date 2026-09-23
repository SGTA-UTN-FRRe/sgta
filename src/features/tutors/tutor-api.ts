import "server-only";

import { z } from "zod";

import { getAuditRequestContext } from "@/db/audit-request-context";

import {
  TUTOR_ERROR_CODES,
  TutorServiceError,
  type TutorMutationContext,
  type TutorServiceErrorCode,
} from "./tutor-service";
import {
  tutorIdSchema,
  tutorSearchFiltersSchema,
} from "./tutor-validation";

const noStoreHeaders = { "Cache-Control": "no-store" };

const notFoundCodes: TutorServiceErrorCode[] = [
  TUTOR_ERROR_CODES.tutorNotFound,
  TUTOR_ERROR_CODES.careerNotFound,
  TUTOR_ERROR_CODES.subjectNotFound,
  TUTOR_ERROR_CODES.scholarshipReferenceNotFound,
  TUTOR_ERROR_CODES.cycleNotFound,
  TUTOR_ERROR_CODES.applicationAccountNotFound,
];

const conflictCodes: TutorServiceErrorCode[] = [
  TUTOR_ERROR_CODES.cycleNotOpen,
  TUTOR_ERROR_CODES.openCycleRequired,
  TUTOR_ERROR_CODES.duplicateInstitutionalIdentifier,
  TUTOR_ERROR_CODES.duplicateCareerName,
  TUTOR_ERROR_CODES.duplicateSubjectName,
  TUTOR_ERROR_CODES.duplicateScholarshipReferenceType,
  TUTOR_ERROR_CODES.duplicateSubjectAssignment,
  TUTOR_ERROR_CODES.duplicateCycleMembership,
  TUTOR_ERROR_CODES.applicationAccountNotTutor,
  TUTOR_ERROR_CODES.applicationAccountDisabled,
  TUTOR_ERROR_CODES.applicationAccountAlreadyLinked,
  TUTOR_ERROR_CODES.careerSubjectMismatch,
  TUTOR_ERROR_CODES.catalogConflict,
  TUTOR_ERROR_CODES.inactiveCareer,
  TUTOR_ERROR_CODES.inactiveSubject,
  TUTOR_ERROR_CODES.inactiveScholarshipReference,
  TUTOR_ERROR_CODES.invalidReferenceValue,
  TUTOR_ERROR_CODES.statusAlreadySet,
];

const validationCodes: TutorServiceErrorCode[] = [
  TUTOR_ERROR_CODES.validationError,
  TUTOR_ERROR_CODES.cycleRequiredForMembershipChange,
  TUTOR_ERROR_CODES.invalidStatusTransition,
];

export function tutorJsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(body, {
    status,
    headers: noStoreHeaders,
  });
}

export function invalidTutorRequestResponse(error?: z.ZodError) {
  if (error === undefined) {
    return tutorJsonResponse({ error: "invalid_request" }, 400);
  }

  return tutorJsonResponse(
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

export function tutorErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return invalidTutorRequestResponse(error);
  }

  if (error instanceof TutorServiceError) {
    if (error.code === TUTOR_ERROR_CODES.queryFailed ||
        error.code === TUTOR_ERROR_CODES.transactionFailed) {
      return tutorJsonResponse({ error: "internal_server_error" }, 500);
    }

    const status = notFoundCodes.includes(error.code)
      ? 404
      : conflictCodes.includes(error.code)
        ? 409
        : validationCodes.includes(error.code)
          ? 400
          : 400;
    const errorCode =
      error.code === TUTOR_ERROR_CODES.validationError
        ? "invalid_request"
        : error.code;

    return tutorJsonResponse(
      {
        error: errorCode,
        ...(error.issues === undefined ? {} : { issues: error.issues }),
      },
      status,
    );
  }

  return tutorJsonResponse({ error: "internal_server_error" }, 500);
}

export function getTutorRequestContext(
  request: Request,
  actorId: string,
): TutorMutationContext {
  const requestContext = getAuditRequestContext(request);

  return {
    actorId,
    requestId: requestContext.requestId,
    ipAddress: requestContext.ipAddress,
  };
}

export async function parseTutorJsonBody<T extends z.ZodType>(
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

function normalizeStatusQuery(value: string) {
  return value.trim().toUpperCase();
}

export function parseTutorListQuery(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const input: Record<string, unknown> = {};

  for (const [key, value] of searchParams.entries()) {
    if (
      key !== "search" &&
      key !== "careerId" &&
      key !== "status" &&
      key !== "offset" &&
      key !== "limit"
    ) {
      input[key] = value;
      continue;
    }

    input[key] = key === "status" ? normalizeStatusQuery(value) : value;
  }

  if (input.search === undefined) {
    input.search = "";
  }

  return tutorSearchFiltersSchema.safeParse(input);
}

const referenceListQuerySchema = z
  .object({
    status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  })
  .strict();

const subjectListQuerySchema = referenceListQuerySchema.extend({
  activeCareerOnly: z.boolean().default(false),
});

function getQueryObject(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const input: Record<string, unknown> = {};

  for (const [key, value] of searchParams.entries()) {
    if (key === "status") {
      input.status = normalizeStatusQuery(value);
    } else if (key === "activeCareerOnly") {
      input.activeCareerOnly = value;
    } else {
      input[key] = value;
    }
  }

  return input;
}

export function parseReferenceListQuery(request: Request) {
  return referenceListQuerySchema.safeParse(getQueryObject(request));
}

export function parseSubjectListQuery(request: Request) {
  const input = getQueryObject(request);

  if (typeof input.activeCareerOnly === "string") {
    if (input.activeCareerOnly === "true") {
      input.activeCareerOnly = true;
    } else if (input.activeCareerOnly === "false") {
      input.activeCareerOnly = false;
    }
  }

  return subjectListQuerySchema.safeParse(input);
}

export function parseTutorPathId(value: string) {
  return tutorIdSchema.safeParse(value);
}
