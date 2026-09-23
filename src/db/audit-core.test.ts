import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AuditQueryDatabase } from "./audit-core";
import { listAuditEvents } from "./audit-core";

describe("audit event queries", () => {
  it("returns safe event fields with a bounded newest-first limit", async () => {
    const event = {
      id: "audit-1",
      actorId: "admin-1",
      action: "cycle.created",
      entityType: "administrative_cycle",
      entityId: "cycle-1",
      metadata: { status: "OPEN" },
      requestId: "request-1",
      ipAddress: "203.0.113.10",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const limit = vi.fn().mockResolvedValue([event]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ orderBy });
    const select = vi.fn().mockReturnValue({ from });

    await expect(
      listAuditEvents({ select } as AuditQueryDatabase, 500),
    ).resolves.toEqual([event]);

    expect(limit).toHaveBeenCalledWith(100);
    expect(orderBy).toHaveBeenCalledTimes(1);
  });
});
