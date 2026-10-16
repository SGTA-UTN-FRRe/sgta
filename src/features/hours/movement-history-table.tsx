import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/shared/components/data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDuration } from "@/shared/format-duration";
import type { SafeHourMovement } from "./hour-service";
import { directionLabels, formatCycleStatus, formatDate, formatOrigin, getReversalVariant, reversalLabels } from "./movement-history-utils";

function MovementRelationship({ movement, visibleIds }: { movement: SafeHourMovement; visibleIds: ReadonlySet<string> }) {
  const targetId = movement.reversalState === "REVERSED" ? movement.reversalMovementId : movement.reversalOfMovementId;
  if (targetId) {
    const label = movement.reversalState === "REVERSED" ? "Ver reversión vinculada" : "Ver movimiento original";
    return <>
      <p className="text-xs text-muted-foreground">{movement.reversalState === "REVERSED"
        ? "El movimiento original permanece visible como revertido."
        : "Esta fila compensa un movimiento anterior y no puede revertirse otra vez."}</p>
      {visibleIds.has(targetId) ? <>
        <a className="hidden min-h-6 items-center text-xs text-link underline underline-offset-4 md:inline-flex" href={`#movement-${targetId}-table`}>{label}</a>
        <a className="inline-flex min-h-11 items-center text-xs text-link underline underline-offset-4 md:hidden" href={`#movement-${targetId}`}>{label}</a>
      </> : <p className="text-xs text-muted-foreground">El movimiento vinculado no aparece con los filtros actuales.</p>}
    </>;
  }
  return movement.cycle.status === "CLOSED" ? <p className="text-xs text-muted-foreground">El ciclo está cerrado; este movimiento permanece disponible sólo para consulta.</p> : null;
}

export function MovementHistoryTable({ movements, loading, onReverse, reverseDisabled, empty }: {
  movements: SafeHourMovement[];
  loading: boolean;
  onReverse: (movement: SafeHourMovement, trigger: HTMLElement) => void;
  reverseDisabled: boolean;
  empty: ReactNode;
}) {
  const visibleIds = new Set(movements.map((movement) => movement.id));
  const columns: DataColumn<SafeHourMovement>[] = [
    { id: "duration", header: "Duración", numeric: true, cell: (movement) => <div className="space-y-1 py-3">
      <p className="whitespace-nowrap font-bold">{formatDuration(movement.signedDurationMinutes, { signed: true })}</p>
      <p className="text-xs text-muted-foreground">{directionLabels[movement.direction]}</p>
    </div> },
    { id: "origin", header: "Categoría y origen", cell: (movement) => <div className="space-y-1 py-3">
      <p>{movement.category.name}</p><p className="text-xs text-muted-foreground">{formatOrigin(movement)}</p>
      {movement.origin && <><p className="text-xs text-muted-foreground">{formatDate(movement.origin.activityDate)} · {formatDuration(movement.origin.durationMinutes)}</p>
        <p className="text-xs text-muted-foreground">Origen registrado por {movement.origin.actor.displayName}</p></>}
    </div> },
    { id: "note", header: "Nota", className: "hidden xl:table-cell", compactClassName: "col-span-2", cell: (movement) => <p className="max-w-56 break-words py-3 text-muted-foreground">{movement.note ?? "Sin nota"}</p> },
    { id: "actor", header: "Ciclo y actor", className: "hidden xl:table-cell", cell: (movement) => <div className="space-y-1 py-3 text-xs text-muted-foreground">
      <p>{movement.cycle.name} · {formatCycleStatus(movement.cycle.status)}</p><p>{movement.actor.displayName}</p>
    </div> },
    { id: "state", header: "Estado", compactClassName: "col-span-2", cell: (movement) => <div className="max-w-56 space-y-1 py-3">
      <StatusBadge label={reversalLabels[movement.reversalState]} variant={getReversalVariant(movement.reversalState)} />
      <MovementRelationship movement={movement} visibleIds={visibleIds} />
    </div> },
  ];
  return <DataTable
    label="Historial de movimientos" rows={movements} loading={loading} loadingLabel="Cargando movimientos" empty={empty}
    getRowKey={(movement) => movement.id}
    getRowProps={(movement, layout) => ({ id: `movement-${movement.id}${layout === "table" ? "-table" : ""}`, "data-movement-id": movement.id, "data-reversal-state": movement.reversalState })}
    identityColumn={{ id: "tutor", header: "Tutor y fecha", cell: (movement) => <div className="min-w-0 space-y-1 py-3">
      <p className="font-bold">{movement.tutor.formalName}</p>
      <p className="text-xs font-normal text-muted-foreground">{formatDate(movement.movementDate)}</p>
      <p className="text-xs font-normal text-muted-foreground">{movement.tutor.careerName}</p>
      <div className="hidden space-y-1 text-xs font-normal text-muted-foreground md:block xl:hidden"><p>{movement.note ?? "Sin nota"}</p><p>{movement.cycle.name} · {formatCycleStatus(movement.cycle.status)} · {movement.actor.displayName}</p></div>
    </div> }}
    columns={columns}
    rowActions={(movement) => movement.reversalState === "CONFIRMED" && movement.cycle.status === "OPEN" && <Button
      aria-label={`Revertir movimiento de ${movement.tutor.formalName} del ${formatDate(movement.movementDate)}`}
      disabled={reverseDisabled} onClick={(event) => onReverse(movement, event.currentTarget)} size="sm" variant="outline"
    ><RotateCcw aria-hidden="true" /><span className="hidden xl:inline">Revertir movimiento</span><span className="xl:hidden">Revertir</span></Button>}
  />;
}
