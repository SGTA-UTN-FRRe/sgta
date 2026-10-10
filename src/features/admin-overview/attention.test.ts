import { describe, expect, it } from "vitest";
import type { AdminOverviewReadModel } from "./admin-overview-service";
import { buildAdminOverviewViewModel } from "./attention";

const model = {
  currentDate: "2026-09-16",
  cycle: { id: "cycle", name: "2026", startDate: "2026-01-01", endDate: "2026-12-31", status: "OPEN", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  negativeBalances: { status: "ready", value: 2 },
  consultationReviews: { status: "ready", value: 3 },
  consultationSource: { status: "ready", value: { degraded: false } },
  upcomingDuties: { status: "ready", value: [{ id: "duty", date: "2026-09-16", dayLabel: "Hoy", time: "08:00 — 10:00", tutor: "Example Tutor", modality: "Presencial" }] },
} satisfies AdminOverviewReadModel;

describe("Admin overview view model", () => {
  it("keeps counts and their existing destinations with cycle and duty context", () => {
    const { data, state } = buildAdminOverviewViewModel(model);
    expect(state).toBe("default");
    expect(data.attention.map(({ count, href }) => ({ count, href }))).toEqual([
      { count: 2, href: "/admin/hours" },
      { count: 3, href: "/admin/consultations?status=PENDING_REVIEW" },
    ]);
    expect(data.cycle).toMatchObject({ name: "2026", statusLabel: "Ciclo abierto" });
    expect(data.upcomingDuties).toEqual(model.upcomingDuties.value);
  });

  it("requires a cycle without fabricating attention or duties", () => {
    const { data, state } = buildAdminOverviewViewModel({ currentDate: model.currentDate, cycle: null });
    expect(state).toBe("required-action");
    expect(data).toMatchObject({ cycle: null, attention: [], upcomingDuties: [] });
  });

  it("shows empty attention while preserving available duties", () => {
    const { data, state } = buildAdminOverviewViewModel({ ...model, negativeBalances: { status: "ready", value: 0 }, consultationReviews: { status: "ready", value: 0 } });
    expect(state).toBe("empty");
    expect(data.attention).toEqual([]);
    expect(data.upcomingDuties).toEqual(model.upcomingDuties.value);
  });

  it("isolates failed reads and preserves available consultation attention", () => {
    const { data, state } = buildAdminOverviewViewModel({ ...model, negativeBalances: { status: "error" }, consultationSource: { status: "error" }, upcomingDuties: { status: "error" } });
    expect(state).toBe("default");
    expect(data.attention).toHaveLength(1);
    expect(data.attentionFailures?.map(({ actionHref }) => actionHref)).toEqual(["/admin/hours", "/admin/consultations"]);
    expect(data.upcomingFailure?.actionHref).toBe("/admin/schedules?cycleId=cycle&date=2026-09-16");
    expect(data.upcomingDuties).toEqual([]);
  });

  it("degrades only source health while retaining internal operations", () => {
    const { data, state } = buildAdminOverviewViewModel({ ...model, consultationSource: { status: "ready", value: { degraded: true } } });
    expect(state).toBe("degraded");
    expect(data.attention).toHaveLength(2);
    expect(data.upcomingDuties).toEqual(model.upcomingDuties.value);
  });
});
