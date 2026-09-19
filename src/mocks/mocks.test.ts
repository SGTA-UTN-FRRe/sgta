import { describe, expect, it } from "vitest";

import { adminOverviewScreenData, adminOverviewStateFixtures } from "./admin-overview.mock";
import { hoursScreenData, hoursStateFixtures } from "./hours.mock";
import { loginScreenData, loginStateFixtures } from "./login.mock";
import { schedulesScreenData, schedulesStateFixtures } from "./schedules.mock";
import {
  tutorsScreenData,
  tutorsStateFixtures,
} from "@/features/tutors/tutors-screen.fixtures";

const screenData = {
  login: loginScreenData,
  adminOverview: adminOverviewScreenData,
  tutors: tutorsScreenData,
  hours: hoursScreenData,
  schedules: schedulesScreenData,
};

const stateData = {
  login: loginStateFixtures,
  adminOverview: adminOverviewStateFixtures,
  tutors: tutorsStateFixtures,
  hours: hoursStateFixtures,
  schedules: schedulesStateFixtures,
};

describe("screen mock data", () => {
  it("exposes the approved data-driven surfaces", () => {
    expect(Object.keys(screenData)).toEqual([
      "login",
      "adminOverview",
      "tutors",
      "hours",
      "schedules",
    ]);
  });

  it("contains useful synthetic content for each data-driven screen", () => {
    expect(screenData.adminOverview.attention).toHaveLength(3);
    expect(screenData.adminOverview.upcomingDuties).toHaveLength(3);
    expect(screenData.tutors.rows).toHaveLength(4);
    expect(screenData.hours.balances).toHaveLength(3);
    expect(screenData.hours.eligibleTutors).toHaveLength(3);
    expect(screenData.hours.categories).toHaveLength(4);
    expect(screenData.schedules.plans).toHaveLength(2);
    expect(screenData.schedules.assignments).toHaveLength(4);
  });

  it("keeps mock data serializable for future Server-to-Client boundaries", () => {
    expect(() => JSON.stringify(screenData)).not.toThrow();
    expect(() => JSON.stringify(stateData)).not.toThrow();
  });

  it("covers reachable presentation states without timing or network dependencies", () => {
    expect(stateData.login.map(({ state }) => state)).toEqual([
      "loading",
      "error",
      "permission-denied",
    ]);
    expect(stateData.adminOverview.map(({ state }) => state)).toEqual([
      "loading",
      "empty",
      "error",
      "degraded",
      "required-action",
    ]);
    expect(stateData.tutors.map(({ state }) => state)).toEqual([
      "loading",
      "empty",
      "search-empty",
      "error",
      "required-action",
    ]);
    expect(stateData.hours.map(({ state }) => state)).toEqual([
      "loading",
      "empty",
      "search-empty",
      "error",
      "required-action",
    ]);
    expect(stateData.schedules.map(({ state }) => state)).toEqual([
      "loading",
      "empty",
      "error",
      "required-action",
      "conflict",
    ]);
  });

  it("does not include placeholder copy", () => {
    const serializedData = JSON.stringify(screenData).toLowerCase();
    const serializedStateData = JSON.stringify(stateData).toLowerCase();

    expect(serializedData).not.toContain("lorem ipsum");
    expect(serializedData).not.toContain("fake");
    expect(serializedStateData).not.toContain("lorem ipsum");
    expect(serializedStateData).not.toContain("fake");
  });
});
