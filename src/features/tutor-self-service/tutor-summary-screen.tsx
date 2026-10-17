"use client";

import {
  BookOpen,
  CalendarDays,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BalanceStatus } from "@/features/hours/balance-status";
import type {
  TutorSelfServiceRequiredActionReason,
  TutorSelfServiceSummary,
} from "./tutor-self-service-service";
import {
  formatLongDate,
  formatTime,
  formatTimeRange,
  getRequiredActionCopy,
  getTutorSelfServiceErrorMessage,
  focusTutorPageTitle,
  requestTutorSelfService,
  TutorSelfServiceRequestError,
} from "./tutor-self-service-screen-utils";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { RouteLoadingState } from "@/shared/components/route-loading-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { SystemState } from "@/shared/components/system-state";

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

function SummaryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isGenericMessage =
    message === "No se pudo cargar el resumen. Intentar nuevamente." ||
    message === "No se pudo cargar el resumen.";

  return (
    <SystemState
      action={
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          Reintentar
        </Button>
      }
      description={isGenericMessage ? undefined : message}
      headingLevel={2}
      title={isGenericMessage ? message : "No se pudo cargar el resumen."}
      variant="error"
    />
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
    <SystemState
      action={
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          Volver a consultar
        </Button>
      }
      description={
        <div className="space-y-3">
          <StatusBadge label="Acción requerida" variant="warning" />
          <p>{copy.description}</p>
        </div>
      }
      headingLevel={2}
      title={copy.title}
      variant="required-action"
    />
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
  const subjectCount = data.tutor.subjects.length;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <Card>
          <section aria-labelledby="tutor-summary-hours">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Clock3 aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <h2 className="font-display text-xl font-semibold" id="tutor-summary-hours">
                  Horas
                </h2>
              </div>
              <div className="mt-3">
                <BalanceStatus balance={data.balance} />
              </div>
            </CardContent>
          </section>
        </Card>

        <Card>
          <section aria-labelledby="tutor-summary-next-duty">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-start gap-3">
                <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold" id="tutor-summary-next-duty">
                    Próxima guardia
                  </h2>
                  {nextDuty === null ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No hay guardias próximas
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 font-semibold leading-6 text-foreground">
                        <time dateTime={nextDuty.date}>{formatLongDate(nextDuty.date)}</time>
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        <time
                          className="tabular-nums"
                          dateTime={`${nextDuty.date}T${formatTime(nextDuty.startMinutes)}`}
                        >
                          {formatTimeRange(nextDuty.startMinutes, nextDuty.endMinutes)}
                        </time>
                        {nextDuty.modality ? ` · ${nextDuty.modality}` : ""}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </section>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <Card className="min-w-0">
          <section aria-labelledby="tutor-summary-subjects">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen aria-hidden="true" className="size-5 shrink-0 text-primary" />
                  <h2 className="font-display text-xl font-semibold" id="tutor-summary-subjects">
                    Materias
                  </h2>
                </div>
                {subjectCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {subjectCount === 1
                      ? "1 materia asignada"
                      : `${subjectCount} materias asignadas`}
                  </p>
                )}
              </div>
              {subjectCount === 0 ? (
                <EmptyState
                  className="py-2"
                  title="Todavía no hay materias asignadas."
                />
              ) : (
                <ul
                  className="mt-3 divide-y divide-border border-t border-border"
                  data-testid="tutor-subject-list"
                >
                  {data.tutor.subjects.map((subject) => (
                    <li
                      className="flex min-h-row flex-col justify-center py-3 text-sm font-semibold text-foreground"
                      key={subject.id}
                    >
                      <span>{subject.name}</span>
                      {subject.status === "INACTIVE" && (
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">
                          Materia inactiva
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </section>
        </Card>

        <Card>
          <section aria-labelledby="tutor-summary-cycle">
            <CardContent className="p-3 md:p-4">
              <h2 className="font-display text-xl font-semibold" id="tutor-summary-cycle">
                Ciclo vigente
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Contexto de la pertenencia actual.
              </p>
              <dl className="mt-4 divide-y divide-border">
                <div className="py-3 first:pt-0">
                  <dt className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                    Ciclo
                  </dt>
                  <dd className="mt-1">
                    <p className="text-sm font-semibold text-foreground">{data.cycle.name}</p>
                    <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                      {formatLongDate(data.cycle.startDate)} — {formatLongDate(data.cycle.endDate)}
                    </p>
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                    Carrera
                  </dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-foreground">
                    {data.tutor.career.name}
                  </dd>
                </div>
                <div className="py-3 last:pb-0">
                  <dt className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                    Referencia de beca
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {data.membership.scholarshipReference?.type ?? "Sin referencia registrada"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </section>
        </Card>
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
    focusTutorPageTitle();
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
    <div className="space-y-4 pb-10 md:space-y-6">
      <PageHeader
        description={
          data?.state === "ready"
            ? `Estado actual de ${data.tutor.displayName} y sus próximas guardias.`
            : "Saldo, materias y próximas guardias del ciclo vigente."
        }
        titleId="tutor-page-title"
        title="Mi resumen"
      />
      {state === "loading" && <RouteLoadingState />}
      {state === "error" && <SummaryError message={errorMessage} onRetry={retry} />}
      {state === "required-action" && data?.state === "required-action" && (
        <SummaryRequiredAction onRetry={retry} reason={data.reason} />
      )}
      {state === "empty" && <SummaryEmpty onRetry={retry} />}
      {state === "default" && data?.state === "ready" && <SummaryContent data={data} />}
    </div>
  );
}
