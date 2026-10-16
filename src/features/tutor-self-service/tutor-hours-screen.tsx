"use client";

import { Clock3, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { BalanceStatus } from "@/features/hours/balance-status";
import { formatDuration } from "@/shared/format-duration";
import type {
  TutorSelfServiceMovement,
  TutorSelfServiceHours,
  TutorSelfServiceRequiredActionReason,
} from "./tutor-self-service-service";
import {
  formatLongDate,
  focusTutorPageTitle,
  getMovementDirectionLabel,
  getRequiredActionCopy,
  getTutorSelfServiceErrorMessage,
  requestTutorSelfService,
  TutorSelfServiceRequestError,
} from "./tutor-self-service-screen-utils";
import { DataTable, type DataColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { SystemState } from "@/shared/components/system-state";

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
      <div className="h-9 w-48 animate-pulse rounded-sm bg-muted" />
      <div className="h-36 animate-pulse rounded-md border border-border bg-card" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="h-20 animate-pulse rounded-md border border-border bg-card"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

function HoursError({ message, onRetry }: { message: string; onRetry: () => void }) {
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
      title="No se pudieron cargar las horas"
      variant="error"
    />
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
    <SystemState
      action={
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          Volver a consultar
        </Button>
      }
      description={
        <div className="space-y-2">
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

function MovementRelationship({
  movement,
  visibleIds,
}: {
  movement: TutorSelfServiceMovement;
  visibleIds: ReadonlySet<string>;
}) {
  const targetId =
    movement.reversalState === "REVERSED"
      ? movement.reversalMovementId
      : movement.reversalOfMovementId;

  if (targetId === null || !visibleIds.has(targetId)) {
    return null;
  }

  const label =
    movement.reversalState === "REVERSED"
      ? "Ver reversión vinculada"
      : "Ver movimiento original";

  return (
    <>
      <a
        className="hidden min-h-6 items-center text-xs text-link underline underline-offset-4 md:inline-flex"
        href={`#tutor-movement-${targetId}-table`}
      >
        {label}
      </a>
      <a
        className="inline-flex min-h-11 items-center text-xs text-link underline underline-offset-4 md:hidden"
        href={`#tutor-movement-${targetId}-list`}
      >
        {label}
      </a>
    </>
  );
}

function MovementStatus({
  movement,
  visibleIds,
}: {
  movement: TutorSelfServiceMovement;
  visibleIds: ReadonlySet<string>;
}) {
  if (movement.reversalState === "CONFIRMED") {
    return null;
  }

  return (
    <div className="max-w-56 space-y-2">
      <StatusBadge
        label={
          movement.reversalState === "REVERSED"
            ? "Movimiento revertido"
            : "Reversión registrada"
        }
        variant="neutral"
      />
      <MovementRelationship movement={movement} visibleIds={visibleIds} />
    </div>
  );
}

function HoursContent({ data }: { data: Extract<TutorSelfServiceHours, { state: "ready" }> }) {
  const visibleIds = new Set(data.movements.map((movement) => movement.id));
  const hasReversals = data.movements.some(
    (movement) => movement.reversalState !== "CONFIRMED",
  );
  const columns: DataColumn<TutorSelfServiceMovement>[] = [
    {
      id: "duration",
      header: "Duración",
      numeric: true,
      cell: (movement) => (
        <p className="whitespace-nowrap py-3 font-bold">
          {formatDuration(movement.signedDurationMinutes, { signed: true })}
        </p>
      ),
    },
    {
      id: "note",
      header: "Nota",
      className: "hidden xl:table-cell",
      compactClassName: "col-span-2",
      cell: (movement) => (
        <p className="max-w-56 break-words py-3 text-muted-foreground">
          {movement.note ?? "Sin nota"}
        </p>
      ),
    },
  ];

  if (hasReversals) {
    columns.push({
      id: "state",
      header: "Estado",
      compactClassName: "col-span-2",
      cell: (movement) => (
        <MovementStatus movement={movement} visibleIds={visibleIds} />
      ),
    });
  }

  return (
    <>
      <section className="mt-6 rounded-md border border-border bg-card p-5 shadow-xs sm:p-6" aria-labelledby="tutor-hours-balance">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Ciclo vigente</p>
            <h2 className="mt-2 text-xl font-bold text-foreground" id="tutor-hours-balance">
              {data.cycle.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatLongDate(data.cycle.startDate)} — {formatLongDate(data.cycle.endDate)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-semibold text-muted-foreground">Saldo del ciclo</p>
            <div className="mt-1 flex sm:justify-end">
              <BalanceStatus balance={data.balance} />
            </div>
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
            <p className="mt-1 text-sm text-muted-foreground">
              Movimientos del ciclo vigente, ordenados del más reciente al más antiguo.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          getRowKey={(movement) => movement.id}
          getRowProps={(movement, layout) => ({
            id: `tutor-movement-${movement.id}-${layout}`,
            "data-movement-id": movement.id,
            "data-reversal-state": movement.reversalState,
          })}
          identityColumn={{
            id: "movement",
            header: "Movimiento y fecha",
            cell: (movement) => (
              <div className="min-w-0 space-y-1 py-3">
                <p className="font-bold">{movement.category.name}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  {getMovementDirectionLabel(movement.direction)} · {formatLongDate(movement.movementDate)}
                </p>
                <p className="hidden space-y-1 text-xs font-normal text-muted-foreground md:block xl:hidden">
                  {movement.note ?? "Sin nota"}
                </p>
              </div>
            ),
          }}
          label="Historial de movimientos"
          rows={data.movements}
        />
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
    focusTutorPageTitle();
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
        description="Saldo de horas y movimientos del ciclo."
        titleId="tutor-page-title"
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
