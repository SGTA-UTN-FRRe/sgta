import { beforeEach, describe, expect, it, vi } from "vitest";

const auditMocks = vi.hoisted(() => ({ recordAuditEvent: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/db/audit-core", () => ({ recordAuditEvent: auditMocks.recordAuditEvent }));

import type { Database } from "@/db/client-core";

import {
  createTutor,
  TUTOR_ERROR_CODES,
  TutorServiceError,
  transitionTutorStatus,
  updateCareer,
  updateTutor,
} from "./tutor-service";

const validTutorInput = {
  firstName: "Ada",
  lastName: "Lovelace",
  primaryCareerId: "11111111-1111-4111-8111-111111111111",
  cycleId: "22222222-2222-4222-8222-222222222222",
  subjectIds: [],
};

function asDatabase(value: unknown) {
  return value as Database;
}

const existingCareer = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Computer Science",
  color: "BLUE" as const,
  status: "ACTIVE" as const,
};

function createCareerDatabase() {
  const limit = vi.fn().mockResolvedValue([existingCareer]);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where: updateWhere });
  const update = vi.fn().mockReturnValue({ set });
  const transactionClient = { select, update };
  const transaction = vi.fn(
    async (operation: (transaction: unknown) => Promise<unknown>) =>
      operation(transactionClient),
  );

  return { database: asDatabase({ transaction }) };
}

describe("Tutor service boundary", () => {
  it("returns stable prerequisite errors before opening a transaction", async () => {
    const transaction = vi.fn();

    await expect(
      updateTutor(
        asDatabase({ transaction }),
        "11111111-1111-4111-8111-111111111110",
        { scholarshipReferenceId: null },
      ),
    ).rejects.toMatchObject({
      code: TUTOR_ERROR_CODES.cycleRequiredForMembershipChange,
    });

    await expect(
      createTutor(asDatabase({ transaction }), {
        firstName: "Ada",
        lastName: "Lovelace",
        primaryCareerId: validTutorInput.primaryCareerId,
      }),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.openCycleRequired });

    await expect(
      transitionTutorStatus(
        asDatabase({ transaction }),
        "11111111-1111-4111-8111-111111111110",
        { status: "INVALID" },
      ),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.invalidStatusTransition });

    expect(transaction).not.toHaveBeenCalled();
  });

  it("does not expose raw transaction failures", async () => {
    const transaction = vi.fn().mockRejectedValue(new Error("database offline"));

    await expect(
      createTutor(asDatabase({ transaction }), validTutorInput),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.transactionFailed });
    await expect(
      createTutor(asDatabase({ transaction }), validTutorInput),
    ).rejects.not.toThrow("database offline");
  });

  it("keeps domain errors distinguishable from generic service failures", () => {
    const error = new TutorServiceError(
      TUTOR_ERROR_CODES.careerSubjectMismatch,
      "The selected Subject does not belong to the Career.",
      { details: { subjectId: "subject-1", careerId: "career-1" } },
    );

    expect(error).toMatchObject({
      code: TUTOR_ERROR_CODES.careerSubjectMismatch,
      details: { subjectId: "subject-1", careerId: "career-1" },
    });
  });
});

describe("career update audit fields", () => {
  beforeEach(() => {
    auditMocks.recordAuditEvent.mockReset();
  });

  it("records only the career name when renaming", async () => {
    const { database } = createCareerDatabase();

    await updateCareer(database, existingCareer.id, { name: "Computer Engineering" });

    expect(auditMocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "career.updated",
        metadata: { changedFields: ["name"] },
      }),
    );
  });

  it("records the previous and current color when changing only the color", async () => {
    const { database } = createCareerDatabase();

    await updateCareer(database, existingCareer.id, { color: "MAGENTA" });

    expect(auditMocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "career.updated",
        metadata: {
          changedFields: ["color"],
          previousColor: "BLUE",
          color: "MAGENTA",
        },
      }),
    );
  });
});
