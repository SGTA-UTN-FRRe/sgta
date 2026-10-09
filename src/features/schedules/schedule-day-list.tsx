import { Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CareerBadge } from "@/shared/components/career-badge";
import { SCHEDULE_MODALITY_LABELS } from "@/shared/schedule-modality";
import { cn } from "@/shared/utils";

import { AssignmentCues } from "./schedule-block";
import { formatAssignmentLabel, type AssignmentView } from "./schedule-view-model";

export const dayToggleLabels: Record<string, string> = {
  DOM: "Dom",
  JUE: "Jue",
  LUN: "Lun",
  MAR: "Mar",
  MIÉ: "Mié",
  SÁB: "Sáb",
  VIE: "Vie",
};

function DayListItem({
  assignment,
  conflict,
  onEdit,
  selected,
}: {
  assignment: AssignmentView;
  conflict: boolean;
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
  selected: boolean;
}) {
  const label = formatAssignmentLabel(assignment, conflict);

  return (
    <li>
      <Button
        aria-label={label}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-start gap-3 rounded-none p-3 hover:bg-muted",
          selected && "outline-2 -outline-offset-2 outline-primary",
        )}
        data-schedule-assignment-id={assignment.id}
        onClick={(event) => onEdit(assignment, event.currentTarget)}
        size="content"
        title={label}
        type="button"
        variant="surface"
      >
        <span aria-hidden="true" className="flex w-12 shrink-0 justify-center">
          <CareerBadge color={assignment.careerColor} name={assignment.careerName} size="sm" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-semibold">{assignment.displayName}</span>
          <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            {assignment.start}–{assignment.end} · {SCHEDULE_MODALITY_LABELS[assignment.modality]}
            {assignment.modality === "VIRTUAL" && <Monitor aria-hidden="true" className="size-3" />}
          </span>
          <AssignmentCues assignment={assignment} conflict={conflict} />
        </span>
      </Button>
    </li>
  );
}

const dayColumns: Record<number, string> = { 5: "grid-cols-5", 6: "grid-cols-6", 7: "grid-cols-7" };

/** Compact day selector shared by the day matrix and the day list. */
export function ScheduleDaySelector({
  days,
  onSelectDay,
  selectedDay,
}: {
  days: readonly string[];
  onSelectDay: (day: string) => void;
  selectedDay: string;
}) {
  return (
    <ToggleGroup
      aria-label="Días del plan"
      className={cn("grid gap-1 rounded-full border border-border bg-card p-1", dayColumns[days.length])}
      onValueChange={(day) => {
        if (day) {
          onSelectDay(day);
        }
      }}
      type="single"
      value={selectedDay}
    >
      {days.map((day) => (
        <ToggleGroupItem className="w-full" key={day} value={day}>
          {dayToggleLabels[day]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function ScheduleDayList({
  assignments,
  conflictIds,
  onEdit,
  selectedAssignmentId,
  selectedDay,
}: {
  assignments: readonly AssignmentView[];
  conflictIds: ReadonlySet<string>;
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
  selectedAssignmentId: string | null;
  selectedDay: string;
}) {
  const dayAssignments = assignments
    .filter((assignment) => assignment.day === selectedDay)
    .sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);

  return dayAssignments.length === 0 ? (
    <p className="py-2 text-sm text-muted-foreground">
      Agregar una asignación para completar este día del plan.
    </p>
  ) : (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      {dayAssignments.map((assignment) => (
        <DayListItem
          assignment={assignment}
          conflict={conflictIds.has(assignment.id)}
          key={assignment.id}
          onEdit={onEdit}
          selected={assignment.id === selectedAssignmentId}
        />
      ))}
    </ul>
  );
}
