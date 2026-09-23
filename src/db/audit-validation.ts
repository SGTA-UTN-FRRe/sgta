import { isIP } from "node:net";
import { z } from "zod";

export type SafeJsonPrimitive = string | number | boolean | null;
export type SafeJsonValue =
  | SafeJsonPrimitive
  | SafeJsonValue[]
  | { [key: string]: SafeJsonValue };
export type SafeAuditMetadata = { [key: string]: SafeJsonValue };

export const MAX_AUDIT_METADATA_BYTES = 8 * 1024;
export const MAX_AUDIT_METADATA_DEPTH = 4;
export const MAX_AUDIT_METADATA_KEYS = 64;
export const MAX_AUDIT_METADATA_STRING_LENGTH = 1_000;

const forbiddenKeyFragments = [
  "authorization",
  "authheader",
  "bearer",
  "cookie",
  "credential",
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "privatekey",
  "providerprofile",
  "profile",
  "email",
  "student",
  "contact",
  "phone",
  "address",
  "dateofbirth",
  "birthdate",
  "institutionalidentifier",
  "name",
  "telephone",
];

type ValidationState = {
  entries: number;
  activeObjects: Set<object>;
};

function normalizedKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function hasForbiddenKey(key: string) {
  const normalized = normalizedKey(key);
  return forbiddenKeyFragments.some((fragment) => normalized.includes(fragment));
}

function validateValue(
  value: unknown,
  depth: number,
  path: string,
  state: ValidationState,
): string | null {
  if (value === null || typeof value === "boolean") {
    return null;
  }

  if (typeof value === "string") {
    if (value.length > MAX_AUDIT_METADATA_STRING_LENGTH) {
      return `${path} contains a string longer than ${MAX_AUDIT_METADATA_STRING_LENGTH} characters`;
    }

    if (/^(?:bearer|basic)\s+/i.test(value)) {
      return `${path} contains an authorization value`;
    }

    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)) {
      return `${path} contains personal contact data`;
    }

    const digits = value.match(/\d/g)?.length ?? 0;
    if (digits >= 9 && /^[+().\-\s\d]+$/.test(value)) {
      return `${path} contains personal contact data`;
    }

    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? null : `${path} must contain finite numbers`;
  }

  if (typeof value !== "object" || value === null) {
    return `${path} must contain JSON-compatible values`;
  }

  if (depth > MAX_AUDIT_METADATA_DEPTH) {
    return `metadata exceeds the maximum depth of ${MAX_AUDIT_METADATA_DEPTH}`;
  }

  if (state.activeObjects.has(value)) {
    return `${path} contains a circular reference`;
  }

  state.activeObjects.add(value);

  try {
    if (Array.isArray(value)) {
      if (value.length > MAX_AUDIT_METADATA_KEYS) {
        return `${path} contains more than ${MAX_AUDIT_METADATA_KEYS} entries`;
      }

      for (const [index, item] of value.entries()) {
        state.entries += 1;
        if (state.entries > MAX_AUDIT_METADATA_KEYS) {
          return `metadata contains more than ${MAX_AUDIT_METADATA_KEYS} entries`;
        }

        const issue = validateValue(item, depth + 1, `${path}[${index}]`, state);
        if (issue !== null) {
          return issue;
        }
      }

      return null;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return `${path} must contain plain JSON objects`;
    }

    const entries = Object.entries(value);
    if (entries.length > MAX_AUDIT_METADATA_KEYS) {
      return `${path} contains more than ${MAX_AUDIT_METADATA_KEYS} keys`;
    }

    for (const [key, item] of entries) {
      if (key.length === 0 || key.length > 100) {
        return `${path} contains an invalid metadata key`;
      }

      if (hasForbiddenKey(key)) {
        return `${path}.${key} is not allowed in audit metadata`;
      }

      state.entries += 1;
      if (state.entries > MAX_AUDIT_METADATA_KEYS) {
        return `metadata contains more than ${MAX_AUDIT_METADATA_KEYS} entries`;
      }

      const issue = validateValue(item, depth + 1, `${path}.${key}`, state);
      if (issue !== null) {
        return issue;
      }
    }

    return null;
  } finally {
    state.activeObjects.delete(value);
  }
}

export function validateSafeAuditMetadata(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "metadata must be a JSON object";
  }

  const issue = validateValue(value, 0, "metadata", {
    entries: 0,
    activeObjects: new Set(),
  });

  if (issue !== null) {
    return issue;
  }

  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      return "metadata must be JSON serializable";
    }

    const bytes = new TextEncoder().encode(serialized).byteLength;
    if (bytes > MAX_AUDIT_METADATA_BYTES) {
      return `metadata exceeds the maximum size of ${MAX_AUDIT_METADATA_BYTES} bytes`;
    }
  } catch {
    return "metadata must be JSON serializable";
  }

  return null;
}

export function isSafeAuditRequestId(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const requestId = value.trim();
  if (
    requestId.length === 0 ||
    requestId.length > 255 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(requestId)
  ) {
    return false;
  }

  return (
    !/^(?:bearer|basic|token|secret|password|sk|pk|ghp|github_pat|ya29|AIza)[._:-]/i.test(
      requestId,
    ) &&
    !/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2}$/.test(requestId) &&
    !/^\d[\d-]{6,}$/.test(requestId)
  );
}

export const safeAuditMetadataSchema = z.custom<SafeAuditMetadata>(
  (value) => validateSafeAuditMetadata(value) === null,
  {
    message:
      "metadata must be bounded JSON without credentials, personal contact data, authorization values, passwords, tokens, or provider profiles",
  },
);

const requiredAuditText = (max: number) =>
  z.string().trim().min(1).max(max);

const optionalAuditText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).max(max).optional(),
  );

const optionalRequestId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .max(255)
    .refine(isSafeAuditRequestId, "requestId must be a bounded opaque identifier")
    .optional(),
);

const optionalIpAddress = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .max(45)
    .refine((value) => isIP(value) !== 0, "ipAddress must be a valid IP address")
    .optional(),
);

export const auditEventInputSchema = z
  .object({
    actorId: optionalAuditText(255).nullable().optional(),
    action: requiredAuditText(100),
    entityType: requiredAuditText(100),
    entityId: requiredAuditText(255),
    metadata: safeAuditMetadataSchema.optional().default({}),
    requestId: optionalRequestId.nullable().optional(),
    ipAddress: optionalIpAddress.nullable().optional(),
  })
  .strict();

export type AuditEventInput = z.input<typeof auditEventInputSchema>;
export type ParsedAuditEventInput = z.output<typeof auditEventInputSchema>;

export function parseAuditEventInput(input: AuditEventInput): ParsedAuditEventInput {
  return auditEventInputSchema.parse(input);
}
