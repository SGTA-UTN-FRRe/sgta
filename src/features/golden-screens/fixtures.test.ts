import { describe, expect, it } from "vitest";

import { goldenScreenFixtures, type GoldenScreenId } from "./fixtures";

describe("Golden Screen fixtures", () => {
  it("exposes the five approved visual surfaces", () => {
    const screenIds: GoldenScreenId[] = [
      "login",
      "admin-overview",
      "tutors",
      "hours",
      "schedules",
    ];

    expect(Object.keys(goldenScreenFixtures)).toEqual([
      "login",
      "adminOverview",
      "tutors",
      "hours",
      "schedules",
    ]);
    expect(screenIds).toEqual([
      "login",
      "admin-overview",
      "tutors",
      "hours",
      "schedules",
    ]);
  });

  it("contains useful synthetic content for each data-driven screen", () => {
    expect(goldenScreenFixtures.adminOverview.attention).toHaveLength(3);
    expect(goldenScreenFixtures.adminOverview.upcomingDuties).toHaveLength(3);
    expect(goldenScreenFixtures.tutors.rows).toHaveLength(4);
    expect(goldenScreenFixtures.hours.balances).toHaveLength(3);
    expect(goldenScreenFixtures.hours.movementDialog.eligibleTutors).toHaveLength(3);
    expect(goldenScreenFixtures.hours.movementDialog.directionOptions).toEqual([
      { value: "credit", label: "Crédito" },
      { value: "debit", label: "Débito" },
    ]);
    expect(goldenScreenFixtures.schedules.plans).toHaveLength(2);
    expect(goldenScreenFixtures.schedules.assignments).toHaveLength(4);
  });

  it("keeps fixture data serializable for future Server-to-Client boundaries", () => {
    expect(() => JSON.stringify(goldenScreenFixtures)).not.toThrow();
  });

  it("does not include placeholder copy", () => {
    const serializedFixtures = JSON.stringify(goldenScreenFixtures).toLowerCase();

    expect(serializedFixtures).not.toContain("lorem ipsum");
    expect(serializedFixtures).not.toContain("fake");
  });
});
