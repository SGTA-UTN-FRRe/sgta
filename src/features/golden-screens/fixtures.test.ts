import { describe, expect, it } from "vitest";

import {
  goldenScreenFixtures,
  goldenScreenStateFixtures,
  type GoldenScreenId,
} from "./fixtures";

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
    expect(() => JSON.stringify(goldenScreenStateFixtures)).not.toThrow();
  });

  it("covers the reachable presentation states without timing or network dependencies", () => {
    expect(goldenScreenStateFixtures.login.map(({ state }) => state)).toEqual([
      "loading",
      "error",
      "permission-denied",
    ]);
    expect(goldenScreenStateFixtures["admin-overview"].map(({ state }) => state)).toEqual([
      "loading",
      "empty",
      "error",
      "degraded",
      "required-action",
    ]);
    expect(goldenScreenStateFixtures.tutors.map(({ state }) => state)).toEqual([
      "loading",
      "empty",
      "search-empty",
      "error",
      "required-action",
    ]);
    expect(goldenScreenStateFixtures.hours.map(({ state }) => state)).toEqual([
      "loading",
      "empty",
      "search-empty",
      "error",
      "required-action",
    ]);
    expect(goldenScreenStateFixtures.schedules.map(({ state }) => state)).toEqual([
      "loading",
      "empty",
      "error",
      "required-action",
      "conflict",
    ]);
  });

  it("does not include placeholder copy", () => {
    const serializedFixtures = JSON.stringify(goldenScreenFixtures).toLowerCase();
    const serializedStateFixtures = JSON.stringify(goldenScreenStateFixtures).toLowerCase();

    expect(serializedFixtures).not.toContain("lorem ipsum");
    expect(serializedFixtures).not.toContain("fake");
    expect(serializedStateFixtures).not.toContain("lorem ipsum");
    expect(serializedStateFixtures).not.toContain("fake");
  });
});
