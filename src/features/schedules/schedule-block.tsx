import { CircleAlert, Monitor, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { getCareerAbbreviation } from "@/shared/career-abbreviation";
import type { CareerColor } from "@/shared/career-color";
import { StatusBadge } from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

import type { LaidOutScheduleAssignment } from "./schedule-layout";
import { formatAssignmentLabel, type AssignmentView } from "./schedule-view-model";

export const careerFillClassNames: Record<CareerColor, string> = {
  BLUE: "bg-career-blue text-career-blue-foreground",
  EMERALD: "bg-career-emerald text-career-emerald-foreground",
  VIOLET: "bg-career-violet text-career-violet-foreground",
  YELLOW: "bg-career-yellow text-career-yellow-foreground",
  CYAN: "bg-career-cyan text-career-cyan-foreground",
  MAGENTA: "bg-career-magenta text-career-magenta-foreground",
  LIME: "bg-career-lime text-career-lime-foreground",
  GRAPHITE: "bg-career-graphite text-career-graphite-foreground",
};

/** Recovery and conflict cues shown as badges with visible text. */
export function AssignmentCues({ assignment, conflict }: { assignment: AssignmentView; conflict: boolean }) {
  if (assignment.kind !== "RECOVERY" && !conflict) {
    return null;
  }

  return (
    <span className="flex flex-wrap gap-1">
      {assignment.kind === "RECOVERY" && (
        <StatusBadge icon={RotateCcw} label="Recuperación" variant="neutral" />
      )}
      {conflict && <StatusBadge icon={CircleAlert} label="Conflicto" variant="danger" />}
    </span>
  );
}

/** Icon-only cues for one-line blocks; the text stays available to assistive technology. */
function CompactCues({ assignment, conflict }: { assignment: AssignmentView; conflict: boolean }) {
  if (assignment.kind !== "RECOVERY" && !conflict && assignment.modality !== "VIRTUAL") {
    return null;
  }

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {assignment.modality === "VIRTUAL" && (
        <span className="inline-flex p-0.5">
          <Monitor aria-hidden="true" className="size-3" />
          <span className="sr-only">Virtual</span>
        </span>
      )}
      {assignment.kind === "RECOVERY" && (
        <span className="inline-flex rounded-full bg-muted p-0.5 text-foreground">
          <RotateCcw aria-hidden="true" className="size-3" />
          <span className="sr-only">Recuperación</span>
        </span>
      )}
      {conflict && (
        <span className="inline-flex rounded-full bg-muted p-0.5 text-destructive">
          <CircleAlert aria-hidden="true" className="size-3" />
          <span className="sr-only">Conflicto</span>
        </span>
      )}
    </span>
  );
}

// Lane widths below which the block content reflows instead of clipping.
const ONE_LINE_MIN_WIDTH_PX = 8 * 16;
const CUE_BADGES_MIN_WIDTH_PX = 9 * 16;

