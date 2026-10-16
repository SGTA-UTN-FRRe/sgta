import type { SafeHourMovement } from "./hour-service";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { formatDuration } from "@/shared/format-duration";
import { formatDate, formatOrigin } from "./movement-history-utils";

export function ReversalDialog({ error, onClose, onConfirm, onCloseAutoFocus, submitting, target }: {
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
  onCloseAutoFocus: (event: Event) => void;
  submitting: boolean;
  target: SafeHourMovement | null;
}) {
  return <ConfirmationDialog
    title="Revertir movimiento"
    description="Se agregará un movimiento opuesto y el original permanecerá visible como revertido."
    open={target !== null} onOpenChange={(open) => { if (!open) onClose(); }}
    onConfirm={onConfirm} confirmLabel="Confirmar reversión" pendingLabel="Registrando reversión…"
    pending={submitting} destructive onCloseAutoFocus={onCloseAutoFocus}
    summary={target && <div className="space-y-4">
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Tutor</dt><dd className="font-bold">{target.tutor.formalName}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Movimiento</dt><dd>{formatDate(target.movementDate)} · {target.category.name}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Saldo que compensa</dt><dd className="font-bold tabular-nums">{formatDuration(target.signedDurationMinutes, { signed: true })}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Origen</dt><dd>{formatOrigin(target)}</dd></div>
      </dl>
      <p className="text-muted-foreground">El saldo de horas se actualizará con la reversión. El movimiento original seguirá en el historial.</p>
    </div>}
  />;
}
