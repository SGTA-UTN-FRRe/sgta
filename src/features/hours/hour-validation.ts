import { z } from "zod";

const MAX_CATEGORY_NAME_LENGTH = 200;
const MAX_NOTE_LENGTH = 2_000;
const MAX_TUTORS_PER_MOVEMENT = 100;
const MAX_DURATION_MINUTES = 100_000;

export const hourIdSchema = z
  .string()
  .trim()
  .uuid()
  .transform((value) => value.toLowerCase());

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function isValidHourDateOnly(value: string) {
  if (!dateOnlyPattern.test(value)) {
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

export const hourDateSchema = z
  .string()
  .trim()
  .regex(dateOnlyPattern, "must use YYYY-MM-DD format")
  .refine(isValidHourDateOnly, "must be a valid calendar date");

export const hourActivityKindSchema = z.enum([
  "MEETING",
  "WORKSHOP",
  "EXTRAORDINARY",
  "RECOVERY",
]);

export const hourMovementDirectionSchema = z.enum(["CREDIT", "DEBIT"]);
export const hourMovementOperationSchema = z.enum(["MOVEMENT", "RECOVERY"]);
export const hourCategoryStatusSchema = z.enum(["ALL", "ACTIVE", "INACTIVE"]);
export const hourRecordStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

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

const integerInput = (options: { min: number; max: number }) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim().length > 0) {
        return Number(value);
      }

      return value;
    },
    z.number().int().min(options.min).max(options.max),
  );

function addDuplicateIssues(
  values: string[],
  message: string,
  context: z.RefinementCtx,
) {
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

export const createHourCategoryInputSchema = z
  .object({
    name: requiredText(MAX_CATEGORY_NAME_LENGTH),
    activityKind: hourActivityKindSchema.nullable().optional().default(null),
  })
  .strict();

export const updateHourCategoryInputSchema = z
  .object({
    name: requiredText(MAX_CATEGORY_NAME_LENGTH).optional(),
    activityKind: hourActivityKindSchema.nullable().optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.name === undefined && input.activityKind === undefined) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "name or activityKind is required",
      });
    }
  });

export const hourCategoryStatusTransitionSchema = z
  .object({
    status: hourRecordStatusSchema,
  })
  .strict();

const movementDurationByMinutesSchema = z
  .object({
    durationMinutes: integerInput({ min: 1, max: MAX_DURATION_MINUTES }),
  })
  .strict();

const parsedMovementDurationSchema = integerInput({
  min: 1,
  max: MAX_DURATION_MINUTES,
});

const movementDurationByPartsSchema = z
  .object({
    hours: integerInput({ min: 0, max: Math.floor(MAX_DURATION_MINUTES / 60) }),
    minutes: integerInput({ min: 0, max: 59 }),
  })
  .strict()
  .superRefine((input, context) => {
    const durationMinutes = input.hours * 60 + input.minutes;

    if (durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
      context.addIssue({
        code: "custom",
        path: ["minutes"],
        message: "duration must be greater than zero and within the supported limit",
      });
    }
  });

export const hourMovementDurationSchema = z
  .union([
    movementDurationByMinutesSchema,
    movementDurationByPartsSchema,
    parsedMovementDurationSchema,
  ])
  .transform((value) =>
    typeof value === "number"
      ? value
      : "durationMinutes" in value
      ? value.durationMinutes
      : value.hours * 60 + value.minutes,
  );

export const tutorIdsForHourMovementSchema = z
  .array(hourIdSchema)
  .min(1)
  .max(MAX_TUTORS_PER_MOVEMENT)
  .superRefine((values, context) => {
    addDuplicateIssues(values, "tutor IDs must be unique", context);
  });

export const recordBulkHourMovementInputSchema = z
  .object({
    cycleId: hourIdSchema,
    tutorIds: tutorIdsForHourMovementSchema,
    categoryId: hourIdSchema,
    direction: hourMovementDirectionSchema,
    duration: hourMovementDurationSchema,
    movementDate: hourDateSchema,
    note: optionalNullableText(MAX_NOTE_LENGTH).default(null),
  })
  .strict();

export const recordHourMovementRequestSchema =
  recordBulkHourMovementInputSchema.extend({
    operation: hourMovementOperationSchema.default("MOVEMENT"),
  });

export const hourMovementHistoryInputSchema = z
  .object({
    cycleId: hourIdSchema.optional(),
    tutorId: hourIdSchema.optional(),
    categoryId: hourIdSchema.optional(),
    offset: integerInput({ min: 0, max: 10_000 }).default(0),
    limit: integerInput({ min: 1, max: 200 }).default(100),
  })
  .strict();

export type CreateHourCategoryInput = z.input<
  typeof createHourCategoryInputSchema
>;
export type ParsedCreateHourCategoryInput = z.output<
  typeof createHourCategoryInputSchema
>;
export type UpdateHourCategoryInput = z.input<
  typeof updateHourCategoryInputSchema
>;
export type ParsedUpdateHourCategoryInput = z.output<
  typeof updateHourCategoryInputSchema
>;
export type HourCategoryStatusTransitionInput = z.input<
  typeof hourCategoryStatusTransitionSchema
>;
export type ParsedHourCategoryStatusTransitionInput = z.output<
  typeof hourCategoryStatusTransitionSchema
>;
export type RecordBulkHourMovementInput = z.input<
  typeof recordBulkHourMovementInputSchema
>;
export type ParsedRecordBulkHourMovementInput = z.output<
  typeof recordBulkHourMovementInputSchema
>;
export type RecordHourMovementRequestInput = z.input<
  typeof recordHourMovementRequestSchema
>;
export type ParsedRecordHourMovementRequestInput = z.output<
  typeof recordHourMovementRequestSchema
>;
export type HourMovementHistoryInput = z.input<
  typeof hourMovementHistoryInputSchema
>;
export type ParsedHourMovementHistoryInput = z.output<
  typeof hourMovementHistoryInputSchema
>;

export function parseCreateHourCategoryInput(
  input: unknown,
): ParsedCreateHourCategoryInput {
  return createHourCategoryInputSchema.parse(input);
}

export function parseUpdateHourCategoryInput(
  input: unknown,
): ParsedUpdateHourCategoryInput {
  return updateHourCategoryInputSchema.parse(input);
}

export function parseHourCategoryStatusTransitionInput(
  input: unknown,
): ParsedHourCategoryStatusTransitionInput {
  return hourCategoryStatusTransitionSchema.parse(input);
}

export function parseRecordBulkHourMovementInput(
  input: unknown,
): ParsedRecordBulkHourMovementInput {
  return recordBulkHourMovementInputSchema.parse(input);
}

export function parseRecordHourMovementRequest(
  input: unknown,
): ParsedRecordHourMovementRequestInput {
  return recordHourMovementRequestSchema.parse(input);
}

export function parseHourMovementHistoryInput(
  input: unknown = {},
): ParsedHourMovementHistoryInput {
  return hourMovementHistoryInputSchema.parse(input);
}

export function parseHourId(value: string) {
  return hourIdSchema.parse(value);
}

export function parseHourCategoryStatus(value: string) {
  return hourCategoryStatusSchema.parse(value);
}

export function normalizeHourCategoryName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-AR");
}
