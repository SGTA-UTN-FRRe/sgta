"use client";

import { CalendarRange, CircleAlert, LayoutGrid } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CareerLegend } from "@/shared/components/career-legend";
import { SystemState } from "@/shared/components/system-state";

import { ScheduleDayList, ScheduleDaySelector } from "./schedule-day-list";
import { getScheduleGridRange } from "./schedule-layout";
import { ScheduleMatrix } from "./schedule-matrix";
import type { SafeScheduleWorkspace } from "./schedule-service";
import { ScheduleWeekGrid } from "./schedule-week-grid";
import {
  buildScheduleMatrix,
  formatAssignmentPerson,
  getPlanDays,
  getScheduleCareers,
  withDisplayNames,
  type AssignmentView,
  type CoverageSummary,
} from "./schedule-view-model";

interface ScheduleCalendarProps {
  calendarView: "matrix" | "blocks";
  conflicts: SafeScheduleWorkspace["conflicts"];
  onCalendarViewChange: (view: "matrix" | "blocks") => void;
  onEdit: (assignment: AssignmentView, trigger: HTMLElement) => void;
  onSelectedCareersChange: (careers: string[]) => void;
  onSelectedDayChange: (day: string) => void;
  planAssignments: AssignmentView[];
  selectedAssignmentId: string | null;
  selectedCareers: string[];
  selectedDay: string;
}

function describeAssignment(assignment: AssignmentView) {
  return `${formatAssignmentPerson(assignment)}, ${assignment.dayName}, ${assignment.start} a ${assignment.end}`;
}

/** Discreet coverage key: the dots match the cell markers of the matrix. */
function CoverageSummaryText({ summary }: { summary: CoverageSummary }) {
  if (summary.uncovered === 0 && summary.minimal === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden="true" className="size-2 rounded-full bg-success" />
        Cobertura presencial completa
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {summary.uncovered > 0 && (
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full border-2 border-warning bg-warning" />
          {summary.uncovered} {summary.uncovered === 1 ? "franja" : "franjas"} sin presencial
        </span>
      )}
      {summary.minimal > 0 && (
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full border-2 border-warning" />
          {summary.minimal} con un solo presencial
        </span>
      )}
    </p>
  );
}

