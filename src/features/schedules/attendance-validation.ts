import { z } from "zod";

import { dateOnlySchema, scheduleIdentifierSchema } from "./schedule-validation";

const MAX_OCCURRENCE_MINUTES = 1_440;
const MAX_NOTE_LENGTH = 2_000;

const attendanceStatusSchema = z.enum(["PRESENT", "ABSENT"]);
const debitMinutesSchema = z.number()
  .int()
  .min(1)
  .max(MAX_OCCURRENCE_MINUTES);

const optionalNullableNoteSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return value;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return null;
    }

    return value;
  },
  z.union([z.string().trim().min(1).max(MAX_NOTE_LENGTH), z.null()]).optional(),
);

export const attendanceDateInputSchema = z
  .object({
    cycleId: scheduleIdentifierSchema,
    date: dateOnlySchema,
  })
  .strict();

export const attendanceStatusInputSchema = z
  .object({ status: attendanceStatusSchema })
  .strict();

export const attendanceEmptyInputSchema = z.object({}).strict();

export const absenceDebitInputSchema = z
  .object({
    categoryId: scheduleIdentifierSchema,
    debitMinutes: debitMinutesSchema.optional(),
    note: optionalNullableNoteSchema,
  })
  .strict();

export const attendanceCorrectionInputSchema = z
  .object({
    status: attendanceStatusSchema,
    categoryId: scheduleIdentifierSchema.optional(),
    debitMinutes: debitMinutesSchema.optional(),
    note: optionalNullableNoteSchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (input.status === "PRESENT") {
      if (input.categoryId !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "must be empty when correcting to PRESENT",
        });
      }

      if (input.debitMinutes !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["debitMinutes"],
          message: "must be empty when correcting to PRESENT",
        });
      }
    }

    if (
      input.debitMinutes !== undefined &&
      input.categoryId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "is required when debitMinutes is provided",
      });
    }
  });

export const recoveryRecognitionInputSchema = z
  .object({
    categoryId: scheduleIdentifierSchema,
    note: optionalNullableNoteSchema,
  })
  .strict();

export type AttendanceDateInput = z.input<typeof attendanceDateInputSchema>;
export type ParsedAttendanceDateInput = z.output<
  typeof attendanceDateInputSchema
>;
export type AttendanceStatusInput = z.input<typeof attendanceStatusInputSchema>;
export type ParsedAttendanceStatusInput = z.output<
  typeof attendanceStatusInputSchema
>;
export type AbsenceDebitInput = z.input<typeof absenceDebitInputSchema>;
export type ParsedAbsenceDebitInput = z.output<
  typeof absenceDebitInputSchema
>;
export type AttendanceCorrectionInput = z.input<
  typeof attendanceCorrectionInputSchema
>;
export type ParsedAttendanceCorrectionInput = z.output<
  typeof attendanceCorrectionInputSchema
>;
export type RecoveryRecognitionInput = z.input<
  typeof recoveryRecognitionInputSchema
>;
export type ParsedRecoveryRecognitionInput = z.output<
  typeof recoveryRecognitionInputSchema
>;

export function parseAttendanceDateInput(input: unknown) {
  return attendanceDateInputSchema.parse(input);
}

export function parseAttendanceStatusInput(input: unknown) {
  return attendanceStatusInputSchema.parse(input);
}

export function parseAbsenceDebitInput(input: unknown) {
  return absenceDebitInputSchema.parse(input);
}

export function parseAttendanceCorrectionInput(input: unknown) {
  return attendanceCorrectionInputSchema.parse(input);
}

export function parseRecoveryRecognitionInput(input: unknown) {
  return recoveryRecognitionInputSchema.parse(input);
}

export function parseAttendanceEmptyInput(input: unknown = {}) {
  return attendanceEmptyInputSchema.parse(input);
}
