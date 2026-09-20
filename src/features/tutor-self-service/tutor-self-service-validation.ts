import { z } from "zod";

import { dateOnlySchema } from "@/features/schedules/schedule-validation";

export const applicationUserIdSchema = z.string().trim().min(1).max(255);

export const tutorSelfServiceScheduleQuerySchema = z
  .object({
    date: dateOnlySchema.optional(),
    weekStart: dateOnlySchema.optional(),
    weekEnd: dateOnlySchema.optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const hasWeekStart = input.weekStart !== undefined;
    const hasWeekEnd = input.weekEnd !== undefined;

    if (hasWeekStart !== hasWeekEnd) {
      context.addIssue({
        code: "custom",
        path: [hasWeekStart ? "weekEnd" : "weekStart"],
        message: "weekStart and weekEnd must be provided together",
      });
    }

    if (
      input.weekStart !== undefined &&
      input.weekEnd !== undefined &&
      input.weekStart > input.weekEnd
    ) {
      context.addIssue({
        code: "custom",
        path: ["weekEnd"],
        message: "weekEnd must be on or after weekStart",
      });
    }

    if (
      input.date !== undefined &&
      (input.weekStart !== undefined || input.weekEnd !== undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["date"],
        message: "date cannot be combined with a week window",
      });
    }
  });

export const tutorSelfServiceHoursQuerySchema = z.object({}).strict();

export type TutorSelfServiceScheduleQuery = z.output<
  typeof tutorSelfServiceScheduleQuerySchema
>;
export type TutorSelfServiceHoursQuery = z.output<
  typeof tutorSelfServiceHoursQuerySchema
>;
