import { z } from "zod";

import type { ServerEnv } from "@/config/env";
import {
  consultationAnomalyCodeEnum,
  consultationClassificationEnum,
  consultationDuplicateDecisionEnum,
  consultationImportRunStatusEnum,
  consultationSourceProviderEnum,
  consultationStagingStatusEnum,
  recordStatusEnum,
} from "@/db/schema";

const sourceHeaderSchema = z.string().trim().min(1).max(128);

export const consultationSourceHeaderMapSchema = z
  .object({
    career: sourceHeaderSchema,
    studentFirstName: sourceHeaderSchema,
    studentLastName: sourceHeaderSchema,
    consultationDate: sourceHeaderSchema,
    tutor: sourceHeaderSchema,
    academicStage: sourceHeaderSchema,
    modality: sourceHeaderSchema,
    topic: sourceHeaderSchema,
    contact: sourceHeaderSchema.optional(),
  })
  .strict()
  .superRefine((headers, context) => {
    const seenHeaders = new Set<string>();

    for (const [field, header] of Object.entries(headers)) {
      const normalized = header
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("en-US");

      if (seenHeaders.has(normalized)) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "source headers must map to distinct columns",
        });
      }

      seenHeaders.add(normalized);
    }
  });

export const consultationSourceConfigSchema = z
  .object({
    spreadsheetId: z.string().trim().min(1).max(256).regex(/^[A-Za-z0-9_-]+$/),
    range: z.string().trim().min(1).max(256),
    serviceAccountEmail: z.string().trim().email().max(320),
    privateKey: z
      .string()
      .trim()
      .min(1)
      .max(32_768)
      .regex(
        /^-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+-----END (?:RSA )?PRIVATE KEY-----$/,
        "must be a PEM private key",
      ),
    headerMap: consultationSourceHeaderMapSchema,
  })
  .strict();

export type ConsultationSourceConfig = z.output<
  typeof consultationSourceConfigSchema
>;

type GoogleSheetsEnvironment = Pick<
  ServerEnv,
  | "GOOGLE_SHEETS_SPREADSHEET_ID"
  | "GOOGLE_SHEETS_RANGE"
  | "GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL"
  | "GOOGLE_SHEETS_PRIVATE_KEY"
  | "GOOGLE_SHEETS_HEADER_MAP"
>;

export type ConsultationSourceConfigurationResult =
  | { status: "unavailable"; code: "source_not_configured" }
  | {
      status: "invalid";
      code: "source_configuration_invalid";
      issues: string[];
    }
  | { status: "configured"; config: ConsultationSourceConfig };

export function resolveConsultationSourceConfig(
  env: GoogleSheetsEnvironment,
): ConsultationSourceConfigurationResult {
  const values = [
    env.GOOGLE_SHEETS_SPREADSHEET_ID,
    env.GOOGLE_SHEETS_RANGE,
    env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL,
    env.GOOGLE_SHEETS_PRIVATE_KEY,
    env.GOOGLE_SHEETS_HEADER_MAP,
  ];

  if (values.every((value) => value === undefined)) {
    return { status: "unavailable", code: "source_not_configured" };
  }

  const headerMapValue = env.GOOGLE_SHEETS_HEADER_MAP;
  let headerMap: unknown;

  if (headerMapValue !== undefined) {
    if (headerMapValue.length > 4_096) {
      return {
        status: "invalid",
        code: "source_configuration_invalid",
        issues: ["GOOGLE_SHEETS_HEADER_MAP exceeds 4096 characters"],
      };
    }

    try {
      headerMap = JSON.parse(headerMapValue) as unknown;
    } catch {
      return {
        status: "invalid",
        code: "source_configuration_invalid",
        issues: ["GOOGLE_SHEETS_HEADER_MAP must contain valid JSON"],
      };
    }
  }

  const parsed = consultationSourceConfigSchema.safeParse({
    spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: env.GOOGLE_SHEETS_RANGE,
    serviceAccountEmail: env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    headerMap,
  });

  if (!parsed.success) {
    return {
      status: "invalid",
      code: "source_configuration_invalid",
      issues: parsed.error.issues.map((issue) => {
        const path = issue.path.map(String).join(".");
        return path.length === 0 ? issue.message : `${path}: ${issue.message}`;
      }),
    };
  }

  return { status: "configured", config: parsed.data };
}

