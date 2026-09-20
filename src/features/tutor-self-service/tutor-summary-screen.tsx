"use client";

import {
  BookOpen,
  CalendarDays,
  Clock3,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  TutorSelfServiceRequiredActionReason,
  TutorSelfServiceSummary,
} from "./tutor-self-service-service";
import {
  formatLongDate,
  formatSignedMinutes,
  formatTime,
  formatTimeRange,
  getBalanceLabel,
  getRequiredActionCopy,
  getTutorSelfServiceErrorMessage,
  requestTutorSelfService,
  TutorSelfServiceRequestError,
} from "./tutor-self-service-screen-utils";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";

export type TutorSummaryScreenState =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "required-action";

export interface TutorSummaryScreenProps {
  data: TutorSelfServiceSummary | null;
  initialErrorMessage?: string;
  state?: TutorSummaryScreenState;
}

function deriveState(data: TutorSelfServiceSummary | null): TutorSummaryScreenState {
  if (data === null) {
    return "error";
  }

  if (data.state === "required-action") {
    return "required-action";
  }

  return data.tutor.subjects.length === 0 && data.nextDuty === null
    ? "empty"
    : "default";
}

function SummaryLoading() {
  return (
    <div
      aria-label="Cargando resumen"
      aria-live="polite"
      className="space-y-6"
      role="status"
    >
      <div className="h-9 w-56 animate-pulse rounded-sm bg-surface-subtle" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-40 animate-pulse rounded-md border border-border-subtle bg-surface"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      aria-live="assertive"
      className="rounded-md border border-danger/30 bg-danger-surface/70 p-6"
      role="alert"
    >
      <h2 className="text-base font-semibold text-foreground">
        No se pudo cargar el resumen
      </h2>
      <p className="mt-2 text-sm leading-6 text-foreground-secondary">{message}</p>
      <Button className="mt-5" onClick={onRetry} type="button" variant="outline">
        <RefreshCw aria-hidden="true" />
        Reintentar
      </Button>
    </div>
  );
}

