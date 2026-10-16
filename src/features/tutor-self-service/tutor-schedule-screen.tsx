"use client";

import { CalendarDays, Clock3, Monitor, RefreshCw } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  TutorSelfServiceRequiredActionReason,
  TutorSelfServiceSchedule,
} from "./tutor-self-service-service";
import {
  formatLongDate,
  formatTime,
  formatTimeRange,
  focusTutorPageTitle,
  getAssignmentKindLabel,
  getPlanKindLabel,
  getRequiredActionCopy,
  getTutorSelfServiceErrorMessage,
  requestTutorSelfService,
  TutorSelfServiceRequestError,
} from "./tutor-self-service-screen-utils";
import { AssignmentCues } from "@/features/schedules/schedule-block";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { SystemState } from "@/shared/components/system-state";
import {
  normalizeScheduleModality,
  SCHEDULE_MODALITY_LABELS,
} from "@/shared/schedule-modality";

export type TutorScheduleScreenState =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "required-action";

type TutorScheduleData = Exclude<TutorSelfServiceSchedule, { state: "required-action" }>;
type TutorScheduleAssignment = TutorScheduleData["days"][number]["assignments"][number];

const weekdayFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  weekday: "long",
});

const dayMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function formatWeekday(date: string) {
  return weekdayFormatter.format(new Date(`${date}T00:00:00Z`));
}

function formatDayMonth(date: string) {
  return dayMonthFormatter.format(new Date(`${date}T00:00:00Z`));
}

/** Assignments from the next pending duty onward; earlier ones in the window already ended. */
function getUpcomingAssignments(
  assignments: TutorScheduleAssignment[],
  nextDuty: TutorScheduleData["nextDuty"],
) {
  if (nextDuty === null) {
    return [];
  }

  const nextIndex = assignments.findIndex(
    (assignment) => assignment.id === nextDuty.id && assignment.date === nextDuty.date,
  );

  return nextIndex === -1 ? [] : assignments.slice(nextIndex);
}

export interface TutorScheduleScreenProps {
  data: TutorSelfServiceSchedule | null;
  initialDate?: string;
  initialErrorMessage?: string;
  state?: TutorScheduleScreenState;
}

function getAssignmentCount(data: TutorSelfServiceSchedule | null) {
  if (data === null || data.state !== "ready") {
    return 0;
  }

  return data.days.reduce((total, day) => total + day.assignments.length, 0);
}

function deriveState(data: TutorSelfServiceSchedule | null): TutorScheduleScreenState {
  if (data === null) {
    return "error";
  }

  if (data.state === "required-action") {
    return "required-action";
  }

  return getAssignmentCount(data) === 0 ? "empty" : "default";
}

function ScheduleLoading() {
  return (
    <div
      aria-label="Cargando horario"
      aria-live="polite"
      className="space-y-6"
      role="status"
    >
      <div className="h-9 w-56 animate-pulse rounded-sm bg-muted" />
      <div className="h-20 animate-pulse rounded-md border border-border bg-card" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            className="h-44 animate-pulse rounded-md border border-border bg-card"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

function ScheduleError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <SystemState
      action={
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          Reintentar
        </Button>
      }
      description={message}
      headingLevel={2}
      title="No se pudo cargar el horario"
      variant="error"
    />
  );
}

function ScheduleRequiredAction({
  reason,
  onRetry,
}: {
  reason: TutorSelfServiceRequiredActionReason;
  onRetry: () => void;
}) {
  const copy = getRequiredActionCopy(reason);

  return (
    <SystemState
      action={
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          Volver a consultar
        </Button>
      }
      description={copy.description}
      headingLevel={2}
      title={copy.title}
      variant="required-action"
    />
  );
}

function ScheduleEmpty({ className, onRetry }: { className?: string; onRetry: () => void }) {
  return (
    <EmptyState
      className={className}
      description="Seleccionar otra fecha o consultar nuevamente cuando el ciclo tenga asignaciones."
      title="No hay guardias asignadas en el período actual."
      action={
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          Actualizar
        </Button>
      }
    />
  );
}