function BlockContent({
  assignment,
  conflict,
  laneWidth,
  oneLine,
}: {
  assignment: AssignmentView;
  conflict: boolean;
  /** Measured lane width in pixels; unknown widths use the widest layout. */
  laneWidth?: number;
  oneLine: boolean;
}) {
  const fitsOneLine = laneWidth === undefined || laneWidth >= ONE_LINE_MIN_WIDTH_PX;
  const fitsCueBadges = laneWidth === undefined || laneWidth >= CUE_BADGES_MIN_WIDTH_PX;
  const abbreviation = (
    <span className="shrink-0 text-xs font-bold">
      {getCareerAbbreviation(assignment.careerName)}
    </span>
  );
  const time = (
    <span
      className={cn(
        "shrink-0 text-xs font-semibold tabular-nums",
        fitsOneLine ? "whitespace-nowrap" : "whitespace-normal",
      )}
      data-schedule-assignment-time
    >
      {assignment.start}–{assignment.end}
    </span>
  );

  if (oneLine && fitsOneLine) {
    return (
      <>
        {abbreviation}
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">
          {assignment.displayName}
        </span>
        {time}
        <CompactCues assignment={assignment} conflict={conflict} />
      </>
    );
  }

  if (oneLine) {
    // Narrow lanes keep the abbreviation and time visible; the name stays in the accessible name and tooltip.
    return (
      <>
        <span className="flex items-center gap-1">
          {abbreviation}
          <CompactCues assignment={assignment} conflict={conflict} />
        </span>
        {time}
      </>
    );
  }

  return (
    <>
      <span className="flex min-w-0 items-baseline gap-1.5">
        {abbreviation}
        <span className="min-w-0 truncate text-xs font-semibold">{assignment.displayName}</span>
      </span>
      {time}
      {assignment.modality === "VIRTUAL" && fitsCueBadges && (
        <span className="flex items-center gap-1 text-xs">
          <Monitor aria-hidden="true" className="size-3 shrink-0" />
          Virtual
        </span>
      )}
      <span className="mt-auto">
        {fitsCueBadges ? (
          <AssignmentCues assignment={assignment} conflict={conflict} />
        ) : (
          <CompactCues assignment={assignment} conflict={conflict} />
        )}
      </span>
    </>
  );
}

export function ScheduleBlock({
  assignment,
  conflict,
  laneWidth,
  layout,
  onEdit,
  readOnly = false,
  selected,
}: {
  assignment: AssignmentView;
  conflict: boolean;
  laneWidth?: number;
  layout: Omit<LaidOutScheduleAssignment<AssignmentView>, "assignment">;
  onEdit?: (assignment: AssignmentView, trigger: HTMLElement) => void;
  readOnly?: boolean;
  selected: boolean;
}) {
  const oneLine = assignment.endMinutes - assignment.startMinutes <= 60;
  const oneLineRow = oneLine && (laneWidth === undefined || laneWidth >= ONE_LINE_MIN_WIDTH_PX);
  const label = formatAssignmentLabel(assignment, conflict);
  const style: CSSProperties = {
    height: `${layout.height}rem`,
    left: `calc(${(layout.lane / layout.laneCount) * 100}% + 0.125rem)`,
    top: `${layout.top}rem`,
    width: `calc(${100 / layout.laneCount}% - 0.25rem)`,
  };
  const className = cn(
    "absolute z-10 overflow-hidden rounded-sm border shadow-xs",
    oneLineRow
      ? "flex flex-row items-center gap-1 px-1.5 py-0.5"
      : oneLine
        ? "flex flex-col items-start justify-center gap-0 px-1.5 py-0.5"
        : "flex flex-col items-stretch gap-0.5 p-1.5",
    careerFillClassNames[assignment.careerColor],
    assignment.kind === "RECOVERY" && "bg-hatch",
    conflict ? "border-destructive" : "border-input",
    selected && "outline-2 outline-offset-2 outline-primary",
  );
  const content = (
    <BlockContent assignment={assignment} conflict={conflict} laneWidth={laneWidth} oneLine={oneLine} />
  );

  if (readOnly) {
    return (
      <div
        className={className}
        data-duration-layout={oneLine ? "compact" : "full"}
        data-schedule-assignment-id={assignment.id}
        style={style}
        title={label}
      >
        <span className="sr-only">{label}</span>
        <span aria-hidden="true" className="contents">
          {content}
        </span>
      </div>
    );
  }

  return (
    <Button
      aria-label={label}
      aria-pressed={selected}
      className={cn(className, "transition-[filter] hover:brightness-95")}
      data-duration-layout={oneLine ? "compact" : "full"}
      data-schedule-assignment-id={assignment.id}
      onClick={(event) => onEdit?.(assignment, event.currentTarget)}
      size="content"
      style={style}
      title={label}
      type="button"
      variant="surface"
    >
      {content}
    </Button>
  );
}
