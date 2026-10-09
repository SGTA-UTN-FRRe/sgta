import { CircleAlert, Monitor, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCareerAbbreviation } from "@/shared/career-abbreviation";
import { cn } from "@/shared/utils";

import { careerFillClassNames } from "./schedule-block";
import {
  formatAssignmentLabel,
  formatMinutes,
  type AssignmentView,
  type MatrixCell,
  type MatrixRow,
} from "./schedule-view-model";

/** Partial-hour hint: the end when it leaves early, or the start when it arrives late. */
function partialHourHint(assignment: AssignmentView, hourStart: number) {
  if (assignment.endMinutes < hourStart + 60) return `–${assignment.end}`;
  if (assignment.startMinutes > hourStart) return `${assignment.start}–`;
  return null;
}

function MatrixChip({
  assignment,
  conflict,
  hourStart,
  onEdit,
  selected,
}: {
  assignment: AssignmentView;
  conflict: boolean;
  hourStart: number;
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
  selected: boolean;
}) {
  const label = formatAssignmentLabel(assignment, conflict);
  const hint = partialHourHint(assignment, hourStart);
  // One tab stop per assignment: later hours of the same assignment stay pointer-only.
  const firstHour = Math.floor(assignment.startMinutes / 60) * 60 === hourStart;

  return (
    <Button
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "flex min-h-8 max-w-full items-center gap-1 rounded-sm border px-2 py-1 text-xs font-bold shadow-xs transition-[filter] hover:brightness-95",
        careerFillClassNames[assignment.careerColor],
        assignment.kind === "RECOVERY" && "bg-hatch",
        conflict ? "border-destructive" : "border-input",
        selected && "outline-2 outline-offset-2 outline-primary",
      )}
      data-schedule-assignment-id={assignment.id}
      onClick={(event) => onEdit(assignment, event.currentTarget)}
      size="content"
      tabIndex={firstHour ? 0 : -1}
      title={label}
      type="button"
      variant="surface"
    >
      <span className="shrink-0 font-extrabold">{getCareerAbbreviation(assignment.careerName)}</span>
      <span className="min-w-0 truncate">{assignment.displayName}</span>
      {hint && <span className="shrink-0 font-normal tabular-nums">{hint}</span>}
      {assignment.modality === "VIRTUAL" && <Monitor aria-hidden="true" className="size-3 shrink-0" />}
      {assignment.kind === "RECOVERY" && <RotateCcw aria-hidden="true" className="size-3 shrink-0" />}
      {conflict && (
        <span className="inline-flex shrink-0 rounded-full bg-muted p-0.5 text-destructive">
          <CircleAlert aria-hidden="true" className="size-3" />
        </span>
      )}
    </Button>
  );
}

const coverageText = {
  minimal: "Un solo tutor presencial",
  uncovered: "Sin tutores presenciales",
} as const;

function MatrixCellView({
  cell,
  conflictIds,
  hourStart,
  onEdit,
  selectedAssignmentId,
}: {
  cell: MatrixCell;
  conflictIds: ReadonlySet<string>;
  hourStart: number;
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
  selectedAssignmentId: string | null;
}) {
  const flagged = cell.coverage === "minimal" || cell.coverage === "uncovered";

  return (
    <td
      className={cn(
        "relative border-l border-t border-border p-1.5 align-top",
        cell.coverage === "closed" && "bg-muted/50",
      )}
      data-coverage={cell.coverage}
      title={flagged ? coverageText[cell.coverage as keyof typeof coverageText] : undefined}
    >
      <div className="flex flex-wrap gap-1 pr-2">
        {cell.assignments.map((assignment) => (
          <MatrixChip
            assignment={assignment}
            conflict={conflictIds.has(assignment.id)}
            hourStart={hourStart}
            key={assignment.id}
            onEdit={onEdit}
            selected={assignment.id === selectedAssignmentId}
          />
        ))}
        {cell.coverage === "uncovered" && cell.assignments.length === 0 && (
          <span className="flex min-h-8 w-full items-center rounded-sm border border-dashed border-warning/60 px-2 text-xs text-muted-foreground">
            Sin cobertura
          </span>
        )}
      </div>
      {flagged && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-1 top-1 size-2 rounded-full border-2 border-warning",
            cell.coverage === "uncovered" && "bg-warning",
          )}
        />
      )}
      {flagged && <span className="sr-only">{coverageText[cell.coverage as keyof typeof coverageText]}</span>}
    </td>
  );
}

export function ScheduleMatrix({
  conflictIds,
  days,
  label,
  onEdit,
  rows,
  selectedAssignmentId,
}: {
  conflictIds: ReadonlySet<string>;
  days: readonly string[];
  label: string;
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
  rows: readonly MatrixRow[];
  selectedAssignmentId: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table aria-label={label} className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-16" />
          {days.map((day) => (
            <col key={day} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="px-2 py-2.5" scope="col">
              <span className="sr-only">Horario</span>
            </th>
            {days.map((day) => (
              <th
                className="border-l border-border px-2 py-2.5 text-center text-xs font-semibold tracking-eyebrow text-muted-foreground"
                key={day}
                scope="col"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.kind === "gap" ? (
              <tr key={`gap-${row.startMinutes}`}>
                <th
                  className="border-t border-border px-2 py-1.5 text-left text-xs font-normal tabular-nums text-muted-foreground"
                  scope="row"
                >
                  {formatMinutes(row.startMinutes)}
                </th>
                <td
                  className="border-t border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground"
                  colSpan={days.length}
                >
                  {formatMinutes(row.startMinutes)}–{formatMinutes(row.endMinutes)} · Sin guardias asignadas
                </td>
              </tr>
            ) : (
              <tr key={row.startMinutes}>
                <th
                  className="border-t border-border px-2 py-2 text-left align-top text-xs font-semibold tabular-nums"
                  scope="row"
                >
                  {formatMinutes(row.startMinutes)}
                  <span className="block font-normal text-muted-foreground">
                    {formatMinutes(row.endMinutes)}
                  </span>
                </th>
                {days.map((day) => (
                  <MatrixCellView
                    cell={row.cells[day]!}
                    conflictIds={conflictIds}
                    hourStart={row.startMinutes}
                    key={day}
                    onEdit={onEdit}
                    selectedAssignmentId={selectedAssignmentId}
                  />
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
