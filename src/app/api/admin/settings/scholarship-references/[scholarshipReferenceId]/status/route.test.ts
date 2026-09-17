import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  requireApiRole: vi.fn(),
  transitionScholarshipReferenceStatus: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/tutors/tutor-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/tutors/tutor-service")
  >();

  return {
    ...actual,
    transitionScholarshipReferenceStatus:
      mocks.transitionScholarshipReferenceStatus,
  };
});

import { PATCH } from "./route";

const referenceId = "11111111-1111-4111-8111-111111111111";

function context() {
  return { params: Promise.resolve({ scholarshipReferenceId: referenceId }) };
}

function requestWithBody(body: unknown) {
  return new Request(
    `http://localhost/api/admin/settings/scholarship-references/${referenceId}/status`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("Admin scholarship reference status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies a Tutor before invoking reference mutation", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await PATCH(
      requestWithBody({ status: "INACTIVE" }),
      context(),
    );

    expect(response.status).toBe(403);
    expect(mocks.transitionScholarshipReferenceStatus).not.toHaveBeenCalled();
  });
});
