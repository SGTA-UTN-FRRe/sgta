import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_SCHEDULE_GRID_RANGE,
  layoutDayAssignments,
  SCHEDULE_GRID_HOUR_HEIGHT_REM,
  SCHEDULE_GRID_MIN_DAY_WIDTH_REM,
  SCHEDULE_GRID_MIN_LANE_WIDTH_REM,
  SCHEDULE_GRID_TIME_RAIL_WIDTH_REM,
  type ScheduleGridRange,
} from "./schedule-layout";
import { ScheduleBlock } from "./schedule-block";
import { formatMinutes, PLAN_WEEKDAYS, type AssignmentView } from "./schedule-view-model";

function TimeRail({ gridHeightRem, gridHours }: { gridHeightRem: number; gridHours: readonly number[] }) {
  return (
    <div aria-hidden="true" className="relative border-r border-border" style={{ height: `${gridHeightRem}rem` }}>
      {gridHours.map((minutes, index) => (
        <span
          className={
            index === 0
              ? "absolute right-2 translate-y-1 text-xs tabular-nums text-muted-foreground"
              : index === gridHours.length - 1
                ? "absolute right-2 -translate-y-full pb-1 text-xs tabular-nums text-muted-foreground"
                : "absolute right-2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground"
          }
          key={minutes}
          style={{ top: `${index * SCHEDULE_GRID_HOUR_HEIGHT_REM}rem` }}
        >
          {formatMinutes(minutes)}
        </span>
      ))}
    </div>
  );
}

/** Measures each day column so blocks can reflow instead of clipping in narrow lanes. */
function useDayColumnWidths() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<Record<string, number>>({});

  useEffect(() => {
    const grid = gridRef.current;

    if (!grid || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      const next: Record<string, number> = {};

      for (const column of grid.querySelectorAll<HTMLElement>("[data-schedule-day-column]")) {
        next[column.dataset.scheduleDayColumn ?? ""] = column.getBoundingClientRect().width;
      }

      setWidths((current) =>
        Object.keys(next).every((day) => current[day] === next[day]) ? current : next,
      );
    });
    observer.observe(grid);

    return () => observer.disconnect();
  }, []);

  return { gridRef, widths };
}

export function ScheduleWeekGrid({
  assignments,
  conflictIds,
  days: visibleDays = PLAN_WEEKDAYS,
  label,
  onEdit,
  range = DEFAULT_SCHEDULE_GRID_RANGE,
  readOnly = false,
  selectedAssignmentId,
}: {
  assignments: readonly AssignmentView[];
  conflictIds: ReadonlySet<string>;
  days?: readonly string[];
  label: string;
  onEdit?: (assignment: AssignmentView, trigger: HTMLElement) => void;
  /** Visible whole-hour range; derived from the plan's assignments by the screen. */
  range?: ScheduleGridRange;
  readOnly?: boolean;
  selectedAssignmentId: string | null;
}) {
  const { gridRef, widths } = useDayColumnWidths();
  const gridHeightRem = ((range.endMinutes - range.startMinutes) / 60) * SCHEDULE_GRID_HOUR_HEIGHT_REM;
  const gridHours = Array.from(
    { length: (range.endMinutes - range.startMinutes) / 60 + 1 },
    (_, index) => range.startMinutes + index * 60,
  );
  const days = visibleDays.map((day) => {
    const layouts = layoutDayAssignments(
      assignments.filter((assignment) => assignment.day === day),
      range,
    );
    const laneCount = layouts.reduce((maximum, layout) => Math.max(maximum, layout.laneCount), 1);

    return {
      day,
      layouts,
      minimumWidthRem: Math.max(
        SCHEDULE_GRID_MIN_DAY_WIDTH_REM,
        laneCount * SCHEDULE_GRID_MIN_LANE_WIDTH_REM,
      ),
    };
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
      <div
        aria-label={label}
        className="grid"
        ref={gridRef}
        role="group"
        style={{
          gridTemplateColumns: `${SCHEDULE_GRID_TIME_RAIL_WIDTH_REM}rem ${days
            .map(({ minimumWidthRem }) => `minmax(${minimumWidthRem}rem, 1fr)`)
            .join(" ")}`,
        }}
      >
        <div className="border-b border-r border-border">
          <span className="sr-only">Hora</span>
        </div>
        {days.map(({ day }, index) => (
          <div
            className={
              index === days.length - 1
                ? "border-b border-border px-2 py-3 text-center text-xs font-semibold tracking-eyebrow text-muted-foreground"
                : "border-b border-r border-border px-2 py-3 text-center text-xs font-semibold tracking-eyebrow text-muted-foreground"
            }
            key={day}
          >
            {day}
          </div>
        ))}
        <TimeRail gridHeightRem={gridHeightRem} gridHours={gridHours} />
        {days.map(({ day, layouts }) => (
          <div
            className="relative border-r border-border last:border-r-0"
            data-schedule-day-column={day}
            key={day}
            style={{ height: `${gridHeightRem}rem` }}
          >
            {gridHours.slice(1, -1).map((minutes, index) => (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-border"
                key={minutes}
                style={{ top: `${(index + 1) * SCHEDULE_GRID_HOUR_HEIGHT_REM}rem` }}
              />
            ))}
            {layouts.map(({ assignment, ...layout }) => (
              <ScheduleBlock
                assignment={assignment}
                conflict={conflictIds.has(assignment.id)}
                key={assignment.id}
                laneWidth={widths[day] === undefined ? undefined : widths[day] / layout.laneCount - 4}
                layout={layout}
                onEdit={onEdit}
                readOnly={readOnly}
                selected={assignment.id === selectedAssignmentId}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
