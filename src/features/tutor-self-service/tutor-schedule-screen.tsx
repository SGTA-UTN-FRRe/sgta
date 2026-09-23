"use client";

import { CalendarDays, Clock3, RefreshCw } from "lucide-react";
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
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";

export type TutorScheduleScreenState =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "required-action";

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
      <div className="h-9 w-56 animate-pulse rounded-sm bg-surface-subtle" />
      <div className="h-20 animate-pulse rounded-md border border-border-subtle bg-surface" />
      <div className="grid gap-3 md:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            className="h-44 animate-pulse rounded-md border border-border-subtle bg-surface"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

function ScheduleError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      aria-live="assertive"
      className="rounded-md border border-danger/30 bg-danger-surface/70 p-6"
      role="alert"
    >
      <h2 className="text-base font-semibold text-foreground">No se pudo cargar el horario</h2>
      <p className="mt-2 text-sm leading-6 text-foreground-secondary">{message}</p>
      <Button className="mt-5" onClick={onRetry} type="button" variant="outline">
        <RefreshCw aria-hidden="true" />
        Reintentar
      </Button>
    </div>
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
    <div
      aria-live="polite"
      className="rounded-md border border-warning/30 bg-warning-surface/70 p-6"
      role="status"
    >
      <StatusBadge label="Acción requerida" variant="warning" />
      <h2 className="mt-4 text-lg font-semibold text-foreground">{copy.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-secondary">
        {copy.description}
      </p>
      <Button className="mt-5" onClick={onRetry} type="button" variant="outline">
        <RefreshCw aria-hidden="true" />
        Volver a consultar
      </Button>
    </div>
  );
}

function ScheduleEmpty({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
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

function ScheduleAssignment({
  assignment,
}: {
  assignment: Extract<
    TutorSelfServiceSchedule,
    { state: "ready" }
  >["days"][number]["assignments"][number];
}) {
  return (
    <li className="rounded-sm border border-border-subtle bg-surface px-3 py-3 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
          {getAssignmentKindLabel(assignment.kind)}
        </span>
        <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-foreground-muted" />
      </div>
      <p className="mt-2 text-sm font-bold tabular-nums text-foreground">
        <time dateTime={`${assignment.date}T${formatTime(assignment.startMinutes)}`}>
          {formatTimeRange(assignment.startMinutes, assignment.endMinutes)}
        </time>
      </p>
      {assignment.modality && (
        <p className="mt-1 text-xs leading-5 text-foreground-secondary">{assignment.modality}</p>
      )}
    </li>
  );
}

function ScheduleContent({
  data,
  initialDate,
  onQuery,
}: {
  data: Extract<TutorSelfServiceSchedule, { state: "ready" }>;
  initialDate?: string;
  onQuery: (date: string) => Promise<void>;
}) {
  const defaultDate = initialDate ?? data.window.anchorDate;
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const assignments = useMemo(
    () => data.days.flatMap((day) => day.assignments),
    [data.days],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onQuery(selectedDate);
  };

  return (
    <>
      <div className="mt-6 rounded-md border border-border bg-surface p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{data.cycle.name}</p>
            <p className="mt-1 text-sm text-foreground-secondary">
              {formatLongDate(data.cycle.startDate)} — {formatLongDate(data.cycle.endDate)}
            </p>
          </div>
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={submit}>
            <label className="text-sm font-medium text-foreground" htmlFor="tutor-schedule-date">
              Fecha de referencia
              <Input
                className="mt-1.5 sm:w-48"
                id="tutor-schedule-date"
                max={data.cycle.endDate}
                min={data.cycle.startDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                type="date"
                value={selectedDate}
              />
            </label>
            <Button type="submit">
              <CalendarDays aria-hidden="true" />
              Consultar
            </Button>
          </form>
        </div>
      </div>

      <section
        aria-label="Contexto del plan efectivo"
        className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-accent/30 bg-accent-surface/60 px-4 py-3"
      >
        <StatusBadge
          label={
            data.effectivePlan === null
              ? "Sin plan efectivo"
              : `Plan ${getPlanKindLabel(data.effectivePlan.kind)}`
          }
          variant={data.effectivePlan?.kind === "SPECIAL" ? "faro" : "info"}
        />
        <span className="text-sm text-foreground-secondary">
          {data.effectivePlan?.name ?? "No hay un plan activo para la fecha de referencia."}
        </span>
      </section>

      <section aria-labelledby="tutor-schedule-days" className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground" id="tutor-schedule-days">
              Guardias del período
            </h2>
            <p className="mt-1 text-sm text-foreground-secondary">
              Vista cronológica en móvil y semanal en pantallas amplias.
            </p>
          </div>
          <span className="hidden text-sm font-semibold text-foreground-secondary sm:inline">
            {assignments.length} {assignments.length === 1 ? "guardia" : "guardias"}
          </span>
        </div>

        <ol
          aria-label="Vista semanal de guardias"
          className="mt-4 grid gap-3 md:grid-cols-7"
          data-layout="schedule-day-list-week"
        >
          {data.days.map((day) => (
            <li
              className="min-w-0 rounded-md border border-border bg-canvas p-3"
              data-date={day.date}
              key={day.date}
            >
              <div className="border-b border-border-subtle pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground-muted">
                  {formatLongDate(day.date).split(" ")[0]}
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {formatLongDate(day.date)}
                </p>
              </div>
              {day.assignments.length === 0 ? (
                <p className="py-4 text-xs leading-5 text-foreground-muted">Sin guardias</p>
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
      </section>

      <section aria-labelledby="tutor-schedule-upcoming" className="mt-6">
        <h2 className="text-lg font-bold text-foreground" id="tutor-schedule-upcoming">
          Próximas guardias
        </h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.length === 0 ? (
            <li className="text-sm text-foreground-secondary">No hay guardias próximas en esta consulta.</li>
          ) : (
            assignments.map((assignment) => (
              <li
                className="rounded-md border border-border bg-surface p-4 shadow-xs"
                key={`upcoming-${assignment.id}`}
              >
                <p className="text-sm font-semibold text-foreground">{formatLongDate(assignment.date)}</p>
                <p className="mt-1 text-sm tabular-nums text-foreground-secondary">
                  {getAssignmentKindLabel(assignment.kind)} · {formatTimeRange(assignment.startMinutes, assignment.endMinutes)}
                </p>
              </li>
            ))
          )}
        </ol>
      </section>
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
        description="Consultar las guardias efectivas del ciclo vigente."
        titleId="tutor-page-title"
        title="Mi horario"
      />
      {state === "loading" && <ScheduleLoading />}
      {state === "error" && <ScheduleError message={errorMessage} onRetry={() => query()} />}
      {state === "required-action" && data?.state === "required-action" && (
        <ScheduleRequiredAction onRetry={() => query()} reason={data.reason} />
      )}
      {state === "empty" && <ScheduleEmpty onRetry={() => query()} />}
      {state === "default" && data?.state === "ready" && (
        <ScheduleContent data={data} initialDate={initialDate} onQuery={query} />
      )}
    </div>
  );
}
