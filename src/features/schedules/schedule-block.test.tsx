import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScheduleBlock } from "./schedule-block";
import type { SafeSchedulePlan } from "./schedule-service";
import { toAssignmentView } from "./schedule-view-model";

const plan: SafeSchedulePlan = {
  createdAt: "2026-08-01T12:00:00.000Z",
  cycleId: "11111111-1111-4111-8111-111111111111",
  id: "22222222-2222-4222-8222-222222222222",
  kind: "REGULAR",
  name: "Regular",
  status: "ACTIVE",
  updatedAt: "2026-08-01T12:00:00.000Z",
  validFrom: "2026-08-03",
  validTo: "2026-11-27",
};

const layout = { clusterIndex: 0, height: 4, lane: 0, laneCount: 1, top: 0 };

function renderBlock({ endMinutes, laneWidth }: { endMinutes: number; laneWidth?: number }) {
  const assignment = toAssignmentView(
    {
      assignmentDate: null,
      careerColor: "YELLOW",
      careerName: "Ingeniería Electromecánica",
      createdAt: "2026-08-02T12:00:00.000Z",
      endMinutes,
      id: "66666666-6666-4666-8666-666666666666",
      kind: "RECOVERY",
      modality: "IN_PERSON",
      pattern: "WEEKDAY",
      planId: plan.id,
      startMinutes: 480,
      status: "ACTIVE",
      tutorId: "44444444-4444-4444-8444-444444444444",
      tutorName: "Husak, Guillermo",
      tutorDisplayName: "Guillermo",
      updatedAt: "2026-08-02T12:00:00.000Z",
      weekday: 1,
    },
    plan,
  );

  render(
    <ScheduleBlock assignment={assignment} conflict laneWidth={laneWidth} layout={layout} onEdit={() => {}} selected={false} />,
  );

  return screen.getByRole("button", {
    name: "Husak, Guillermo, Ingeniería Electromecánica, lunes, 08:00 a " +
      (endMinutes === 540 ? "09:00" : "10:00") + ", Recuperación, conflicto de horario",
  });
}

describe("ScheduleBlock", () => {
  it("keeps a wide one-line block on a single row with the display name", () => {
    const block = renderBlock({ endMinutes: 540 });

    expect(block).toHaveClass("flex-row", "bg-career-yellow", "bg-hatch", "border-destructive");
    expect(block).toHaveTextContent("IEGuillermo08:00–09:00");
    expect(block.querySelector("[data-schedule-assignment-time]")).toHaveClass("whitespace-nowrap");
  });

  it("stacks a one-line block in a narrow lane so the abbreviation and time stay visible", () => {
    const block = renderBlock({ endMinutes: 540, laneWidth: 60 });

    expect(block).toHaveClass("flex-col");
    expect(block).not.toHaveTextContent("Guillermo");
    expect(block).toHaveTextContent("IE");
    expect(block.querySelector("[data-schedule-assignment-time]")).toHaveClass("whitespace-normal");
  });

  it("shows cue badges with text when the lane fits them", () => {
    const wide = renderBlock({ endMinutes: 600, laneWidth: 200 });

    expect(within(wide).getByText("Recuperación", { selector: ":not(.sr-only)" })).toBeInTheDocument();
    expect(within(wide).getByText("Conflicto", { selector: ":not(.sr-only)" })).toBeInTheDocument();
  });

  it("collapses cue badges to icons when the lane cannot fit their text", () => {
    const narrow = renderBlock({ endMinutes: 600, laneWidth: 100 });

    expect(within(narrow).getByText("Recuperación", { selector: ".sr-only" })).toBeInTheDocument();
    expect(within(narrow).getByText("Conflicto", { selector: ".sr-only" })).toBeInTheDocument();
  });
});
