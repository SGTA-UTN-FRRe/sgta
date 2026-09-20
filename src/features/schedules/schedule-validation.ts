import { z } from "zod";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateOnly(value: string) {
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

export const dateOnlySchema = z
  .string()
  .trim()
  .regex(dateOnlyPattern, "must use YYYY-MM-DD format")
  .refine(isValidDateOnly, "must be a valid calendar date");

export const scheduleIdentifierSchema = z.string().trim().uuid();

const planNameSchema = z.string().trim().min(1).max(200);
const modalitySchema = z.preprocess(
  (value) =>
    value === null || value === undefined
      ? value
      : typeof value === "string"
        ? value.trim()
        : value,
  z.string().min(1).max(200).nullable().optional(),
);

const planKindSchema = z.enum(["REGULAR", "SPECIAL"]);
const recordStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
const assignmentPatternSchema = z.enum(["WEEKDAY", "DATE"]);
const assignmentKindSchema = z.enum(["DUTY", "RECOVERY"]);

export const createSchedulePlanInputSchema = z
  .object({
    cycleId: scheduleIdentifierSchema,
    name: planNameSchema,
    kind: planKindSchema,
    validFrom: dateOnlySchema,
    validTo: dateOnlySchema,
    status: recordStatusSchema.optional().default("ACTIVE"),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.validFrom > input.validTo) {
      context.addIssue({
        code: "custom",
        path: ["validTo"],
        message: "must be on or after validFrom",
      });
    }
  });

export const updateSchedulePlanInputSchema = z
  .object({
    name: planNameSchema.optional(),
    validFrom: dateOnlySchema.optional(),
    validTo: dateOnlySchema.optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.validFrom !== undefined &&
      input.validTo !== undefined &&
      input.validFrom > input.validTo
    ) {
      context.addIssue({
        code: "custom",
        path: ["validTo"],
        message: "must be on or after validFrom",
      });
    }
  });

export const schedulePlanStatusInputSchema = z
  .object({ status: recordStatusSchema })
  .strict();

const assignmentFieldsSchema = z
  .object({
    pattern: assignmentPatternSchema,
    weekday: z.number().int().min(1).max(7).optional().nullable(),
    assignmentDate: dateOnlySchema.optional().nullable(),
    startMinutes: z.number().int().min(0).max(1439),
    endMinutes: z.number().int().min(1).max(1440),
    kind: assignmentKindSchema.optional().default("DUTY"),
    modality: modalitySchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (input.pattern === "WEEKDAY") {
      if (input.weekday === undefined || input.weekday === null) {
        context.addIssue({
          code: "custom",
          path: ["weekday"],
          message: "is required for a weekday assignment",
        });
      }

      if (input.assignmentDate !== undefined && input.assignmentDate !== null) {
        context.addIssue({
          code: "custom",
          path: ["assignmentDate"],
          message: "must be empty for a weekday assignment",
        });
      }
    } else {
      if (input.assignmentDate === undefined || input.assignmentDate === null) {
        context.addIssue({
          code: "custom",
          path: ["assignmentDate"],
          message: "is required for a date assignment",
        });
      }

      if (input.weekday !== undefined && input.weekday !== null) {
        context.addIssue({
          code: "custom",
          path: ["weekday"],
          message: "must be empty for a date assignment",
        });
      }
    }

    if (input.startMinutes >= input.endMinutes) {
      context.addIssue({
        code: "custom",
        path: ["endMinutes"],
        message: "must be after startMinutes",
      });
    }
  });

export const createScheduleAssignmentInputSchema = z
  .object({
    planId: scheduleIdentifierSchema,
    tutorId: scheduleIdentifierSchema,
  })
  .merge(assignmentFieldsSchema)
  .strict();

export const updateScheduleAssignmentInputSchema = z
  .object({
    tutorId: scheduleIdentifierSchema.optional(),
  })
  .merge(assignmentFieldsSchema)
  .strict();

export const scheduleAssignmentStatusInputSchema = z
  .object({ status: recordStatusSchema })
  .strict();

export const effectiveScheduleInputSchema = z
  .object({
    cycleId: scheduleIdentifierSchema,
    date: dateOnlySchema,
  })
  .strict();

export const schedulePlanListInputSchema = z
  .object({
    cycleId: scheduleIdentifierSchema,
    status: recordStatusSchema.optional(),
  })
  .strict();

