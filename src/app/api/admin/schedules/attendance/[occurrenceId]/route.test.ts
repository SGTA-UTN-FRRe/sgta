import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancelAbsenceDebit: vi.fn(),
  confirmAbsenceDebit: vi.fn(),
  correctAttendance: vi.fn(),
  getAttendanceOccurrence: vi.fn(),
  getDatabase: vi.fn(),
  recognizeScheduledRecovery: vi.fn(),
  reopenAbsenceDebit: vi.fn(),
  requireApiRole: vi.fn(),
  setAttendanceStatus: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/schedules/attendance-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/schedules/attendance-service")
  >();

  return {
    ...actual,
    cancelAbsenceDebit: mocks.cancelAbsenceDebit,
    confirmAbsenceDebit: mocks.confirmAbsenceDebit,
    correctAttendance: mocks.correctAttendance,
    getAttendanceOccurrence: mocks.getAttendanceOccurrence,
    recognizeScheduledRecovery: mocks.recognizeScheduledRecovery,
    reopenAbsenceDebit: mocks.reopenAbsenceDebit,
    setAttendanceStatus: mocks.setAttendanceStatus,
  };
});

import { POST } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};
const occurrenceId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";

function context() {
  return { params: Promise.resolve({ occurrenceId }) };
}

function requestWithBody(body: unknown) {
  return new Request(
    `http://localhost/api/admin/schedules/attendance/${occurrenceId}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("Admin attendance occurrence route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies access before parsing the mutation body", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await POST(
      requestWithBody({ operation: "PRESENT", unexpected: true }),
      context(),
    );

    expect(response.status).toBe(403);
    expect(mocks.setAttendanceStatus).not.toHaveBeenCalled();
  });

  it("rejects unknown body fields and malformed identifiers before the service", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const unknown = await POST(
      requestWithBody({ operation: "PRESENT", unexpected: true }),
      context(),
    );
    const invalidId = await POST(
      requestWithBody({ operation: "PRESENT" }),
      { params: Promise.resolve({ occurrenceId: "bad" }) },
    );

    expect(unknown.status).toBe(400);
    expect(invalidId.status).toBe(400);
    expect(mocks.setAttendanceStatus).not.toHaveBeenCalled();
  });

  it("routes status, debit, correction, and recovery decisions with actor context", async () => {
    const database = {};
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.setAttendanceStatus.mockResolvedValue({ kind: "status" });
    mocks.cancelAbsenceDebit.mockResolvedValue({ kind: "cancel" });
    mocks.confirmAbsenceDebit.mockResolvedValue({ kind: "confirm" });
    mocks.correctAttendance.mockResolvedValue({ kind: "correct" });
    mocks.recognizeScheduledRecovery.mockResolvedValue({ kind: "recovery" });

    const present = await POST(requestWithBody({ operation: "PRESENT" }), context());
    const cancel = await POST(
      requestWithBody({ operation: "CANCEL_DEBIT" }),
      context(),
    );
    const confirm = await POST(
      requestWithBody({
        operation: "CONFIRM_DEBIT",
        categoryId,
        debitMinutes: 45,
        note: "Confirmed after review",
      }),
      context(),
    );
    const correction = await POST(
      requestWithBody({ operation: "CORRECT", status: "PRESENT", note: "Correction" }),
      context(),
    );
    const recovery = await POST(
      requestWithBody({ operation: "RECOGNIZE_RECOVERY", categoryId }),
      context(),
    );

    expect(present.status).toBe(200);
    expect(cancel.status).toBe(200);
    expect(confirm.status).toBe(200);
    expect(correction.status).toBe(200);
    expect(recovery.status).toBe(200);
    expect(mocks.setAttendanceStatus).toHaveBeenCalledWith(
      database,
      occurrenceId,
      { status: "PRESENT" },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
    expect(mocks.cancelAbsenceDebit).toHaveBeenCalledWith(
      database,
      occurrenceId,
      {},
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
    expect(mocks.confirmAbsenceDebit).toHaveBeenCalledWith(
      database,
      occurrenceId,
      { categoryId, debitMinutes: 45, note: "Confirmed after review" },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
    expect(mocks.correctAttendance).toHaveBeenCalledWith(
      database,
      occurrenceId,
      { status: "PRESENT", categoryId: undefined, debitMinutes: undefined, note: "Correction" },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
    expect(mocks.recognizeScheduledRecovery).toHaveBeenCalledWith(
      database,
      occurrenceId,
      { categoryId, note: undefined },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
  });
});