const uuidSchema = z.string().trim().uuid().transform((value) => value.toLowerCase());
export const consultationIdSchema = uuidSchema;

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidDateOnly, "must be a valid calendar date");

const fingerprintSchema = z.string().regex(/^[0-9a-f]{64}$/);
const boundedSourceText = (maxLength: number) =>
  z.string().max(maxLength).nullable().optional();

export const consultationSourceIdentitySchema = z
  .object({
    provider: z.enum(consultationSourceProviderEnum.enumValues),
    spreadsheetId: z.string().trim().min(1).max(256),
    tab: z.string().trim().min(1).max(200),
    rowKey: z.string().trim().min(1).max(255),
  })
  .strict();

export const consultationSourceRowSchema = z
  .object({
    sourceRowKey: z.string().trim().min(1).max(255),
    sourceFingerprint: fingerprintSchema,
    career: boundedSourceText(300),
    studentFirstName: boundedSourceText(200),
    studentLastName: boundedSourceText(200),
    consultationDate: boundedSourceText(100),
    tutor: boundedSourceText(300),
    academicStage: boundedSourceText(200),
    modality: boundedSourceText(100),
    topic: boundedSourceText(4000),
    contact: boundedSourceText(320),
  })
  .strict();

export const consultationImportOptionsSchema = z
  .object({
    maxRows: z.number().int().min(1).max(5000).default(1000),
  })
  .strict();

export const consultationPaginationSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  })
  .strict();

export const consultationFiltersSchema = z
  .object({
    status: z
      .enum(["ALL", ...consultationStagingStatusEnum.enumValues])
      .default("ALL"),
    careerId: uuidSchema.optional(),
    tutorId: uuidSchema.optional(),
    fromDate: dateOnlySchema.optional(),
    toDate: dateOnlySchema.optional(),
    classification: z.enum(consultationClassificationEnum.enumValues).optional(),
    search: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  })
  .strict()
  .superRefine((filters, context) => {
    if (
      filters.fromDate !== undefined &&
      filters.toDate !== undefined &&
      filters.fromDate > filters.toDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "must be on or after fromDate",
      });
    }
  });

export const consultationReviewDetailQuerySchema = z
  .object({
    candidateLimit: z.coerce.number().int().min(1).max(100).default(50),
    candidateOffset: z.coerce.number().int().min(0).max(100_000).default(0),
  })
  .strict();

const duplicateDecisionSchema = z
  .object({
    candidateId: uuidSchema,
    decision: z.enum(
      consultationDuplicateDecisionEnum.enumValues.filter(
        (decision) => decision !== "PENDING",
      ) as ["DUPLICATE", "NOT_DUPLICATE"],
    ),
  })
  .strict();

export const consultationReviewDecisionSchema = z
  .object({
    expectedVersion: z.number().int().min(1),
    careerId: uuidSchema.optional(),
    tutorId: uuidSchema.optional(),
    consultationDate: dateOnlySchema.optional(),
    classification: z.enum(consultationClassificationEnum.enumValues).optional(),
    subjectId: uuidSchema.nullable().optional(),
    acknowledgedAnomalies: z
      .array(z.enum(consultationAnomalyCodeEnum.enumValues))
      .max(32)
      .optional(),
    duplicateDecisions: z.array(duplicateDecisionSchema).max(100).optional(),
  })
  .strict()
  .superRefine((decision, context) => {
    const hasReviewChange = Object.keys(decision).some(
      (key) => key !== "expectedVersion",
    );

    if (!hasReviewChange) {
      context.addIssue({
        code: "custom",
        path: ["expectedVersion"],
        message: "at least one review decision is required",
      });
    }

    if (decision.duplicateDecisions?.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["duplicateDecisions"],
        message: "at least one duplicate decision is required",
      });
    }
    if (decision.duplicateDecisions !== undefined) {
      const candidateIds = decision.duplicateDecisions.map(
        (duplicateDecision) => duplicateDecision.candidateId,
      );
      if (new Set(candidateIds).size !== candidateIds.length) {
        context.addIssue({
          code: "custom",
          path: ["duplicateDecisions"],
          message: "each candidate may be decided only once",
        });
      }
    }

    if (
      decision.classification === "SUBJECT" &&
      (decision.subjectId === undefined || decision.subjectId === null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["subjectId"],
        message: "is required for SUBJECT classification",
      });
    }

    if (
      decision.classification !== undefined &&
      decision.classification !== "SUBJECT" &&
      decision.subjectId !== undefined &&
      decision.subjectId !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["subjectId"],
        message: "must be empty unless classification is SUBJECT",
      });
    }
  });

