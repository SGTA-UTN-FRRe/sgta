import { z } from "zod";

import type { RecordStatus } from "@/db/schema";

const MAX_NAME_LENGTH = 200;
const MAX_IDENTIFIER_LENGTH = 100;
const MAX_EMAIL_LENGTH = 320;
const MAX_NOTES_LENGTH = 2_000;

export const tutorIdSchema = z.string().trim().uuid().transform((value) => value.toLowerCase());

const requiredText = (max: number) => z.string().trim().min(1).max(max);

const optionalNullableText = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return value;
      }

      if (typeof value === "string" && value.trim().length === 0) {
        return null;
      }

      return value;
    },
    z.union([z.string().trim().min(1).max(max), z.null()]).optional(),
  );

const optionalNullableEmail = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return value;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return null;
    }

    return value;
  },
  z.union([
    z
      .string()
      .trim()
      .max(MAX_EMAIL_LENGTH)
      .email()
      .transform((value) => value.toLowerCase()),
    z.null(),
  ]).optional(),
);

const nullableEmail = z.preprocess(
  (value) => {
    if (value === null) {
      return null;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return null;
    }

    return value;
  },
  z.union([
    z
      .string()
      .trim()
      .max(MAX_EMAIL_LENGTH)
      .email()
      .transform((value) => value.toLowerCase()),
    z.null(),
  ]),
);

const optionalNumber = (options: { min: number; max: number }) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim().length > 0) {
        return Number(value);
      }

      return value;
    },
    z.number().int().min(options.min).max(options.max),
  );

function addDuplicateIssues(values: string[], message: string, context: z.RefinementCtx) {
  const firstIndexByValue = new Map<string, number>();

  values.forEach((value, index) => {
    const firstIndex = firstIndexByValue.get(value);

    if (firstIndex !== undefined) {
      context.addIssue({
        code: "custom",
        path: [index],
        message,
      });
      return;
    }

    firstIndexByValue.set(value, index);
  });
}

export const subjectIdsSchema = z
  .array(tutorIdSchema)
  .max(100)
  .superRefine((values, context) => {
    addDuplicateIssues(values, "subject IDs must be unique", context);
  });

export const tutorSubjectAssignmentsSchema = z
  .object({
    subjectIds: subjectIdsSchema,
  })
  .strict();

export const currentCycleMembershipSchema = z
  .object({
    cycleId: tutorIdSchema,
    scholarshipReferenceId: tutorIdSchema.nullable().optional().default(null),
  })
  .strict();

export const subjectAssignmentInputSchema = tutorSubjectAssignmentsSchema;
export const currentCycleMembershipInputSchema = currentCycleMembershipSchema;

export const recordStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export const tutorListStatusSchema = z.enum(["ALL", "ACTIVE", "INACTIVE"]);

export const createTutorInputSchema = z
  .object({
    firstName: requiredText(MAX_NAME_LENGTH),
    lastName: requiredText(MAX_NAME_LENGTH),
    preferredDisplayName: optionalNullableText(MAX_NAME_LENGTH),
    institutionalIdentifier: optionalNullableText(MAX_IDENTIFIER_LENGTH),
    applicationEmail: optionalNullableEmail,
    primaryCareerId: tutorIdSchema,
    subjectIds: subjectIdsSchema.default([]),
    cycleId: tutorIdSchema,
    scholarshipReferenceId: tutorIdSchema.nullable().optional().default(null),
  })
  .strict();

export const updateTutorInputSchema = z
  .object({
    firstName: requiredText(MAX_NAME_LENGTH).optional(),
    lastName: requiredText(MAX_NAME_LENGTH).optional(),
    preferredDisplayName: optionalNullableText(MAX_NAME_LENGTH),
    institutionalIdentifier: optionalNullableText(MAX_IDENTIFIER_LENGTH),
    applicationEmail: optionalNullableEmail,
    primaryCareerId: tutorIdSchema.optional(),
    subjectIds: subjectIdsSchema.optional(),
    cycleId: tutorIdSchema.optional(),
    scholarshipReferenceId: tutorIdSchema.nullable().optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (Object.keys(input).length === 0) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "at least one tutor field is required",
      });
    }

    if (
      input.scholarshipReferenceId !== undefined &&
      input.cycleId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["cycleId"],
        message: "cycleId is required when changing scholarshipReferenceId",
      });
    }
  });

export const tutorApplicationAccountInputSchema = z
  .object({
    applicationEmail: nullableEmail,
  })
  .strict();

export const statusTransitionInputSchema = z
  .object({
    status: recordStatusSchema,
  })
  .strict();

const searchTextSchema = z.preprocess(
  (value) => (value === undefined || value === null ? "" : value),
  z.string().trim().max(100),
);

const boundedOffsetSchema = optionalNumber({ min: 0, max: 10_000 }).optional().default(0);
const boundedLimitSchema = optionalNumber({ min: 1, max: 200 }).optional().default(50);

export const tutorSearchFiltersSchema = z
  .object({
    search: searchTextSchema,
    careerId: tutorIdSchema.optional(),
    status: tutorListStatusSchema.optional().default("ALL"),
    offset: boundedOffsetSchema,
    limit: boundedLimitSchema,
  })
  .strict();

export const createCareerInputSchema = z
  .object({
    name: requiredText(MAX_NAME_LENGTH),
  })
  .strict();

