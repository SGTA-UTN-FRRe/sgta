import type { ReactNode } from "react";
import { CheckCircle2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import { EmptyState } from "@/shared/components/empty-state";
import { SystemState } from "@/shared/components/system-state";

import { statusLabel, statusVariant, type Feedback } from "./settings-screen-utils";

export function FeedbackBanner({
  action,
  feedback,
}: {
  action?: ReactNode;
  feedback: Feedback;
}) {
  if (feedback.kind === "error") {
    return <SystemState variant="error" title={feedback.message} action={action} />;
  }
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Resultado de configuración"
      className="flex items-start gap-3 border-l-2 border-success px-4 py-3 text-sm text-foreground"
    >
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
      <span>{feedback.message}</span>
      {action}
    </div>
  );
}

export function ReferenceStatusAction({
  disabled,
  entityLabel,
  onClick,
  status,
}: {
  disabled: boolean;
  entityLabel: string;
  onClick: () => void;
  status: "ACTIVE" | "INACTIVE";
}) {
  const activating = status === "INACTIVE";
  const actionLabel = activating ? "Activar" : "Inactivar";

  return (
    <Button
      aria-label={`${actionLabel} ${entityLabel}`}
      disabled={disabled}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      <Power aria-hidden="true" />
      {actionLabel}
    </Button>
  );
}

export function ReferenceStatusBadge({ status }: { status: "ACTIVE" | "INACTIVE"; }) {
  return <StatusBadge label={statusLabel(status)} variant={statusVariant(status)} />;
}

export function EmptyReferenceList({ children }: { children: string; }) {
  return (
    <EmptyState title={children} />
  );
}
