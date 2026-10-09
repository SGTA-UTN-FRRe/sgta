import type { SafeScheduleAssignment } from "./schedule-service";

export const SCHEDULE_GRID_START_MINUTES = 8 * 60;
export const SCHEDULE_GRID_END_MINUTES = 20 * 60;
export const SCHEDULE_GRID_HOUR_HEIGHT_REM = 4;
export const SCHEDULE_GRID_MIN_BLOCK_HEIGHT_REM = 2;
export const SCHEDULE_GRID_MIN_DAY_WIDTH_REM = 7;
export const SCHEDULE_GRID_TIME_RAIL_WIDTH_REM = 3.5;
export const SCHEDULE_GRID_MIN_LANE_WIDTH_REM = 3.5;

type ScheduleAssignmentLayoutInput = Pick<
  SafeScheduleAssignment,
  "endMinutes" | "id" | "startMinutes" | "tutorName"
>;

export type LaidOutScheduleAssignment<
  T extends ScheduleAssignmentLayoutInput = ScheduleAssignmentLayoutInput,
> = {
  assignment: T;
  clusterIndex: number;
  height: number;
  lane: number;
  laneCount: number;
  top: number;
};

/** Visible grid range in minutes since midnight, on whole hours. */
export type ScheduleGridRange = { endMinutes: number; startMinutes: number };

export const DEFAULT_SCHEDULE_GRID_RANGE: ScheduleGridRange = {
  endMinutes: SCHEDULE_GRID_END_MINUTES,
  startMinutes: SCHEDULE_GRID_START_MINUTES,
};

/** Smallest whole-hour range that contains every assignment, or the default range when empty. */
export function getScheduleGridRange(
  assignments: readonly Pick<SafeScheduleAssignment, "endMinutes" | "startMinutes">[],
): ScheduleGridRange {
  if (assignments.length === 0) {
    return DEFAULT_SCHEDULE_GRID_RANGE;
  }

  return {
    endMinutes: Math.ceil(Math.max(...assignments.map((item) => item.endMinutes)) / 60) * 60,
    startMinutes: Math.floor(Math.min(...assignments.map((item) => item.startMinutes)) / 60) * 60,
  };
}

type PositionedAssignment<T extends ScheduleAssignmentLayoutInput> = {
  assignment: T;
  bottom: number;
  height: number;
  top: number;
};

function compareAssignments<T extends ScheduleAssignmentLayoutInput>(
  left: T,
  right: T,
) {
  return (
    left.startMinutes - right.startMinutes ||
    left.endMinutes - right.endMinutes ||
    left.tutorName.localeCompare(right.tutorName) ||
    left.id.localeCompare(right.id)
  );
}

function positionAssignment<T extends ScheduleAssignmentLayoutInput>(
  assignment: T,
  range: ScheduleGridRange,
): PositionedAssignment<T> {
  const visibleStart = Math.max(assignment.startMinutes, range.startMinutes);
  const visibleEnd = Math.min(assignment.endMinutes, range.endMinutes);
  const durationMinutes = assignment.endMinutes - assignment.startMinutes;
  const visibleDurationMinutes = Math.max(0, visibleEnd - visibleStart);
  const top =
    ((visibleStart - range.startMinutes) / 60) *
    SCHEDULE_GRID_HOUR_HEIGHT_REM;
  const durationHeight =
    (visibleDurationMinutes / 60) * SCHEDULE_GRID_HOUR_HEIGHT_REM;
  const height = Math.max(
    durationHeight,
    durationMinutes <= 60 ? SCHEDULE_GRID_MIN_BLOCK_HEIGHT_REM : 0,
  );

  return { assignment, bottom: top + height, height, top };
}

function layoutCluster<T extends ScheduleAssignmentLayoutInput>(
  cluster: PositionedAssignment<T>[],
  clusterIndex: number,
): LaidOutScheduleAssignment<T>[] {
  const laneEnds: number[] = [];
  const laidOut = cluster.map((positioned) => {
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= positioned.top);

    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(positioned.bottom);
    } else {
      laneEnds[lane] = positioned.bottom;
    }

    return { ...positioned, clusterIndex, lane };
  });
  const laneCount = laneEnds.length;

  return laidOut.map(({ assignment, clusterIndex: index, height, lane, top }) => ({
    assignment,
    clusterIndex: index,
    height,
    lane,
    laneCount,
    top,
  }));
}

export function layoutDayAssignments<T extends ScheduleAssignmentLayoutInput>(
  assignments: readonly T[],
  range: ScheduleGridRange = DEFAULT_SCHEDULE_GRID_RANGE,
): LaidOutScheduleAssignment<T>[] {
  const positioned = assignments
    .map((assignment) => positionAssignment(assignment, range))
    .sort((left, right) => compareAssignments(left.assignment, right.assignment));
  const result: LaidOutScheduleAssignment<T>[] = [];
  let cluster: PositionedAssignment<T>[] = [];
  let clusterBottom = Number.NEGATIVE_INFINITY;
  let clusterIndex = 0;

  for (const assignment of positioned) {
    if (cluster.length > 0 && assignment.top >= clusterBottom) {
      result.push(...layoutCluster(cluster, clusterIndex));
      cluster = [];
      clusterBottom = Number.NEGATIVE_INFINITY;
      clusterIndex += 1;
    }

    cluster.push(assignment);
    clusterBottom = Math.max(clusterBottom, assignment.bottom);
  }

  if (cluster.length > 0) {
    result.push(...layoutCluster(cluster, clusterIndex));
  }

  return result;
}
