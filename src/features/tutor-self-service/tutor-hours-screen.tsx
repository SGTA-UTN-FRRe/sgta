"use client";

import { ArrowDownLeft, ArrowUpRight, Clock3, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  TutorSelfServiceHours,
  TutorSelfServiceRequiredActionReason,
} from "./tutor-self-service-service";
import {
  formatLongDate,
  formatSignedMinutes,
  getBalanceLabel,
  getMovementDirectionLabel,
  getRequiredActionCopy,
  getTutorSelfServiceErrorMessage,
  requestTutorSelfService,
  TutorSelfServiceRequestError,
} from "./tutor-self-service-screen-utils";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";

export type TutorHoursScreenState =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "required-action";

export interface TutorHoursScreenProps {
  data: TutorSelfServiceHours | null;
  initialErrorMessage?: string;
  state?: TutorHoursScreenState;
}

function deriveState(data: TutorSelfServiceHours | null): TutorHoursScreenState {
  if (data === null) {
    return "error";
  }

  if (data.state === "required-action") {
    return "required-action";
  }

  return data.movements.length === 0 ? "empty" : "default";
}

function HoursLoading() {
  return (
    <div
      aria-label="Cargando horas"
      aria-live="polite"
      className="space-y-6"
      role="status"
    >
      <div className="h-9 w-48 animate-pulse rounded-sm bg-surface-subtle" />
      <div className="h-36 animate-pulse rounded-md border border-border-subtle bg-surface" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="h-20 animate-pulse rounded-md border border-border-subtle bg-surface"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

function HoursError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      aria-live="assertive"
      className="rounded-md border border-danger/30 bg-danger-surface/70 p-6"
      role="alert"
    >
      <h2 className="text-base font-semibold text-foreground">No se pudieron cargar las horas</h2>
      <p className="mt-2 text-sm leading-6 text-foreground-secondary">{message}</p>
      <Button className="mt-5" onClick={onRetry} type="button" variant="outline">
        <RefreshCw aria-hidden="true" />
        Reintentar
      </Button>
    </div>
  );
}

function HoursRequiredAction({
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

function HoursEmpty({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      description="El balance aparecerá cuando se registre el primer movimiento del ciclo vigente."
      title="Todavía no hay movimientos registrados en este ciclo."
      action={
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          Actualizar
        </Button>
      }
    />
  );
}

function HoursContent({ data }: { data: Extract<TutorSelfServiceHours, { state: "ready" }> }) {
  return (
    <>
      <section className="mt-6 rounded-md border border-border bg-surface p-5 shadow-xs sm:p-6" aria-labelledby="tutor-hours-balance">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground-secondary">Ciclo vigente</p>
            <h2 className="mt-2 text-xl font-bold text-foreground" id="tutor-hours-balance">
              {data.cycle.name}
            </h2>
            <p className="mt-1 text-sm text-foreground-secondary">
              {formatLongDate(data.cycle.startDate)} — {formatLongDate(data.cycle.endDate)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-semibold text-foreground-secondary">Saldo firmado</p>
            <p className="mt-1 font-numeric text-4xl font-extrabold tabular-nums text-foreground">
              {formatSignedMinutes(data.balance.signedBalanceMinutes)}
            </p>
            <StatusBadge
              className="mt-3"
              label={getBalanceLabel(data.balance.state)}
              variant={data.balance.state === "current" ? "success" : "warning"}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="tutor-hours-history" className="mt-6">
        <div className="flex items-center gap-3">
          <Clock3 aria-hidden="true" className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold text-foreground" id="tutor-hours-history">
              Historial de movimientos
            </h2>
            <p className="mt-1 text-sm text-foreground-secondary">
              Movimientos del ciclo vigente, ordenados del más reciente al más antiguo.
            </p>
          </div>
        </div>

        <ol
          aria-label="Historial de movimientos"
          className="mt-4 space-y-3"
          data-layout="movement-history"
        >
          {data.movements.map((movement) => {
            const isCredit = movement.direction === "CREDIT";

            return (
              <li
                className="rounded-md border border-border bg-surface p-4 shadow-xs sm:p-5"
                key={movement.id}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isCredit
                        ? "bg-success-surface text-success"
                        : "bg-warning-surface text-warning"
                    }`}
                  >
                    {isCredit ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div>
                        <p className="font-semibold text-foreground">{movement.category.name}</p>
                        <p className="mt-1 text-sm text-foreground-secondary">
                          {getMovementDirectionLabel(movement.direction)} · {formatLongDate(movement.movementDate)}
                        </p>
                      </div>
                      <p className="font-numeric text-lg font-bold tabular-nums text-foreground">
                        {formatSignedMinutes(movement.signedDurationMinutes)}
                      </p>
                    </div>
                    {movement.note && (
                      <p className="mt-3 text-sm leading-6 text-foreground-secondary">{movement.note}</p>
                    )}
                    {movement.reversalState !== "CONFIRMED" && (
                      <StatusBadge
                        className="mt-3"
                        label={
                          movement.reversalState === "REVERSED"
                            ? "Movimiento revertido"
                            : "Reversión registrada"
                        }
                        variant="neutral"
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}

export function TutorHoursScreen({
  data: initialData,
  initialErrorMessage,
  state: initialState,
}: TutorHoursScreenProps) {
  const [data, setData] = useState(initialData);
  const [state, setState] = useState<TutorHoursScreenState>(
    initialState ?? deriveState(initialData),
  );
  const [errorMessage, setErrorMessage] = useState(
    initialErrorMessage ?? "No se pudieron cargar las horas. Intentar nuevamente.",
  );

  const retry = async () => {
    setState("loading");

    try {
      const nextData = await requestTutorSelfService<TutorSelfServiceHours>(
        "/api/tutor/hours",
      );
      setData(nextData);
      setState(deriveState(nextData));
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof TutorSelfServiceRequestError
          ? getTutorSelfServiceErrorMessage(error.code)
          : "No se pudieron cargar las horas. Intentar nuevamente.",
      );
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        description="Consultar el balance firmado y su historial personal."
        title="Mis horas"
      />
      {state === "loading" && <HoursLoading />}
      {state === "error" && <HoursError message={errorMessage} onRetry={retry} />}
      {state === "required-action" && data?.state === "required-action" && (
        <HoursRequiredAction onRetry={retry} reason={data.reason} />
      )}
      {state === "empty" && <HoursEmpty onRetry={retry} />}
      {state === "default" && data?.state === "ready" && <HoursContent data={data} />}
    </div>
  );
}
