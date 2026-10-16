import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import type { BulkAction } from "./consultations-screen-utils";

export function BulkConfirmationDialog({ action, count, error, submitting, onClose, onConfirm, returnFocus }: {
  action: BulkAction;
  count: number;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  returnFocus: () => void;
}) {
  const title = action === "CONFIRM_SUGGESTED_SUBJECT" ? "Confirmar materia sugerida" : "Confirmar como General / Varias";
  return <ConfirmationDialog
    open
    title={title}
    description={action === "CONFIRM_SUGGESTED_SUBJECT"
      ? `Se intentará consolidar ${count} consultas con la materia sugerida.`
      : `Se intentará consolidar ${count} consultas como General / Varias.`}
    summary={<>
      <p>Se reconocerán las observaciones no bloqueantes de apellido, tema, tramo académico y modalidad. El servidor volverá a validar cada fila e informará cuántas se confirmaron y cuántas se omitieron.</p>
      {error && <p role="alert" className="mt-3 text-destructive">{error}</p>}
    </>}
    pending={submitting}
    confirmLabel={title}
    onConfirm={onConfirm}
    onOpenChange={(open) => { if (!open) onClose(); }}
    onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus(); }}
  />;
}