function SummaryRequiredAction({
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

function SummaryEmpty({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      description="Todavía no hay materias ni guardias asignadas para mostrar en el ciclo vigente."
      title="Todavía no hay información de resumen"
      action={
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          Actualizar
        </Button>
      }
    />
  );
}

function SummaryContent({ data }: { data: Extract<TutorSelfServiceSummary, { state: "ready" }> }) {
  const nextDuty = data.nextDuty;

  return (
    <>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section
          aria-labelledby="tutor-summary-hours"
          className="rounded-md border border-border bg-surface p-5 shadow-xs"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground-secondary">Horas</p>
              <h2
                className="mt-3 font-numeric text-3xl font-extrabold tabular-nums text-foreground"
                id="tutor-summary-hours"
              >
                {formatSignedMinutes(data.balance.signedBalanceMinutes)}
              </h2>
            </div>
            <Clock3 aria-hidden="true" className="h-5 w-5 text-primary" />
          </div>
          <StatusBadge
            className="mt-5"
            label={getBalanceLabel(data.balance.state)}
            variant={data.balance.state === "current" ? "success" : "warning"}
          />
        </section>

        <section
          aria-labelledby="tutor-summary-next-duty"
          className="rounded-md border border-border bg-surface p-5 shadow-xs md:col-span-1 xl:col-span-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground-secondary">
                Próxima guardia
              </p>
              <h2 className="mt-3 text-lg font-bold text-foreground" id="tutor-summary-next-duty">
                {nextDuty === null ? "No hay guardias próximas" : formatLongDate(nextDuty.date)}
              </h2>
            </div>
            <CalendarDays aria-hidden="true" className="h-5 w-5 text-primary" />
          </div>
          {nextDuty && (
            <p className="mt-4 text-sm leading-6 text-foreground-secondary">
              <time dateTime={`${nextDuty.date}T${formatTime(nextDuty.startMinutes)}`}>
                {formatTimeRange(nextDuty.startMinutes, nextDuty.endMinutes)}
              </time>
              {nextDuty.modality ? ` · ${nextDuty.modality}` : ""}
            </p>
          )}
        </section>

        <section
          aria-labelledby="tutor-summary-career"
          className="rounded-md border border-border bg-surface p-5 shadow-xs"
        >
          <p className="text-sm font-semibold text-foreground-secondary">Carrera</p>
          <h2 className="mt-3 text-lg font-bold text-foreground" id="tutor-summary-career">
            {data.tutor.career.name}
          </h2>
          <p className="mt-2 text-sm text-foreground-secondary">
            {data.tutor.subjects.length === 1
              ? "1 materia asignada"
              : `${data.tutor.subjects.length} materias asignadas`}
          </p>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section
          aria-labelledby="tutor-summary-subjects"
          className="rounded-md border border-border bg-surface p-5 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <BookOpen aria-hidden="true" className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-foreground" id="tutor-summary-subjects">
                Materias
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                Materias asignadas en el catálogo académico.
              </p>
            </div>
          </div>
          {data.tutor.subjects.length === 0 ? (
            <p className="mt-6 rounded-sm bg-surface-subtle px-4 py-3 text-sm text-foreground-secondary">
              Todavía no hay materias asignadas.
            </p>
          ) : (
            <ul className="mt-5 grid gap-2 sm:grid-cols-2" data-testid="tutor-subject-list">
              {data.tutor.subjects.map((subject) => (
                <li
                  className="rounded-sm border border-border-subtle bg-canvas px-4 py-3 text-sm font-semibold text-foreground"
                  key={subject.id}
                >
                  <span>{subject.name}</span>
                  {subject.status === "INACTIVE" && (
                    <span className="mt-1 block text-xs font-medium text-foreground-muted">
                      Materia inactiva
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="tutor-summary-cycle"
          className="rounded-md border border-border bg-surface p-5 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <Sparkles aria-hidden="true" className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <h2 className="text-lg font-bold text-foreground" id="tutor-summary-cycle">
                Ciclo vigente
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                Contexto de la pertenencia actual.
              </p>
            </div>
          </div>
          <p className="mt-5 font-semibold text-foreground">{data.cycle.name}</p>
          <p className="mt-1 text-sm text-foreground-secondary">
            {formatLongDate(data.cycle.startDate)} — {formatLongDate(data.cycle.endDate)}
          </p>
          <div className="mt-5 border-t border-border-subtle pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
              Referencia de beca
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {data.membership.scholarshipReference?.type ?? "Sin referencia registrada"}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

export function TutorSummaryScreen({
  data: initialData,
  initialErrorMessage,
  state: initialState,
}: TutorSummaryScreenProps) {
  const [data, setData] = useState(initialData);
  const [state, setState] = useState<TutorSummaryScreenState>(
    initialState ?? deriveState(initialData),
  );
  const [errorMessage, setErrorMessage] = useState(
    initialErrorMessage ?? "No se pudo cargar el resumen. Intentar nuevamente.",
  );

  const retry = async () => {
    setState("loading");

    try {
      const nextData = await requestTutorSelfService<TutorSelfServiceSummary>(
        "/api/tutor/summary",
      );
      setData(nextData);
      setState(deriveState(nextData));
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof TutorSelfServiceRequestError
          ? getTutorSelfServiceErrorMessage(error.code)
          : "No se pudo cargar el resumen. Intentar nuevamente.",
      );
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        description={
          data?.state === "ready"
            ? `Estado actual de ${data.tutor.displayName} y sus próximas guardias.`
            : "Balance, materias y próximas guardias del ciclo vigente."
        }
        title="Mi resumen"
      />
      {state === "loading" && <SummaryLoading />}
      {state === "error" && <SummaryError message={errorMessage} onRetry={retry} />}
      {state === "required-action" && data?.state === "required-action" && (
        <SummaryRequiredAction onRetry={retry} reason={data.reason} />
      )}
      {state === "empty" && <SummaryEmpty onRetry={retry} />}
      {state === "default" && data?.state === "ready" && <SummaryContent data={data} />}
    </div>
  );
}
