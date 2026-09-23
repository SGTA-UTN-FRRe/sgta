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
    { studentContact: "student@example.test" },
    { emailAddress: "student@example.test" },
    { tutorName: "Ada Lovelace" },
    { phoneNumber: "+54 362 412 3456" },
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

  it("rejects credential-like request IDs and invalid IP addresses", () => {
    const base = {
      actorId: "admin-1",
      action: "cycle.created",
      entityType: "AdministrativeCycle",
      entityId: "cycle-1",
    };

    expect(() =>
      parseAuditEventInput({ ...base, requestId: "Bearer.secret-token-value" }),
    ).toThrow();
    expect(() =>
      parseAuditEventInput({ ...base, requestId: "student@example.test" }),
    ).toThrow();
    expect(() =>
      parseAuditEventInput({ ...base, ipAddress: "student@example.test" }),
    ).toThrow();
    expect(() => parseAuditEventInput({ ...base, ipAddress: "not-an-ip" })).toThrow();
  });

  it("rejects personal contact values even when stored under a generic metadata key", () => {
    expect(validateSafeAuditMetadata({ value: "student@example.test" })).not.toBeNull();
    expect(validateSafeAuditMetadata({ value: "+54 362 412 3456" })).not.toBeNull();
  });

  it("allows opaque UUID identifiers in otherwise safe audit metadata", () => {
    expect(
      validateSafeAuditMetadata({
        cycleId: "11111111-1111-4111-8111-111111111111",
        tutorId: "66666666-6666-4666-8666-666666666666",
      }),
    ).toBeNull();
  });
});
