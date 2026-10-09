import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";

import type { SafeSchedulePlan, SafeScheduleWorkspace } from "./schedule-service";
import { formatDate, formatPlanKind, formatValidity } from "./schedule-view-model";

/** Compact plan bar: plan selector, selected plan context, and the quiet archive action. */
export function SchedulePlanBar({
  archiveAction,
  onSelectPlan,
  plan,
  plans,
  workspace,
}: {
  /** The quiet `Archivar plan` action. */
  archiveAction: ReactNode;
  onSelectPlan: (planId: string) => void;
  plan: SafeSchedulePlan;
  plans: readonly SafeSchedulePlan[];
  workspace: SafeScheduleWorkspace;
}) {
  return (
    <section aria-labelledby="schedule-plan-title" className="space-y-3">
      <h2 className="sr-only" id="schedule-plan-title">
        {plan.name}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-semibold">Seleccionar plan</span>
          <div aria-label="Planes de horario" className="flex flex-wrap gap-2" role="group">
            {plans.map((item) => {
              const selected = item.id === plan.id;

              return (
                <Button
                  aria-pressed={selected}
                  className="h-auto min-h-9 max-w-full shrink whitespace-normal py-1.5 text-left"
                  key={item.id}
                  onClick={() => onSelectPlan(item.id)}
                  title={`${item.name} · ${formatPlanKind(item.kind)} · ${formatValidity(item)}`}
                  type="button"
                  variant={selected ? "default" : "outline"}
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className="font-normal">{formatPlanKind(item.kind)}</span>
                </Button>
              );
            })}
          </div>
        </div>
        {archiveAction}
      </div>
      <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Estado</dt>
          <dd className="flex gap-1.5">
            <StatusBadge
              label={plan.status === "ACTIVE" ? "Activo" : "Inactivo"}
              variant={plan.status === "ACTIVE" ? "success" : "neutral"}
            />
            <Badge variant="outline">{formatPlanKind(plan.kind)}</Badge>
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">Vigencia</dt>
          <dd className="font-semibold tabular-nums">{formatValidity(plan)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">Ciclo vigente</dt>
          <dd className="font-semibold">{workspace.currentCycle.name}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">Fecha de referencia</dt>
          <dd className="font-semibold tabular-nums">{formatDate(workspace.effective.date)}</dd>
        </div>
      </dl>
    </section>
  );
}