export const scheduleAssignmentListInputSchema = z
  .object({
    planId: scheduleIdentifierSchema,
    status: recordStatusSchema.optional(),
  })
  .strict();

export const scheduleWorkspaceInputSchema = z
  .object({
    cycleId: scheduleIdentifierSchema.optional(),
    planId: scheduleIdentifierSchema.optional(),
    date: dateOnlySchema.optional(),
  })
  .strict();

export type CreateSchedulePlanInput = z.input<
  typeof createSchedulePlanInputSchema
>;
export type ParsedCreateSchedulePlanInput = z.output<
  typeof createSchedulePlanInputSchema
>;
export type UpdateSchedulePlanInput = z.input<
  typeof updateSchedulePlanInputSchema
>;
export type ParsedUpdateSchedulePlanInput = z.output<
  typeof updateSchedulePlanInputSchema
>;
export type SchedulePlanStatusInput = z.input<
  typeof schedulePlanStatusInputSchema
>;
export type ParsedSchedulePlanStatusInput = z.output<
  typeof schedulePlanStatusInputSchema
>;
export type CreateScheduleAssignmentInput = z.input<
  typeof createScheduleAssignmentInputSchema
>;
export type ParsedCreateScheduleAssignmentInput = z.output<
  typeof createScheduleAssignmentInputSchema
>;
export type UpdateScheduleAssignmentInput = z.input<
  typeof updateScheduleAssignmentInputSchema
>;
export type ParsedUpdateScheduleAssignmentInput = z.output<
  typeof updateScheduleAssignmentInputSchema
>;
export type ScheduleAssignmentStatusInput = z.input<
  typeof scheduleAssignmentStatusInputSchema
>;
export type ParsedScheduleAssignmentStatusInput = z.output<
  typeof scheduleAssignmentStatusInputSchema
>;
export type EffectiveScheduleInput = z.input<typeof effectiveScheduleInputSchema>;
export type ParsedEffectiveScheduleInput = z.output<
  typeof effectiveScheduleInputSchema
>;
export type ScheduleWorkspaceInput = z.input<
  typeof scheduleWorkspaceInputSchema
>;
export type ParsedScheduleWorkspaceInput = z.output<
  typeof scheduleWorkspaceInputSchema
>;

export function getIsoWeekday(date: string) {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export type ScheduleAssignmentWindow = {
  pattern: "WEEKDAY" | "DATE";
  weekday: number | null;
  assignmentDate: string | null;
  startMinutes: number;
  endMinutes: number;
};

function hasTimeOverlap(
  left: ScheduleAssignmentWindow,
  right: ScheduleAssignmentWindow,
) {
  return (
    left.startMinutes < right.endMinutes &&
    right.startMinutes < left.endMinutes
  );
}

function hasDateOverlap(leftDate: string, rightDate: string) {
  return leftDate === rightDate;
}

function hasWeekdayInRange(weekday: number, start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const offset = (weekday - getIsoWeekday(start) + 7) % 7;
  startDate.setUTCDate(startDate.getUTCDate() + offset);
  const firstMatch = startDate.toISOString().slice(0, 10);

  return firstMatch <= end;
}

export function assignmentWindowsOverlap(
  left: ScheduleAssignmentWindow,
  right: ScheduleAssignmentWindow,
  validFrom: string,
  validTo: string,
) {
  if (!hasTimeOverlap(left, right)) {
    return false;
  }

  if (left.pattern === "DATE" && right.pattern === "DATE") {
    return (
      left.assignmentDate !== null &&
      right.assignmentDate !== null &&
      hasDateOverlap(left.assignmentDate, right.assignmentDate)
    );
  }

  if (left.pattern === "WEEKDAY" && right.pattern === "WEEKDAY") {
    return (
      left.weekday !== null &&
      right.weekday !== null &&
      left.weekday === right.weekday &&
      hasWeekdayInRange(left.weekday, validFrom, validTo)
    );
  }

  const weekdayAssignment = left.pattern === "WEEKDAY" ? left : right;
  const dateAssignment = left.pattern === "DATE" ? left : right;

  return (
    weekdayAssignment.weekday !== null &&
    dateAssignment.assignmentDate !== null &&
    dateAssignment.assignmentDate >= validFrom &&
    dateAssignment.assignmentDate <= validTo &&
    getIsoWeekday(dateAssignment.assignmentDate) === weekdayAssignment.weekday
  );
}

export function parseScheduleInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
): T {
  return schema.parse(input);
}
