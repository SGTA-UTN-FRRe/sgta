import { z } from "zod";

import type { ReportFilters } from "./report-types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const maximumRangeDays = 366;

function isDateOnly(value: string) {
  if (!datePattern.test(value)) {
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
  .regex(datePattern, "Use el formato AAAA-MM-DD.")
  .refine(isDateOnly, "Ingrese una fecha válida.");

const identifierSchema = z.string().uuid();

export const reportFilterSchema = z
  .object({
    fromDate: dateOnlySchema.optional(),
    toDate: dateOnlySchema.optional(),
    careerId: identifierSchema.optional(),
    subjectId: identifierSchema.optional(),
    tutorId: identifierSchema.optional(),
    modality: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((filters, context) => {
    const hasFromDate = filters.fromDate !== undefined;
    const hasToDate = filters.toDate !== undefined;

    if (hasFromDate !== hasToDate) {
      context.addIssue({
        code: "custom",
        path: [hasFromDate ? "toDate" : "fromDate"],
        message: "Complete ambas fechas del período.",
      });
      return;
    }

    if (!hasFromDate || !hasToDate) {
      return;
    }

    if (filters.fromDate! > filters.toDate!) {
      context.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "La fecha final debe ser igual o posterior a la fecha inicial.",
      });
      return;
    }

    const from = new Date(`${filters.fromDate}T00:00:00.000Z`).getTime();
    const to = new Date(`${filters.toDate}T00:00:00.000Z`).getTime();
    const inclusiveDays = Math.floor((to - from) / 86_400_000) + 1;

    if (inclusiveDays > maximumRangeDays) {
      context.addIssue({
        code: "custom",
        path: ["toDate"],
        message: `El período no puede superar ${maximumRangeDays} días.`,
      });
    }
  });

export type ReportFilterInput = z.input<typeof reportFilterSchema>;
export type ParsedReportFilterInput = z.output<typeof reportFilterSchema>;

export interface ReportFilterIssue {
  code: string;
  path: Array<string | number>;
  message: string;
}

export class ReportFilterValidationError extends Error {
  readonly issues: ReportFilterIssue[];

  constructor(issues: ReportFilterIssue[]) {
    super("The report filters are invalid.");
    this.name = "ReportFilterValidationError";
    this.issues = issues;
  }
}

function validationError(error: z.ZodError) {
  return new ReportFilterValidationError(
    error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.filter(
        (segment): segment is string | number =>
          typeof segment === "string" || typeof segment === "number",
      ),
      message: issue.message,
    })),
  );
}

export function parseReportFilterInput(input: unknown): ParsedReportFilterInput {
  const result = reportFilterSchema.safeParse(input);
  if (!result.success) {
    throw validationError(result.error);
  }

  return result.data;
}

function addDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function inclusiveDays(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDate}T00:00:00.000Z`).getTime();
  return Math.floor((to - from) / 86_400_000) + 1;
}

export function resolveReportFilters(
  input: ParsedReportFilterInput,
  currentCycle: { startDate: string; endDate: string } | null,
  currentDate: string,
): ReportFilters {
  if (input.fromDate !== undefined && input.toDate !== undefined) {
    return { ...input, fromDate: input.fromDate, toDate: input.toDate };
  }

  let fromDate: string;
  let toDate: string;

  if (currentCycle === null) {
    fromDate = `${currentDate.slice(0, 4)}-01-01`;
    toDate = currentDate;
  } else if (currentDate < currentCycle.startDate) {
    fromDate = currentCycle.startDate;
    toDate = currentCycle.startDate;
  } else {
    fromDate = currentCycle.startDate;
    toDate = currentDate < currentCycle.endDate ? currentDate : currentCycle.endDate;
  }

  if (inclusiveDays(fromDate, toDate) > maximumRangeDays) {
    fromDate = addDays(toDate, -(maximumRangeDays - 1));
  }

  return { ...input, fromDate, toDate };
}