function ScheduleAssignment({ assignment }: { assignment: TutorScheduleAssignment }) {
  return (
    <li className="flex h-full flex-col rounded-md border border-border bg-card px-3 py-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-eyebrow text-primary">
          Guardia
        </span>
        <AssignmentCues assignment={assignment} conflict={false} />
        <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <p className="mt-2 text-sm font-bold tabular-nums text-foreground">
        <time dateTime={`${assignment.date}T${formatTime(assignment.startMinutes)}`}>
          {formatTimeRange(assignment.startMinutes, assignment.endMinutes)}
        </time>
      </p>
      <ScheduleModality value={assignment.modality} />
    </li>
  );
}

function getModalityPresentation(value: string | null) {
  if (!value?.trim()) {
    return null;
  }

  const kind = normalizeScheduleModality(value);
  const label = SCHEDULE_MODALITY_LABELS[kind];
  const details = value
    .trim()
    .replace(new RegExp("^" + label + "(?:\\s*[\\u00b7\\u2014-]\\s*|\\s+)?", "i"), "")
    .trim();

  return {
    kind,
    label: details ? label + " \u00b7 " + details : label,
  };
}

function ScheduleModality({ value }: { value: string | null }) {
  const modality = getModalityPresentation(value);

  if (modality === null) {
    return null;
  }

  return (
    <p className="mt-2 inline-flex min-w-0 flex-wrap items-center gap-1.5 text-xs leading-5 text-muted-foreground">
      {modality.kind === "VIRTUAL" && (
        <Monitor aria-hidden="true" className="size-3.5 shrink-0" />
      )}
      <span>{modality.label}</span>
    </p>
  );
}