export const consultationAnomalyCodeSchema = z.enum(
  consultationAnomalyCodeEnum.enumValues,
);
export type ConsultationAnomalyCode = z.output<
  typeof consultationAnomalyCodeSchema
>;

const nonNegativeIntegerSchema = z.number().int().min(0);
const safeTimestampSchema = z.string().trim().min(1).max(40);
const safeFailureCodeSchema = z.string().regex(/^[a-z0-9_]{1,80}$/);

export const consultationImportSummarySchema = z
  .object({
    runId: uuidSchema.nullable(),
    status: z.enum(consultationImportRunStatusEnum.enumValues).nullable(),
    startedAt: safeTimestampSchema.nullable(),
    completedAt: safeTimestampSchema.nullable(),
    lastSuccessfulAt: safeTimestampSchema.nullable(),
    newRows: nonNegativeIntegerSchema,
    alreadyProcessedRows: nonNegativeIntegerSchema,
    reviewRows: nonNegativeIntegerSchema,
    duplicateCandidates: nonNegativeIntegerSchema,
    errorRows: nonNegativeIntegerSchema,
    errorCode: safeFailureCodeSchema.nullable(),
  })
  .strict();

export const consultationListItemSchema = z
  .object({
    id: uuidSchema,
    stagingId: uuidSchema,
    status: z.enum(consultationStagingStatusEnum.enumValues),
    reviewVersion: z.number().int().min(1),
    consultationDate: dateOnlySchema,
    studentFirstName: z.string().trim().min(1).max(200),
    studentLastName: z.string().trim().min(1).max(200),
    studentContact: z.string().max(320).nullable(),
    career: z.string().trim().min(1).max(300),
    tutor: z.string().trim().min(1).max(300),
    academicStage: z.string().max(200).nullable(),
    modality: z.string().max(100).nullable(),
    rawTopic: z.string().max(4000).nullable(),
    classification: z.enum(["SUBJECT", "GENERAL"]),
    subject: z.string().trim().min(1).max(300).nullable(),
  })
  .strict();

