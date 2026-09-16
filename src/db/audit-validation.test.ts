import {
  parseAuditEventInput,
  validateSafeAuditMetadata,
} from "./audit-validation";

describe("audit input validation", () => {
  it("accepts bounded JSON metadata and normalizes text fields", () => {
    const parsed = parseAuditEventInput({
      actorId: "admin-1",
      action: "cycle.created",
      entityType: "AdministrativeCycle",
      entityId: "cycle-1",
      metadata: {
        source: "settings",
        changes: { status: "OPEN" },
      },
      requestId: "request-1",
      ipAddress: "192.0.2.1",
    });

    expect(parsed.action).toBe("cycle.created");
    expect(parsed.metadata).toEqual({
      source: "settings",
      changes: { status: "OPEN" },
    });
  });

  const secretBearingMetadata: unknown[] = [
    { password: "not persisted" },
    { access_token: "not persisted" },
    { providerProfile: { email: "person@example.test" } },
    { headers: { authorization: "Bearer secret" } },
  ];

  it.each(secretBearingMetadata)("rejects secret-bearing metadata: %j", (metadata) => {
    expect(validateSafeAuditMetadata(metadata)).not.toBeNull();
    expect(() =>
      parseAuditEventInput({
        action: "test",
        entityType: "Test",
        entityId: "test-1",
        metadata: metadata as Record<string, never>,
      }),
    ).toThrow();
  });

  it("rejects non-JSON values and oversized metadata", () => {
    expect(validateSafeAuditMetadata({ value: new Date() })).not.toBeNull();
    expect(
      validateSafeAuditMetadata({ value: "x".repeat(8_100) }),
    ).not.toBeNull();
  });
});
