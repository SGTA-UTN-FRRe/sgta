import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { Database } from "@/db/client-core";

import {
  calculateSignedHourMinutes,
  deriveHourBalanceState,
  HOUR_ERROR_CODES,
  HourServiceError,
  mapHourMutationError,
  recordBulkHourMovement,
} from "./hour-service";

function asDatabase(value: unknown) {
  return value as Database;
}

describe("hour service boundary", () => {
  it("derives signed movement and balance state without persisting a balance", () => {
    expect(calculateSignedHourMinutes("CREDIT", 90)).toBe(90);
    expect(calculateSignedHourMinutes("DEBIT", 45)).toBe(-45);
    expect(deriveHourBalanceState(0)).toBe("current");
    expect(deriveHourBalanceState(-1)).toBe("owes");
  });

  it("requires an actor before opening the movement transaction", async () => {
    const transaction = vi.fn();

    await expect(
      recordBulkHourMovement(
        asDatabase({ transaction }),
        {
          cycleId: "11111111-1111-4111-8111-111111111111",
          tutorIds: ["22222222-2222-4222-8222-222222222222"],
          categoryId: "33333333-3333-4333-8333-333333333333",
          direction: "CREDIT",
          duration: { hours: 1, minutes: 0 },
          movementDate: "2027-02-15",
        },
      ),
    ).rejects.toMatchObject({ code: HOUR_ERROR_CODES.actorRequired });

    expect(transaction).not.toHaveBeenCalled();
  });

  it("maps raw persistence failures to stable non-sensitive errors", () => {
    const mapped = mapHourMutationError(new Error("database offline"));

    expect(mapped).toMatchObject({
      code: HOUR_ERROR_CODES.transactionFailed,
    });
    expect(mapped.message).not.toContain("database offline");
  });

  it("preserves domain error codes", () => {
    const error = new HourServiceError(
      HOUR_ERROR_CODES.movementAlreadyReversed,
      "The movement has already been reversed.",
      { details: { movementId: "movement-1" } },
    );

    expect(mapHourMutationError(error)).toBe(error);
  });
});