export const updateCareerInputSchema = z
  .object({
    name: requiredText(MAX_NAME_LENGTH).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.name === undefined) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "name is required",
      });
    }
  });

export const createSubjectInputSchema = z
  .object({
    careerId: tutorIdSchema,
    name: requiredText(MAX_NAME_LENGTH),
  })
  .strict();

export const updateSubjectInputSchema = z
  .object({
    careerId: tutorIdSchema.optional(),
    name: requiredText(MAX_NAME_LENGTH).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.careerId === undefined && input.name === undefined) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "careerId or name is required",
      });
    }
  });

export const createScholarshipReferenceInputSchema = z
  .object({
    type: requiredText(MAX_NAME_LENGTH),
    knownRequiredHours: optionalNumber({ min: 0, max: 100_000 })
      .nullable()
      .optional()
      .default(null),
    notes: optionalNullableText(MAX_NOTES_LENGTH).default(null),
  })
  .strict();

export const updateScholarshipReferenceInputSchema = z
  .object({
    type: requiredText(MAX_NAME_LENGTH).optional(),
    knownRequiredHours: optionalNumber({ min: 0, max: 100_000 })
      .nullable()
      .optional(),
    notes: optionalNullableText(MAX_NOTES_LENGTH),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.type === undefined &&
      input.knownRequiredHours === undefined &&
      input.notes === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "at least one scholarship reference field is required",
      });
    }
  });

export type RecordStatusInput = z.input<typeof recordStatusSchema>;
export type CreateTutorInput = z.input<typeof createTutorInputSchema>;
export type ParsedCreateTutorInput = z.output<typeof createTutorInputSchema>;
export type UpdateTutorInput = z.input<typeof updateTutorInputSchema>;
export type ParsedUpdateTutorInput = z.output<typeof updateTutorInputSchema>;
export type TutorApplicationAccountInput = z.input<
  typeof tutorApplicationAccountInputSchema
>;
export type ParsedTutorApplicationAccountInput = z.output<
  typeof tutorApplicationAccountInputSchema
>;
export type StatusTransitionInput = z.input<typeof statusTransitionInputSchema>;
export type ParsedStatusTransitionInput = z.output<
  typeof statusTransitionInputSchema
>;
export type TutorSearchFilters = z.input<typeof tutorSearchFiltersSchema>;
export type ParsedTutorSearchFilters = z.output<typeof tutorSearchFiltersSchema>;
export type CreateCareerInput = z.input<typeof createCareerInputSchema>;
export type ParsedCreateCareerInput = z.output<typeof createCareerInputSchema>;
export type UpdateCareerInput = z.input<typeof updateCareerInputSchema>;
export type ParsedUpdateCareerInput = z.output<typeof updateCareerInputSchema>;
export type CreateSubjectInput = z.input<typeof createSubjectInputSchema>;
export type ParsedCreateSubjectInput = z.output<typeof createSubjectInputSchema>;
export type UpdateSubjectInput = z.input<typeof updateSubjectInputSchema>;
export type ParsedUpdateSubjectInput = z.output<typeof updateSubjectInputSchema>;
export type CreateScholarshipReferenceInput = z.input<
  typeof createScholarshipReferenceInputSchema
>;
export type ParsedCreateScholarshipReferenceInput = z.output<
  typeof createScholarshipReferenceInputSchema
>;
export type UpdateScholarshipReferenceInput = z.input<
  typeof updateScholarshipReferenceInputSchema
>;
export type ParsedUpdateScholarshipReferenceInput = z.output<
  typeof updateScholarshipReferenceInputSchema
>;

export function normalizeName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-AR");
}

export const normalizeCatalogName = normalizeName;

export function normalizeInstitutionalIdentifier(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("es-AR");
}

export function parseCreateTutorInput(input: unknown): ParsedCreateTutorInput {
  return createTutorInputSchema.parse(input);
}

export function parseUpdateTutorInput(input: unknown): ParsedUpdateTutorInput {
  return updateTutorInputSchema.parse(input);
}

export function parseTutorApplicationAccountInput(
  input: unknown,
): ParsedTutorApplicationAccountInput {
  return tutorApplicationAccountInputSchema.parse(input);
}

export function parseStatusTransitionInput(
  input: unknown,
): ParsedStatusTransitionInput {
  return statusTransitionInputSchema.parse(input);
}

export function parseTutorSearchFilters(
  input: unknown,
): ParsedTutorSearchFilters {
  return tutorSearchFiltersSchema.parse(input);
}

export function parseCreateCareerInput(input: unknown): ParsedCreateCareerInput {
  return createCareerInputSchema.parse(input);
}

export function parseUpdateCareerInput(input: unknown): ParsedUpdateCareerInput {
  return updateCareerInputSchema.parse(input);
}

export function parseCreateSubjectInput(input: unknown): ParsedCreateSubjectInput {
  return createSubjectInputSchema.parse(input);
}

export function parseUpdateSubjectInput(input: unknown): ParsedUpdateSubjectInput {
  return updateSubjectInputSchema.parse(input);
}

export function parseCreateScholarshipReferenceInput(
  input: unknown,
): ParsedCreateScholarshipReferenceInput {
  return createScholarshipReferenceInputSchema.parse(input);
}

export function parseUpdateScholarshipReferenceInput(
  input: unknown,
): ParsedUpdateScholarshipReferenceInput {
  return updateScholarshipReferenceInputSchema.parse(input);
}

export type TutorRecordStatus = RecordStatus;