export const consultationReviewDetailSchema = z
  .object({
    id: uuidSchema,
    status: z.enum(consultationStagingStatusEnum.enumValues),
    classification: z.enum(consultationClassificationEnum.enumValues),
    reviewVersion: z.number().int().min(1),
    sourceRow: consultationSourceRowSchema,
    normalized: z
      .object({
        career: z.string().max(300).nullable(),
        careerId: uuidSchema.nullable(),
        studentFirstName: z.string().max(200).nullable(),
        studentLastName: z.string().max(200).nullable(),
        consultationDate: dateOnlySchema.nullable(),
        tutor: z.string().max(300).nullable(),
        tutorId: uuidSchema.nullable(),
        academicStage: z.string().max(200).nullable(),
        modality: z.string().max(100).nullable(),
        topic: z.string().max(4000).nullable(),
        contact: z.string().max(320).nullable(),
      })
      .strict(),
    anomalyFlags: z.array(consultationAnomalyCodeSchema).max(32),
    acknowledgedAnomalies: z.array(consultationAnomalyCodeSchema).max(32),
    canonical: consultationListItemSchema.nullable(),
    duplicateCandidateCount: nonNegativeIntegerSchema,
    duplicateCandidatesOffset: nonNegativeIntegerSchema,
    duplicateCandidatesLimit: z.number().int().min(1).max(100),
    duplicateCandidates: z
      .array(
        z
          .object({
            candidateId: uuidSchema,
            peerStagingId: uuidSchema,
            decision: z.enum(consultationDuplicateDecisionEnum.enumValues),
            duplicateStagingId: uuidSchema.nullable(),
            isCurrentDuplicate: z.boolean(),
            peer: z
              .object({
                consultationDate: dateOnlySchema.nullable(),
                studentFirstName: z.string().max(200).nullable(),
                studentLastName: z.string().max(200).nullable(),
                career: z.string().max(300).nullable(),
                tutor: z.string().max(300).nullable(),
                status: z.enum(consultationStagingStatusEnum.enumValues),
                hasCanonical: z.boolean(),
              })
              .strict(),
          })
          .strict(),
      )
      .max(100),
    references: z
      .object({
        careers: z
          .array(
            z
              .object({
                id: uuidSchema,
                name: z.string().trim().min(1).max(300),
                status: z.enum(recordStatusEnum.enumValues),
              })
              .strict(),
          )
          .max(5000),
        tutors: z
          .array(
            z
              .object({
                id: uuidSchema,
                name: z.string().trim().min(1).max(300),
                status: z.enum(recordStatusEnum.enumValues),
              })
              .strict(),
          )
          .max(5000),
        subjects: z
          .array(
            z
              .object({
                id: uuidSchema,
                careerId: uuidSchema,
                name: z.string().trim().min(1).max(300),
                status: z.enum(recordStatusEnum.enumValues),
              })
              .strict(),
          )
          .max(5000),
      })
      .strict(),
  })
  .strict();

export const consultationWorkspaceSchema = z
  .object({
    rows: z.array(consultationListItemSchema).max(100),
    reviewQueue: z
      .array(
        z
          .object({
            stagingId: uuidSchema,
            consultationDate: dateOnlySchema.nullable(),
            studentFirstName: z.string().max(200).nullable(),
            studentLastName: z.string().max(200).nullable(),
            career: z.string().max(300).nullable(),
            tutor: z.string().max(300).nullable(),
            status: z.enum(consultationStagingStatusEnum.enumValues),
            classification: z.enum(consultationClassificationEnum.enumValues),
            reviewVersion: z.number().int().min(1),
            anomalyFlags: z.array(consultationAnomalyCodeSchema).max(32),
            acknowledgedAnomalies: z
              .array(consultationAnomalyCodeSchema)
              .max(32),
            hasCanonical: z.boolean(),
          })
          .strict(),
      )
      .max(100),
    pendingReviewCount: nonNegativeIntegerSchema,
    totalRows: nonNegativeIntegerSchema,
    import: consultationImportSummarySchema,
    pagination: consultationPaginationSchema,
  })
  .strict();

export type ConsultationSourceHeaderMap = z.output<
  typeof consultationSourceHeaderMapSchema
>;
export type ConsultationSourceIdentity = z.output<
  typeof consultationSourceIdentitySchema
>;
export type ConsultationSourceRow = z.output<typeof consultationSourceRowSchema>;
export type ConsultationImportOptions = z.output<
  typeof consultationImportOptionsSchema
>;
export type ConsultationFilters = z.output<typeof consultationFiltersSchema>;
export type ConsultationReviewDetailQuery = z.output<
  typeof consultationReviewDetailQuerySchema
>;
export type ConsultationReviewDecision = z.output<
  typeof consultationReviewDecisionSchema
>;
export type ConsultationImportSummary = z.output<
  typeof consultationImportSummarySchema
>;
export type ConsultationListItem = z.output<typeof consultationListItemSchema>;
export type ConsultationReviewDetail = z.output<
  typeof consultationReviewDetailSchema
>;
export type ConsultationWorkspace = z.output<typeof consultationWorkspaceSchema>;
