import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAuditEvent } from "@/db/audit-core";
import type { Database } from "@/db/client-core";
import "server-only";

import {
  administrativeCycle,
  type AdministrativeCycleStatus,
} from "@/db/schema";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateOnly(value: string) {
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

const dateOnlySchema = z
  .string()
  .trim()
  .regex(dateOnlyPattern, "must use YYYY-MM-DD format")
  .refine(isValidDateOnly, "must be a valid calendar date");

export const createCycleInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (input.startDate > input.endDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "must be on or after startDate",
      });
    }
  });

const cycleIdSchema = z.string().trim().min(1).max(255);

export type CreateCycleInput = z.input<typeof createCycleInputSchema>;
export type ParsedCreateCycleInput = z.output<typeof createCycleInputSchema>;

export type CycleMutationContext = {
  actorId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
};

export type SafeAdministrativeCycle = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AdministrativeCycleStatus;
  createdAt: string;
  updatedAt: string;
};

export const CYCLE_ERROR_CODES = {
  invalidDateRange: "invalid_date_range",
  openCycleExists: "open_cycle_exists",
  cycleNotFound: "cycle_not_found",
  cycleAlreadyClosed: "cycle_already_closed",
} as const;

export type CycleErrorCode =
  (typeof CYCLE_ERROR_CODES)[keyof typeof CYCLE_ERROR_CODES];

export class CycleServiceError extends Error {
  readonly code: CycleErrorCode;

  constructor(code: CycleErrorCode, message: string) {
    super(message);
    this.name = "CycleServiceError";
    this.code = code;
  }
}

type CycleRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AdministrativeCycleStatus;
  createdAt: Date;
  updatedAt: Date;
};

const cycleSelection = {
  id: administrativeCycle.id,
  name: administrativeCycle.name,
  startDate: administrativeCycle.startDate,
  endDate: administrativeCycle.endDate,
  status: administrativeCycle.status,
  createdAt: administrativeCycle.createdAt,
  updatedAt: administrativeCycle.updatedAt,
};

export function parseCreateCycleInput(
  input: CreateCycleInput,
): ParsedCreateCycleInput {
  try {
    return createCycleInputSchema.parse(input);
  } catch (error) {
    if (
      error instanceof z.ZodError &&
      error.issues.some(
        (issue) =>
          issue.message === "must be on or after startDate" ||
          issue.message === "must be a valid calendar date",
      )
    ) {
      throw new CycleServiceError(
        CYCLE_ERROR_CODES.invalidDateRange,
        "The administrative cycle date range is invalid.",
      );
    }

    throw error;
  }
}

export function parseCycleId(value: string) {
  return cycleIdSchema.parse(value);
}

export function toSafeAdministrativeCycle(
  record: CycleRecord,
): SafeAdministrativeCycle {
  return {
    id: record.id,
    name: record.name,
    startDate: record.startDate,
    endDate: record.endDate,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listAdministrativeCycles(
  db: Database,
): Promise<SafeAdministrativeCycle[]> {
  const records = await db
    .select(cycleSelection)
    .from(administrativeCycle)
    .orderBy(desc(administrativeCycle.startDate), desc(administrativeCycle.createdAt));

  return records.map(toSafeAdministrativeCycle);
}

export async function getCurrentAdministrativeCycle(
  db: Database,
): Promise<SafeAdministrativeCycle | null> {
  const [record] = await db
    .select(cycleSelection)
    .from(administrativeCycle)
    .where(eq(administrativeCycle.status, "OPEN"))
    .limit(1);

  return record === undefined ? null : toSafeAdministrativeCycle(record);
}

function hasDatabaseErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export async function createAdministrativeCycle(
  db: Database,
  input: CreateCycleInput,
  context: CycleMutationContext = {},
): Promise<SafeAdministrativeCycle> {
  const parsed = parseCreateCycleInput(input);

  try {
    return await db.transaction(async (transaction) => {
      const [openCycle] = await transaction
        .select({ id: administrativeCycle.id })
        .from(administrativeCycle)
        .where(eq(administrativeCycle.status, "OPEN"))
        .limit(1);

      if (openCycle !== undefined) {
        throw new CycleServiceError(
          CYCLE_ERROR_CODES.openCycleExists,
          "An open administrative cycle already exists.",
        );
      }

      const [record] = await transaction
        .insert(administrativeCycle)
        .values({
          name: parsed.name,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          status: "OPEN",
        })
        .returning(cycleSelection);

      if (record === undefined) {
        throw new Error("The administrative cycle could not be persisted.");
      }

      await recordAuditEvent(transaction, {
        actorId: context.actorId ?? null,
        action: "cycle.created",
        entityType: "administrative_cycle",
        entityId: record.id,
        metadata: {
          startDate: record.startDate,
          endDate: record.endDate,
          status: record.status,
        },
        requestId: context.requestId ?? null,
        ipAddress: context.ipAddress ?? null,
      });

      return toSafeAdministrativeCycle(record);
    });
  } catch (error) {
    if (error instanceof CycleServiceError) {
      throw error;
    }

    if (hasDatabaseErrorCode(error, "23505")) {
      throw new CycleServiceError(
        CYCLE_ERROR_CODES.openCycleExists,
        "An open administrative cycle already exists.",
      );
    }

    if (hasDatabaseErrorCode(error, "23514")) {
      throw new CycleServiceError(
        CYCLE_ERROR_CODES.invalidDateRange,
        "The administrative cycle date range is invalid.",
      );
    }

    throw error;
  }
}

export async function closeAdministrativeCycle(
  db: Database,
  cycleId: string,
  context: CycleMutationContext = {},
): Promise<SafeAdministrativeCycle> {
  const parsedCycleId = parseCycleId(cycleId);

  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select({
        id: administrativeCycle.id,
        status: administrativeCycle.status,
      })
      .from(administrativeCycle)
      .where(eq(administrativeCycle.id, parsedCycleId))
      .limit(1);

    if (existing === undefined) {
      throw new CycleServiceError(
        CYCLE_ERROR_CODES.cycleNotFound,
        "The administrative cycle was not found.",
      );
    }

    if (existing.status === "CLOSED") {
      throw new CycleServiceError(
        CYCLE_ERROR_CODES.cycleAlreadyClosed,
        "The administrative cycle is already closed.",
      );
    }

    const [record] = await transaction
      .update(administrativeCycle)
      .set({ status: "CLOSED", updatedAt: new Date() })
      .where(
        and(
          eq(administrativeCycle.id, parsedCycleId),
          eq(administrativeCycle.status, "OPEN"),
        ),
      )
      .returning(cycleSelection);

    if (record === undefined) {
      throw new CycleServiceError(
        CYCLE_ERROR_CODES.cycleAlreadyClosed,
        "The administrative cycle is already closed.",
      );
    }

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "cycle.closed",
      entityType: "administrative_cycle",
      entityId: record.id,
      metadata: {
        previousStatus: "OPEN",
        status: record.status,
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return toSafeAdministrativeCycle(record);
  });
}
