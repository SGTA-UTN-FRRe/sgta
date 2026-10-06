import { describe, expect, it } from "vitest";

import { layoutDayAssignments } from "./schedule-layout";

function assignment(
  id: string,
  tutorName: string,
  startMinutes: number,
  endMinutes: number,
) {
  return { endMinutes, id, startMinutes, tutorName };
}

describe("schedule grid layout", () => {
  it("uses duration heights with a two-rem minimum", () => {
    const layout = layoutDayAssignments([
      assignment("thirty", "Rivera, Alex", 480, 510),
      assignment("sixty", "Morgan, Jamie", 480, 540),
      assignment("one-twenty", "Taylor, Casey", 480, 600),
    ]);

    expect(layout.map(({ height, top }) => ({ height, top }))).toEqual([
      { height: 2, top: 0 },
      { height: 4, top: 0 },
      { height: 8, top: 0 },
    ]);
  });

  it("places concurrent tutors in chronological deterministic lanes", () => {
    const layout = layoutDayAssignments([
      assignment("third", "Costa, Alex", 480, 600),
      assignment("second", "Bustos, Alex", 480, 600),
      assignment("first", "Alvarez, Alex", 480, 600),
    ]);

    expect(
      layout.map(({ assignment: item, lane, laneCount }) => ({
        id: item.id,
        lane,
        laneCount,
      })),
    ).toEqual([
      { id: "first", lane: 0, laneCount: 3 },
      { id: "second", lane: 1, laneCount: 3 },
      { id: "third", lane: 2, laneCount: 3 },
    ]);
  });

  it("separates back-to-back short blocks into non-overlapping clusters", () => {
    const layout = layoutDayAssignments([
      assignment("later", "Morgan, Jamie", 510, 540),
      assignment("earlier", "Rivera, Alex", 480, 510),
    ]);

    expect(
      layout.map(({ assignment: item, clusterIndex, height, lane, laneCount, top }) => ({
        clusterIndex,
        height,
        id: item.id,
        lane,
        laneCount,
        top,
      })),
    ).toEqual([
      {
        clusterIndex: 0,
        height: 2,
        id: "earlier",
        lane: 0,
        laneCount: 1,
        top: 0,
      },
      {
        clusterIndex: 1,
        height: 2,
        id: "later",
        lane: 0,
        laneCount: 1,
        top: 2,
      },
    ]);
  });

  it("never overlaps rendered extents assigned to the same lane", () => {
    const layout = layoutDayAssignments([
      assignment("long-a", "Rivera, Alex", 480, 600),
      assignment("short-a", "Bustos, Alex", 480, 510),
      assignment("short-b", "Costa, Alex", 510, 540),
      assignment("short-c", "Diaz, Alex", 540, 570),
      assignment("long-b", "Etcheverry, Alex", 600, 720),
      assignment("short-d", "Fernandez, Alex", 630, 660),
      assignment("late", "Gomez, Alex", 1140, 1170),
    ]);

    for (let leftIndex = 0; leftIndex < layout.length; leftIndex += 1) {
      const left = layout[leftIndex]!;

      for (let rightIndex = leftIndex + 1; rightIndex < layout.length; rightIndex += 1) {
        const right = layout[rightIndex]!;
        const intersects =
          left.top < right.top + right.height &&
          right.top < left.top + left.height;

        if (left.lane === right.lane) {
          expect(intersects).toBe(false);
        }
      }
    }
  });
});
