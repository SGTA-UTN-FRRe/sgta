import "server-only";

import { isIP } from "node:net";
import { z } from "zod";

import {
  CONSULTATION_ERROR_CODES,
  ConsultationServiceError,
  type ConsultationRequestContext,
} from "./consultation-service";
import {
  consultationFiltersSchema,
  consultationIdSchema,
  consultationImportOptionsSchema,
  consultationReviewDetailQuerySchema,
  consultationReviewDecisionSchema,
} from "./consultation-validation";

const noStoreHeaders = { "Cache-Control": "no-store" };
const maxReviewBodyBytes = 16 * 1024;
const maxImportBodyBytes = 4 * 1024;

export function consultationJsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export function invalidConsultationRequestResponse(error?: z.ZodError) {
  if (error === undefined) {
    return consultationJsonResponse({ error: "invalid_request" }, 400);
  }

  return consultationJsonResponse(
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

export function consultationErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return invalidConsultationRequestResponse(error);
  }
  if (error instanceof ConsultationServiceError) {
    const status =
      error.code === CONSULTATION_ERROR_CODES.notFound
        ? 404
        : error.code === CONSULTATION_ERROR_CODES.staleReview ||
            error.code === CONSULTATION_ERROR_CODES.duplicateDecisionConflict ||
            error.code === CONSULTATION_ERROR_CODES.canonicalDuplicateConflict
          ? 409
          : error.code === CONSULTATION_ERROR_CODES.queryFailed ||
              error.code === CONSULTATION_ERROR_CODES.transactionFailed
            ? 503
            : 400;
    const code =
      error.code === CONSULTATION_ERROR_CODES.queryFailed ||
      error.code === CONSULTATION_ERROR_CODES.transactionFailed
        ? "consultations_unavailable"
        : error.code;
    return consultationJsonResponse({ error: code }, status);
  }

  return consultationJsonResponse({ error: "internal_server_error" }, 500);
}

async function parseBoundedJson<T extends z.ZodType>(
  request: Request,
  schema: T,
  maxBytes: number,
): Promise<
  | { success: true; data: z.output<T> }
  | { success: false; error?: z.ZodError }
> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > maxBytes) {
    return { success: false };
  }

  const reader = request.body?.getReader();
  if (reader === undefined) {
    return { success: false };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { success: false };
      }
      chunks.push(value);
    }
  } catch {
    return { success: false };
  }

  let body: unknown;
  try {
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    return { success: false };
  }

  const parsed = schema.safeParse(body);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, error: parsed.error };
}

export function parseConsultationReviewBody(request: Request) {
  return parseBoundedJson(request, consultationReviewDecisionSchema, maxReviewBodyBytes);
}

export function parseConsultationImportBody(request: Request) {
  return parseBoundedJson(request, consultationImportOptionsSchema, maxImportBodyBytes);
}

const consultationQueryKeys = new Set([
  "status",
  "careerId",
  "tutorId",
  "fromDate",
  "toDate",
  "classification",
  "search",
  "limit",
  "offset",
]);

export function parseConsultationListQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  const input: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!consultationQueryKeys.has(key) || Object.hasOwn(input, key)) {
      return { success: false as const };
    }
    input[key] = value;
  }

  const parsed = consultationFiltersSchema.safeParse(input);
  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, error: parsed.error };
}

export function parseConsultationPathId(value: string) {
  return consultationIdSchema.safeParse(value);
}

export function parseConsultationReviewDetailQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  const input: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (
      (key !== "candidateLimit" && key !== "candidateOffset") ||
      Object.hasOwn(input, key)
    ) {
      return { success: false as const };
    }
    input[key] = value;
  }
  const parsed = consultationReviewDetailQuerySchema.safeParse(input);
  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, error: parsed.error };
}

function boundedHeader(request: Request, name: string, maxLength: number) {
  const value = request.headers.get(name)?.trim();
  if (
    value === undefined ||
    value.length === 0 ||
    value.length > maxLength ||
    !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    return undefined;
  }
  return value;
}

export function getConsultationRequestContext(
  request: Request,
  actorId: string,
): ConsultationRequestContext {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const forwardedIp = forwardedFor !== undefined && isIP(forwardedFor) !== 0
    ? forwardedFor
    : undefined;
  const realIp = boundedHeader(request, "x-real-ip", 45);
  return {
    actorId,
    requestId: boundedHeader(request, "x-request-id", 255),
    ipAddress: forwardedIp ?? (realIp !== undefined && isIP(realIp) !== 0 ? realIp : undefined),
  };
}
