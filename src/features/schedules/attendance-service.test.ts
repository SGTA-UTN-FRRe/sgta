import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { Database } from "@/db/client-core";

import {
  ATTENDANCE_ERROR_CODES,
  AttendanceServiceError,
  calculateOccurrenceDurationMinutes,
  correctAttendance,
  mapAttendanceMutationError,
  parseAttendanceCorrectionServiceInput,
  parseAbsenceDebitServiceInput,
  setAttendanceStatus,
} from "./attendance-service";

function asDatabase(value: unknown) {
  return value as Database;
}

describe("attendance service boundary", () => {
  it("calculates the proposed debit from the immutable occurrence duration", () => {
    expect(calculateOccurrenceDurationMinutes(480, 600)).toBe(120);
  });

  it("rejects an invalid occurrence duration", () => {
    expect(() => calculateOccurrenceDurationMinutes(600, 600)).toThrow(
      expect.objectContaining({
        code: ATTENDANCE_ERROR_CODES.debitMinutesInvalid,
      }),
    );
  });

  it("validates debit adjustments and correction state together", () => {
    expect(() =>
      parseAbsenceDebitServiceInput({
        categoryId: "11111111-1111-4111-8111-111111111111",
        debitMinutes: 0,
      }),
    ).toThrow(
      expect.objectContaining({ code: ATTENDANCE_ERROR_CODES.validationError }),
    );

    expect(() =>
      parseAttendanceCorrectionServiceInput({
        status: "PRESENT",
        categoryId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toThrow(
      expect.objectContaining({ code: ATTENDANCE_ERROR_CODES.validationError }),
    );

    expect(() =>
      parseAttendanceCorrectionServiceInput({
        status: "ABSENT",
        debitMinutes: 60,
      }),
    ).toThrow(
      expect.objectContaining({ code: ATTENDANCE_ERROR_CODES.validationError }),
    );
  });

  it("requires an actor before opening an attendance transaction", async () => {
    const transaction = vi.fn();

    await expect(
      setAttendanceStatus(
        asDatabase({ transaction }),
        "11111111-1111-4111-8111-111111111111",
        { status: "PRESENT" },
      ),
    ).rejects.toMatchObject({ code: ATTENDANCE_ERROR_CODES.actorRequired });

    expect(transaction).not.toHaveBeenCalled();
  });

  it("requires explicit correction instead of accepting a duplicate status", async () => {
    const transaction = vi.fn();
    const error = new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.statusAlreadySet,
      "The attendance status is already set.",
    );

    expect(mapAttendanceMutationError(error)).toBe(error);

    await expect(
      correctAttendance(
        asDatabase({ transaction }),
        "11111111-1111-4111-8111-111111111111",
        { status: "PRESENT" },
      ),
    ).rejects.toMatchObject({ code: ATTENDANCE_ERROR_CODES.actorRequired });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("maps persistence failures without exposing database details", () => {
    const mapped = mapAttendanceMutationError({
      cause: {
        code: "23505",
        constraint: "attendance_record_occurrence_unique",
      },
    });

    expect(mapped).toMatchObject({
      code: ATTENDANCE_ERROR_CODES.transactionFailed,
    });
    expect(mapped.message).not.toContain("attendance_record_occurrence_unique");
  });
});
