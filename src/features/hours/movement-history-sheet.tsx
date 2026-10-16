import Link from "next/link";
import type { RefObject } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetFooter, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/shared/components/status-badge";
import { SystemState } from "@/shared/components/system-state";
import { formatDuration } from "@/shared/format-duration";
import { cn } from "@/shared/utils";
import { BalanceStatus } from "./balance-status";
import { movementHistoryHref } from "./hour-navigation";
import type { SafeHourBalance, SafeHourMovement } from "./hour-service";
import { directionLabels, formatDate, formatMovementOrigin, formatActivityKind } from "./hours-screen-utils";

export function MovementHistorySheet({
  balance,
  entries,
  error,
  loading,
  onClose,
  onRetry,
  open,
  returnFocusRef,
}: {
  balance: SafeHourBalance | null;
  entries: SafeHourMovement[];
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onRetry: () => void;
  open: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  if (!balance) return null;
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}>
        <SheetHeader className="pr-16">
          <SheetTitle>{balance.tutor.formalName}</SheetTitle>
          <SheetDescription>
            Movimientos del {balance.cycle.name}. El saldo se calcula a partir de los movimientos confirmados.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">Saldo</p>
          <BalanceStatus balance={balance} />

          <section aria-labelledby="hours-history-list-title" className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-foreground" id="hours-history-list-title">
                Movimientos
              </h3>
              <span className="text-xs text-muted-foreground">
                {entries.length} {entries.length === 1 ? "registro" : "registros"}
              </span>
            </div>

            {loading ? (
              <div className="mt-4 rounded-md border border-border bg-muted/60 p-4 text-sm text-muted-foreground" role="status">
                Cargando movimientos…
              </div>
            ) : error ? (
              <SystemState
                action={
                  <Button onClick={onRetry} size="sm" type="button" variant="outline">
                    Reintentar
                  </Button>
                }
                description={error}
                title="No se pudo cargar el historial"
                variant="error"
              />
            ) : entries.length === 0 ? (
              <SystemState variant="empty" title="Todavía no hay movimientos" description="Todavía no hay movimientos para este tutor en el ciclo actual." />
            ) : (
              <ol className="mt-4 space-y-3">
                {entries.map((entry) => (
                  <li
                    className="rounded-md border border-border bg-card p-4"
                    key={entry.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {formatDate(entry.movementDate)} · {entry.category.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {directionLabels[entry.direction]} · {formatDuration(entry.signedDurationMinutes, { signed: true })} · {formatMovementOrigin(entry)}
                        </p>
                      </div>
                      <StatusBadge
                        label={
                          entry.reversalState === "REVERSED"
                            ? "Revertido"
                            : entry.reversalState === "REVERSAL"
                              ? "Reversión"
                              : "Confirmado"
                        }
                        variant={entry.reversalState === "REVERSED" ? "warning" : "neutral"}
                      />
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">Nota</dt>
                        <dd className="mt-1 leading-6 text-muted-foreground">
                          {entry.note ?? "Sin nota"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">Actor</dt>
                        <dd className="mt-1 text-muted-foreground">{entry.actor.displayName}</dd>
                      </div>
                    </dl>

                    {entry.origin !== null && (
                      <p className="mt-4 rounded-sm border border-info/30 bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
                        Origen registrado: {formatActivityKind(entry.origin.kind)} · {formatDate(entry.origin.activityDate)}
                      </p>
                    )}

                    {entry.reversalState === "REVERSED" && (
                      <p className="mt-4 rounded-sm border border-warning/30 bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
                        El movimiento original se conserva sin editar y se muestra como revertido.
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <SheetFooter className="border-t border-border">
          <p className="text-xs leading-5 text-muted-foreground">
            El saldo se calcula a partir de los movimientos registrados y no se puede modificar directamente.
          </p>
          <Link
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3")}
            aria-label={`Ver movimientos de ${balance.tutor.formalName}`}
            href={movementHistoryHref(balance.cycle.id, balance.tutor.id)}
          >
            Ver movimientos
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
