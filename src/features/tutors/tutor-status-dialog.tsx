import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { TutorRequestError, getTutorErrorMessage } from "./tutor-screen-utils";
import type { StatusRequest } from "./tutor-presentation-types";

export function StatusConfirmation({ error, loading, onCancel, onConfirm, request }: {
  error: TutorRequestError | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  request: NonNullable<StatusRequest>;
}) {
  const isDeactivation = request.tutor.status === "ACTIVE";
  const action = isDeactivation ? "Desactivar tutor" : "Reactivar";
  return <ConfirmationDialog
    open
    onOpenChange={(open) => { if (!open) onCancel(); }}
    title={action}
    description={isDeactivation
      ? `El tutor ${request.tutor.formalName} quedará inactivo. Sus materias y antecedentes de ciclo se conservarán.`
      : `El tutor ${request.tutor.formalName} volverá a estar disponible en las operaciones activas.`}
    summary={error && <p role="alert" className="text-destructive">{getTutorErrorMessage(error)}</p>}
    onConfirm={onConfirm}
    confirmLabel={action}
    pendingLabel="Guardando…"
    pending={loading}
    destructive={isDeactivation}
  />;
}
