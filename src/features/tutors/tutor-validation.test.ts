import { describe, expect, it } from "vitest";

import {
  createTutorInputSchema,
  createCareerInputSchema,
  updateCareerInputSchema,
  normalizeInstitutionalIdentifier,
  normalizeName,
  parseCreateTutorInput,
  parseTutorApplicationAccountInput,
  parseTutorSearchFilters,
  parseUpdateTutorInput,
} from "./tutor-validation";

describe("tutor validation boundary", () => {
  it("normalizes catalog names and institutional identifiers deterministically", () => {
    expect(normalizeName("  Ingeniería   de   Sistemas ")).toBe(
      "ingeniería de sistemas",
    );
    expect(normalizeInstitutionalIdentifier("  LEG-001 ")).toBe("leg-001");
  });

  it("applies safe defaults while keeping the input object strict", () => {
    expect(
      parseCreateTutorInput({
        firstName: " Ada ",
        lastName: " Lovelace ",
        primaryCareerId: "11111111-1111-4111-8111-111111111111",
        cycleId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      subjectIds: [],
      scholarshipReferenceId: null,
    });

    expect(() =>
      createTutorInputSchema.parse({
        firstName: "Ada",
        lastName: "Lovelace",
        primaryCareerId: "11111111-1111-4111-8111-111111111111",
        cycleId: "22222222-2222-4222-8222-222222222222",
        unexpected: true,
      }),
    ).toThrow();
  });

  it("accepts a missing surname and normalizes blank values to null", () => {
    const baseInput = {
      firstName: "Ada",
      primaryCareerId: "11111111-1111-4111-8111-111111111111",
      cycleId: "22222222-2222-4222-8222-222222222222",
    };

    expect(parseCreateTutorInput({ ...baseInput, lastName: "   " }).lastName).toBeNull();
    expect(parseCreateTutorInput(baseInput).lastName).toBeUndefined();
    expect(parseUpdateTutorInput({ lastName: "" })).toEqual({ lastName: null });
  });

  it("rejects duplicate subject IDs and membership changes without an explicit cycle", () => {
    expect(() =>
      parseCreateTutorInput({
        firstName: "Ada",
        lastName: "Lovelace",
        primaryCareerId: "00000000-0000-0000-0000-000000000001",
        cycleId: "00000000-0000-0000-0000-000000000002",
        subjectIds: [
          "33333333-3333-4333-8333-333333333333",
          "33333333-3333-4333-8333-333333333333",
        ],
      }),
    ).toThrow();

    expect(() =>
      parseUpdateTutorInput({
        scholarshipReferenceId: null,
      }),
    ).toThrow();
  });

  it("normalizes optional application account emails and rejects malformed values", () => {
    expect(
      parseCreateTutorInput({
        firstName: "Ada",
        lastName: "Lovelace",
        primaryCareerId: "11111111-1111-4111-8111-111111111111",
        cycleId: "22222222-2222-4222-8222-222222222222",
        applicationEmail: "  Tutor.Account@Example.Test ",
      }).applicationEmail,
    ).toBe("tutor.account@example.test");

    expect(
      parseUpdateTutorInput({ applicationEmail: "" }),
    ).toEqual({ applicationEmail: null });
    expect(parseTutorApplicationAccountInput({ applicationEmail: "" })).toEqual({
      applicationEmail: null,
    });
    expect(() =>
      parseTutorApplicationAccountInput({ applicationEmail: null, unexpected: true }),
    ).toThrow();

    expect(() => parseUpdateTutorInput({ applicationEmail: "not-an-email" })).toThrow();
  });

  it("coerces bounded list filters and rejects invalid ranges", () => {
    expect(
      parseTutorSearchFilters({
        search: " Ada ",
        limit: "25",
        offset: "5",
      }),
    ).toEqual({
      search: "Ada",
      status: "ALL",
      limit: 25,
      offset: 5,
    });

    expect(() => parseTutorSearchFilters({ limit: 201 })).toThrow();
  });
});


describe("career color validation", () => {
  it("accepts optional palette colors and color-only edits", () => {
    expect(createCareerInputSchema.parse({ name: "Systems" })).toEqual({ name: "Systems" });
    expect(createCareerInputSchema.parse({ name: "Systems", color: "CYAN" })).toMatchObject({ color: "CYAN" });
    expect(updateCareerInputSchema.parse({ color: "LIME" })).toEqual({ color: "LIME" });
  });
  it("rejects arbitrary colors, null, and empty edits", () => {
    for (const color of ["ORANGE", "blue", "#2563EB", null]) {
      expect(createCareerInputSchema.safeParse({ name: "Systems", color }).success).toBe(false);
      expect(updateCareerInputSchema.safeParse({ color }).success).toBe(false);
    }
    expect(updateCareerInputSchema.safeParse({}).success).toBe(false);
  });
});
