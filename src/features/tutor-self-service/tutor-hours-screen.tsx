"use client";

import { Clock3, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      <span className="sr-only">Cargando horas</span>
      <Skeleton aria-hidden="true" className="h-28 w-full rounded-xl" />
      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-6 w-56 max-w-full" />
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton className="h-row w-full" key={index} />
        ))}
      </div>
    </div>
  );
}

const genericErrorMessage = "No se pudieron cargar las horas. Intentar nuevamente.";

function HoursError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <SystemState
      action={
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          Reintentar
        </Button>
      }
      description={message === genericErrorMessage ? undefined : message}
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
      <Card>
        <section aria-labelledby="tutor-hours-balance">
          <CardContent className="grid gap-4 p-3 md:grid-cols-2 md:p-4">
            <div>
              <h2 className="font-display text-xl font-semibold" id="tutor-hours-balance">
                Saldo del ciclo
              </h2>
              <div className="mt-3">
                <BalanceStatus balance={data.balance} />
              </div>
            </div>
            <div className="min-w-0 border-t border-border pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-4">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                Ciclo vigente
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{data.cycle.name}</p>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                <time dateTime={data.cycle.startDate}>{formatLongDate(data.cycle.startDate)}</time>
                {" — "}
                <time dateTime={data.cycle.endDate}>{formatLongDate(data.cycle.endDate)}</time>
              </p>
            </div>
          </CardContent>
        </section>
      </Card>

      <section aria-labelledby="tutor-hours-history" className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <Clock3 aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <h2 className="font-display text-xl font-semibold" id="tutor-hours-history">
              Historial de movimientos
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Movimientos del ciclo vigente, ordenados del más reciente al más antiguo.
          </p>
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
                  {getMovementDirectionLabel(movement.direction)} ·{" "}
                  <time dateTime={movement.movementDate}>{formatLongDate(movement.movementDate)}</time>
                </p>
                <p className="hidden text-xs font-normal text-muted-foreground md:block xl:hidden">
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
    initialErrorMessage ?? genericErrorMessage,
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
          : genericErrorMessage,
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