export function ScheduleCalendar({
  calendarView, conflicts, onCalendarViewChange, onEdit, onSelectedCareersChange,
  onSelectedDayChange, planAssignments, selectedAssignmentId, selectedCareers, selectedDay,
}: ScheduleCalendarProps) {
  const displayAssignments = useMemo(() => withDisplayNames(planAssignments), [planAssignments]);
  const planDays = useMemo(() => getPlanDays(planAssignments), [planAssignments]);
  const currentDay = planDays.includes(selectedDay) ? selectedDay : planDays[0]!;
  const gridRange = useMemo(() => getScheduleGridRange(planAssignments), [planAssignments]);
  const careers = useMemo(() => getScheduleCareers(planAssignments), [planAssignments]);
  const visibleAssignments = useMemo(
    () =>
      selectedCareers.length === 0
        ? displayAssignments
        : displayAssignments.filter((assignment) => selectedCareers.includes(assignment.careerName)),
    [displayAssignments, selectedCareers],
  );
  const weekMatrix = useMemo(
    () => buildScheduleMatrix(displayAssignments, visibleAssignments, planDays),
    [displayAssignments, planDays, visibleAssignments],
  );
  const dayMatrix = useMemo(
    () =>
      buildScheduleMatrix(
        displayAssignments.filter((assignment) => assignment.day === currentDay),
        visibleAssignments.filter((assignment) => assignment.day === currentDay),
        [currentDay],
      ),
    [currentDay, displayAssignments, visibleAssignments],
  );
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();

    for (const conflict of conflicts) {
      ids.add(conflict.assignmentId);
      for (const conflictingId of conflict.conflictingAssignmentIds) {
        ids.add(conflictingId);
      }
    }

    return ids;
  }, [conflicts]);
  const conflictDescriptions = useMemo(() => {
    const byId = new Map(planAssignments.map((assignment) => [assignment.id, assignment]));

    const describedPairs = new Set<string>();

    return conflicts.flatMap((conflict) => {
      const assignment = byId.get(conflict.assignmentId);
      const pairKey = [conflict.assignmentId, ...conflict.conflictingAssignmentIds].sort().join("|");

      if (!assignment || describedPairs.has(pairKey)) {
        return [];
      }

      describedPairs.add(pairKey);

      const others = conflict.conflictingAssignmentIds
        .map((id) => byId.get(id))
        .filter((other): other is AssignmentView => other !== undefined);

      return [
        others.length > 0
          ? `${describeAssignment(assignment)} se superpone con ${others.map(describeAssignment).join(" y ")}.`
          : `${describeAssignment(assignment)} tiene un conflicto de horario.`,
      ];
    });
  }, [planAssignments, conflicts]);

  return (
    <>
      {conflictDescriptions.length > 0 && (
        <div
          className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-xs sm:flex-row sm:items-start sm:gap-3"
          role="alert"
        >
          <div className="flex min-w-0 flex-1 gap-3">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold">Hay asignaciones superpuestas</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {conflictDescriptions.map((description) => (
                  <li key={description}>{description}</li>
                ))}
              </ul>
            </div>
          </div>
          <Button
            className="self-start max-sm:ml-8"
            onClick={(event) => {
              const firstConflict = planAssignments.find((assignment) => conflictIds.has(assignment.id));
              if (firstConflict) {
                onEdit(firstConflict, event.currentTarget);
              }
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Revisar conflicto
          </Button>
        </div>
      )}

      {planAssignments.length === 0 ? (
        <SystemState
          description="Agregar una asignación para comenzar a organizar las guardias."
          title="Este horario todavía no tiene asignaciones."
          variant="empty"
        />
      ) : (
        <section aria-label="Calendario del plan" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ToggleGroup
              aria-label="Vista del calendario"
              className="gap-1 rounded-full border border-border bg-card p-1"
              onValueChange={(value) => {
                if (value === "matrix" || value === "blocks") {
                  onCalendarViewChange(value);
                }
              }}
              size="sm"
              type="single"
              value={calendarView}
            >
              <ToggleGroupItem className="px-3" value="matrix">
                <LayoutGrid aria-hidden="true" />
                Matriz
              </ToggleGroupItem>
              <ToggleGroupItem className="px-3" value="blocks">
                <CalendarRange aria-hidden="true" />
                Bloques
              </ToggleGroupItem>
            </ToggleGroup>
            {calendarView === "matrix" && <CoverageSummaryText summary={weekMatrix.summary} />}
          </div>
          <CareerLegend
            careers={careers.map((career) => ({ ...career, id: career.name }))}
            onSelectedCareerIdsChange={onSelectedCareersChange}
            selectedCareerIds={selectedCareers}
            size="sm"
            summary={`Mostrando ${visibleAssignments.length} de ${planAssignments.length} asignaciones`}
          />
          <div className="md:hidden">
            <ScheduleDaySelector days={planDays} onSelectDay={onSelectedDayChange} selectedDay={currentDay} />
          </div>
          {calendarView === "matrix" ? (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-xs md:block">
                <ScheduleMatrix
                  conflictIds={conflictIds}
                  days={planDays}
                  label="Matriz semanal"
                  onEdit={onEdit}
                  rows={weekMatrix.rows}
                  selectedAssignmentId={selectedAssignmentId}
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs md:hidden">
                <ScheduleMatrix
                  conflictIds={conflictIds}
                  days={[currentDay]}
                  label="Matriz del día"
                  onEdit={onEdit}
                  rows={dayMatrix.rows}
                  selectedAssignmentId={selectedAssignmentId}
                />
              </div>
            </>
          ) : (
            <>
              <div className="hidden md:block">
                <ScheduleWeekGrid
                  assignments={visibleAssignments}
                  conflictIds={conflictIds}
                  days={planDays}
                  label="Grilla semanal"
                  onEdit={onEdit}
                  range={gridRange}
                  selectedAssignmentId={selectedAssignmentId}
                />
              </div>
              <div className="md:hidden">
                <ScheduleDayList
                  assignments={visibleAssignments}
                  conflictIds={conflictIds}
                  onEdit={onEdit}
                  selectedAssignmentId={selectedAssignmentId}
                  selectedDay={currentDay}
                />
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
