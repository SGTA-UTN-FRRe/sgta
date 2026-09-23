import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  decideConsultationReview: vi.fn(),
  getConsultationReview: vi.fn(),
  getConsultationWorkspace: vi.fn(),
  getDatabase: vi.fn(),
  requireApiRole: vi.fn(),
  runConsultationImport: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/consultations/consultation-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/consultations/consultation-service")
  >();
  return {
    ...actual,
    decideConsultationReview: mocks.decideConsultationReview,
    getConsultationReview: mocks.getConsultationReview,
    getConsultationWorkspace: mocks.getConsultationWorkspace,
    runConsultationImport: mocks.runConsultationImport,
  };
});

import { GET as getConsultations } from "./route";
import { POST as postConsultationImport } from "./import/route";
import {
  GET as getConsultationReview,
  PATCH as patchConsultationReview,
} from "./review/[stagingId]/route";
import { ConsultationServiceError } from "@/features/consultations/consultation-service";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.test",
  role: "ADMIN" as const,
};

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const reviewContext = {
  params: Promise.resolve({
    stagingId: "11111111-1111-4111-8111-111111111111",
  }),
};

describe("Admin consultation APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
    mocks.requireApiRole.mockResolvedValue(admin);
  });

  it("authorizes before parsing queries, bodies, paths, or touching the database", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json(
        { error: "forbidden" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    );

    const responses = await Promise.all([
      getConsultations(new Request("http://localhost/api/admin/consultations?unknown=x")),
      postConsultationImport(
        new Request("http://localhost/api/admin/consultations/import", {
          method: "POST",
          body: "not-json",
        }),
      ),
      patchConsultationReview(
        new Request("http://localhost/api/admin/consultations/review/not-a-uuid", {
          method: "PATCH",
          body: "not-json",
        }),
        { params: Promise.resolve({ stagingId: "not-a-uuid" }) },
      ),
    ]);

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403]);
    expect(mocks.getDatabase).not.toHaveBeenCalled();
    expect(mocks.getConsultationWorkspace).not.toHaveBeenCalled();
    expect(mocks.runConsultationImport).not.toHaveBeenCalled();
    expect(mocks.decideConsultationReview).not.toHaveBeenCalled();
  });

  it("returns 401 for an unauthenticated caller", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    );
    const response = await getConsultations(
      new Request("http://localhost/api/admin/consultations"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.getDatabase).not.toHaveBeenCalled();
  });

  it("returns strict, uncached canonical workspace data", async () => {
    const workspace = {
      rows: [],
      reviewQueue: [],
      pendingReviewCount: 2,
      totalRows: 0,
      import: { status: null },
      pagination: { limit: 25, offset: 0 },
    };
    mocks.getConsultationWorkspace.mockResolvedValue(workspace);

    const response = await getConsultations(
      new Request("http://localhost/api/admin/consultations?limit=25"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(workspace);
    expect(mocks.getConsultationWorkspace).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ limit: 25 }),
    );
  });

  it("rejects unknown and duplicate query parameters before reading data", async () => {
    const unknown = await getConsultations(
      new Request("http://localhost/api/admin/consultations?includeContact=true"),
    );
    const repeated = await getConsultations(
      new Request("http://localhost/api/admin/consultations?limit=10&limit=20"),
    );

    expect(unknown.status).toBe(400);
    expect(repeated.status).toBe(400);
    expect(mocks.getConsultationWorkspace).not.toHaveBeenCalled();
  });

  it("bounds review JSON bodies and maps stale decisions to conflict", async () => {
    const tooLarge = await patchConsultationReview(
      jsonRequest(
        "http://localhost/api/admin/consultations/review/11111111-1111-4111-8111-111111111111",
        "PATCH",
        { expectedVersion: 1, acknowledgedAnomalies: ["SOURCE_ROW_CHANGED"], extra: "x".repeat(20_000) },
      ),
      reviewContext,
    );
    expect(tooLarge.status).toBe(400);
    expect(mocks.decideConsultationReview).not.toHaveBeenCalled();

    const unknownField = await patchConsultationReview(
      jsonRequest(
        "http://localhost/api/admin/consultations/review/11111111-1111-4111-8111-111111111111",
        "PATCH",
        { expectedVersion: 1, force: true },
      ),
      reviewContext,
    );
    expect(unknownField.status).toBe(400);
    expect(mocks.decideConsultationReview).not.toHaveBeenCalled();

    mocks.decideConsultationReview.mockRejectedValue(
      new ConsultationServiceError("stale_review"),
    );
    const stale = await patchConsultationReview(
      jsonRequest(
        "http://localhost/api/admin/consultations/review/11111111-1111-4111-8111-111111111111",
        "PATCH",
        { expectedVersion: 1, acknowledgedAnomalies: ["SOURCE_ROW_CHANGED"] },
      ),
      reviewContext,
    );

    expect(stale.status).toBe(409);
    expect(stale.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns safe not-found and degraded import responses", async () => {
    mocks.getConsultationReview.mockRejectedValue(
      new ConsultationServiceError("not_found"),
    );
    const missing = await getConsultationReview(
      new Request("http://localhost/api/admin/consultations/review/11111111-1111-4111-8111-111111111111"),
      reviewContext,
    );
    expect(missing.status).toBe(404);

    mocks.getConsultationReview.mockResolvedValue({ id: "staging-1" });
    const pagedReview = await getConsultationReview(
      new Request("http://localhost/api/admin/consultations/review/11111111-1111-4111-8111-111111111111?candidateLimit=10&candidateOffset=20"),
      reviewContext,
    );
    expect(pagedReview.status).toBe(200);
    expect(mocks.getConsultationReview).toHaveBeenLastCalledWith(
      {},
      "11111111-1111-4111-8111-111111111111",
      { candidateLimit: 10, candidateOffset: 20 },
    );
    const invalidReviewQuery = await getConsultationReview(
      new Request("http://localhost/api/admin/consultations/review/11111111-1111-4111-8111-111111111111?unknown=x"),
      reviewContext,
    );
    expect(invalidReviewQuery.status).toBe(400);

    const invalidImport = await postConsultationImport(
      jsonRequest(
        "http://localhost/api/admin/consultations/import",
        "POST",
        { overwrite: true },
      ),
    );
    expect(invalidImport.status).toBe(400);
    expect(mocks.runConsultationImport).not.toHaveBeenCalled();

    mocks.runConsultationImport.mockResolvedValue({
      outcome: "failed",
      summary: { errorCode: "source_not_configured", newRows: 0 },
    });
    const unavailable = await postConsultationImport(
      jsonRequest("http://localhost/api/admin/consultations/import", "POST", {}),
    );
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("Cache-Control")).toBe("no-store");
    expect(await unavailable.json()).toEqual({
      error: "import_unavailable",
      summary: { errorCode: "source_not_configured", newRows: 0 },
    });
  });
});