function ScheduleContent({
  data,
  initialDate,
  onQuery,
  onRetry,
}: {
  data: TutorScheduleData;
  initialDate?: string;
  onQuery: (date: string) => Promise<void>;
  onRetry: () => void;
}) {
  const defaultDate = initialDate ?? data.window.anchorDate ?? "";
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const assignments = useMemo(
    () => data.days.flatMap((day) => day.assignments),
    [data.days],
  );
  const upcomingAssignments = getUpcomingAssignments(assignments, data.nextDuty);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onQuery(selectedDate);
  };

  return (
    <>
      <div className="mt-6 rounded-md border border-border bg-card p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{data.cycle.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatLongDate(data.cycle.startDate)} — {formatLongDate(data.cycle.endDate)}
            </p>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submit}>
            <FormField id="tutor-schedule-date" label="Fecha de referencia">
              <Input
                className="sm:w-48"
                max={data.cycle.endDate}
                min={data.cycle.startDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                required
                type="date"
                value={selectedDate}
              />
            </FormField>
            <Button type="submit">
              <CalendarDays aria-hidden="true" />
              Consultar
            </Button>
          </form>
        </div>
      </div>

      <section
        aria-label="Contexto del horario"
        className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/60 px-4 py-3"
      >
        <StatusBadge
          label={
            data.effectivePlan === null
              ? "Sin horario asignado"
              : `Plan ${getPlanKindLabel(data.effectivePlan.kind)}`
          }
          variant={data.effectivePlan?.kind === "SPECIAL" ? "neutral" : "info"}
        />
        <span className="text-sm text-muted-foreground">
          {data.effectivePlan?.name ?? "No hay guardias asignadas para la fecha de referencia."}
        </span>
      </section>

      <section aria-labelledby="tutor-schedule-days" className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <h2 className="text-lg font-bold text-foreground" id="tutor-schedule-days">
              Guardias del período
            </h2>
            {data.window.startDate !== null && data.window.endDate !== null && (
              <p className="mt-1 text-sm text-muted-foreground">
                Del <time dateTime={data.window.startDate}>{formatDayMonth(data.window.startDate)}</time>{" "}
                al <time dateTime={data.window.endDate}>{formatDayMonth(data.window.endDate)}</time>
              </p>
            )}
          </div>
          {assignments.length > 0 && (
            <span className="text-sm font-semibold text-muted-foreground">
              {assignments.length} {assignments.length === 1 ? "guardia" : "guardias"}
            </span>
          )}
        </div>

        {assignments.length === 0 ? (
          <ScheduleEmpty className="mt-4" onRetry={onRetry} />
        ) : (
          <ol
            aria-label="Vista semanal de guardias"
            className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
            data-layout="schedule-day-list-week"
          >
            {data.days.map((day) => (
              <li
                className="min-w-0 rounded-md border border-border bg-background p-3"
                data-date={day.date}
                key={day.date}
              >
                <div className={day.assignments.length > 0 ? "border-b border-border pb-3" : undefined}>
                  <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                    {formatWeekday(day.date)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    <time dateTime={day.date}>{formatDayMonth(day.date)}</time>
                  </p>
                </div>
                {day.assignments.length === 0 ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Sin guardias</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {day.assignments.map((assignment) => (
                      <ScheduleAssignment assignment={assignment} key={assignment.id} />
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {assignments.length > 0 && (
        <section aria-labelledby="tutor-schedule-upcoming" className="mt-6">
          <h2 className="text-lg font-bold text-foreground" id="tutor-schedule-upcoming">
            Próximas guardias
          </h2>
          {upcomingAssignments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No hay guardias próximas en esta consulta.
            </p>
          ) : (
            <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingAssignments.map((assignment) => {
                const modality = getModalityPresentation(assignment.modality);

                return (
                  <li
                    className="rounded-md border border-border bg-card p-4 shadow-xs"
                    key={`upcoming-${assignment.date}-${assignment.id}`}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      <time dateTime={assignment.date}>{formatLongDate(assignment.date)}</time>
                    </p>
                    <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                      {getAssignmentKindLabel(assignment.kind)} ·{" "}
                      {formatTimeRange(assignment.startMinutes, assignment.endMinutes)}
                      {modality && (
                        <>
                          {" · "}
                          {modality.kind === "VIRTUAL" && (
                            <Monitor aria-hidden="true" className="mr-1 inline size-3.5" />
                          )}
                          {modality.label}
                        </>
                      )}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}
    </>
  );
}

export function TutorScheduleScreen({
  data: initialData,
  initialDate,
  initialErrorMessage,
  state: initialState,
}: TutorScheduleScreenProps) {
  const [data, setData] = useState(initialData);
  const [state, setState] = useState<TutorScheduleScreenState>(
    initialState ?? deriveState(initialData),
  );
  const [errorMessage, setErrorMessage] = useState(
    initialErrorMessage ?? "No se pudo cargar el horario. Intentar nuevamente.",
  );

  const query = async (date?: string) => {
    focusTutorPageTitle();
    setState("loading");

    try {
      const search = date ? `?date=${encodeURIComponent(date)}` : "";
      const nextData = await requestTutorSelfService<TutorSelfServiceSchedule>(
        `/api/tutor/schedule${search}`,
      );
      setData(nextData);
      setState(deriveState(nextData));
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof TutorSelfServiceRequestError
          ? getTutorSelfServiceErrorMessage(error.code)
          : "No se pudo cargar el horario. Intentar nuevamente.",
      );
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        description="Consultar las guardias asignadas del ciclo vigente."
        titleId="tutor-page-title"
        title="Mi horario"
      />
      {state === "loading" && <ScheduleLoading />}
      {state === "error" && <ScheduleError message={errorMessage} onRetry={() => query()} />}
      {state === "required-action" && data?.state === "required-action" && (
        <ScheduleRequiredAction onRetry={() => query()} reason={data.reason} />
      )}
      {(state === "default" || state === "empty") &&
        data !== null &&
        data.state !== "required-action" && (
          <ScheduleContent
            data={data}
            initialDate={initialDate}
            onQuery={query}
            onRetry={() => query()}
          />
        )}
      {state === "empty" && (data === null || data.state === "required-action") && (
        <ScheduleEmpty onRetry={() => query()} />
      )}
    </div>
  );
}
