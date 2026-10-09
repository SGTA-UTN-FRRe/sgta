"use client";

import { Archive, CircleAlert, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FormField } from "@/shared/components/form-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { SystemState } from "@/shared/components/system-state";
import { cn } from "@/shared/utils";

import type {
  SafeScheduleAssignment,
  SafeScheduleCycle,
  SafeSchedulePlan,
  SafeScheduleWorkspace,
} from "./schedule-service";
import { ScheduleWeekGrid } from "./schedule-week-grid";
import {
  formatPlanKind,
  formatValidity,
  getScheduleErrorMessage,
  requestJson,
  toAssignmentView,
  type PlanDraft,
} from "./schedule-view-model";

function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 text-sm" role="alert">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
      <p>{message}</p>
    </div>
  );
}

function PlanForm({
  cycle,
  onCancel,
  onSave,
}: {
  cycle: SafeScheduleCycle;
  onCancel: () => void;
  onSave: (draft: PlanDraft) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SafeSchedulePlan["kind"]>("SPECIAL");
  const [validFrom, setValidFrom] = useState(cycle.startDate);
  const [validTo, setValidTo] = useState(cycle.endDate);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !validFrom || !validTo) {
      setError("Completar nombre y vigencia para continuar.");
      return;
    }

    if (validFrom > validTo) {
      setError("La fecha final debe ser posterior o igual a la fecha inicial.");
      return;
    }

    setSaving(true);

    try {
      await onSave({ kind, name: name.trim(), validFrom, validTo });
    } catch (saveError) {
      setError(getScheduleErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      {error && <FormError message={error} />}
      <FormField id="schedule-plan-name" label="Nombre">
        <Input disabled={saving} onChange={(event) => setName(event.target.value)} required value={name} />
      </FormField>
      <FormField id="schedule-plan-kind" label="Tipo de plan">
        <NativeSelect
          disabled={saving}
          onChange={(event) => setKind(event.target.value as SafeSchedulePlan["kind"])}
          value={kind}
        >
          <NativeSelectOption value="REGULAR">Regular</NativeSelectOption>
          <NativeSelectOption value="SPECIAL">Especial</NativeSelectOption>
        </NativeSelect>
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="schedule-plan-valid-from" label="Desde">
          <Input
            disabled={saving}
            max={cycle.endDate}
            min={cycle.startDate}
            onChange={(event) => setValidFrom(event.target.value)}
            required
            type="date"
            value={validFrom}
          />
        </FormField>
        <FormField id="schedule-plan-valid-to" label="Hasta">
          <Input
            disabled={saving}
            max={cycle.endDate}
            min={cycle.startDate}
            onChange={(event) => setValidTo(event.target.value)}
            required
            type="date"
            value={validTo}
          />
        </FormField>
      </div>
      <DialogFooter className="pt-2">
        <Button disabled={saving} onClick={onCancel} type="button" variant="outline">
          Cancelar
        </Button>
        <Button disabled={saving} type="submit">
          {saving ? "Guardando..." : "Guardar plan"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PlanEditorDialog({
  cycle,
  onCloseAutoFocus,
  onOpenChange,
  onSave,
  open,
}: {
  cycle: SafeScheduleCycle;
  onCloseAutoFocus?: (event: Event) => void;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: PlanDraft) => Promise<void>;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent compactLayout="fullscreen" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="pr-10 text-left">
          <DialogTitle>Crear plan de horario</DialogTitle>
          <DialogDescription>La vigencia debe pertenecer al ciclo {cycle.name}.</DialogDescription>
        </DialogHeader>
        <PlanForm cycle={cycle} onCancel={() => onOpenChange(false)} onSave={onSave} />
      </DialogContent>
    </Dialog>
  );
}

function ArchivedPlanPreview({
  cycleId,
  open,
  plan,
  workspaceAssignments,
}: {
  cycleId: string;
  open: boolean;
  plan: SafeSchedulePlan;
  workspaceAssignments: readonly SafeScheduleAssignment[];
}) {
  const [remoteAssignments, setRemoteAssignments] = useState<
    Record<string, SafeScheduleAssignment[]>
  >({});
  const localAssignments = useMemo(
    () => workspaceAssignments.filter((assignment) => assignment.planId === plan.id),
    [plan.id, workspaceAssignments],
  );

  useEffect(() => {
    if (!open || localAssignments.length > 0 || remoteAssignments[plan.id] !== undefined) {
      return;
    }

    let active = true;

    requestJson<SafeScheduleWorkspace>(`/api/admin/schedules?cycleId=${cycleId}&planId=${plan.id}`)
      .then((data) => data.assignments ?? [])
      .catch(() => [])
      .then((assignments) => {
        if (active) {
          setRemoteAssignments((previous) => ({ ...previous, [plan.id]: assignments }));
        }
      });

    return () => {
      active = false;
    };
  }, [cycleId, localAssignments.length, open, plan.id, remoteAssignments]);

  const assignments = (localAssignments.length > 0 ? localAssignments : remoteAssignments[plan.id] ?? [])
    .filter((assignment) => assignment.status === "ACTIVE")
    .map((assignment) => toAssignmentView(assignment, plan));
  const title = `Asignaciones de ${plan.name}`;

  return (
    <section aria-labelledby="archived-plan-preview-title" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-semibold" id="archived-plan-preview-title">
          {title}
        </h3>
        <StatusBadge label="Solo lectura" variant="info" />
      </div>
      <p className="text-sm text-muted-foreground">Modo solo lectura para el plan archivado.</p>
      <ScheduleWeekGrid
        assignments={assignments}
        conflictIds={new Set()}
        label={title}
        readOnly
        selectedAssignmentId={null}
      />
    </section>
  );
}

export function PlansArchiveSheet({
  archivedPlans,
  cycle,
  error,
  isMutating,
  onCloseAutoFocus,
  onOpenChange,
  onReactivatePlan,
  open,
  workspaceAssignments,
}: {
  archivedPlans: readonly SafeSchedulePlan[];
  cycle: SafeScheduleCycle;
  error: string | null;
  isMutating: boolean;
  onCloseAutoFocus: (event: Event) => void;
  onOpenChange: (open: boolean) => void;
  onReactivatePlan: (plan: SafeSchedulePlan) => Promise<void>;
  open: boolean;
  workspaceAssignments: readonly SafeScheduleAssignment[];
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const selectedPlan =
    archivedPlans.find((plan) => plan.id === selectedPlanId) ?? archivedPlans[0] ?? null;

  return (
    <Sheet onOpenChange={(next) => { if (!isMutating) onOpenChange(next); }} open={open}>
      <SheetContent className="gap-0" onCloseAutoFocus={onCloseAutoFocus} size="wide">
        <SheetHeader className="border-b border-border p-6 pr-16">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">Histórico</p>
          <SheetTitle>Archivo de planes</SheetTitle>
          <SheetDescription>
            Planes archivados del ciclo {cycle.name}. Consultar sus asignaciones en modo solo lectura o reactivarlos.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 py-5">
          {error && <FormError message={error} />}
          {archivedPlans.length === 0 || !selectedPlan ? (
            <SystemState
              description="Los planes archivados aparecen aquí para su consulta histórica o reactivación."
              title="No hay planes archivados"
              variant="empty"
            />
          ) : (
            <>
              <ul aria-label="Listado de planes archivados" className="divide-y divide-border rounded-xl border border-border">
                {archivedPlans.map((plan) => {
                  const selected = plan.id === selectedPlan.id;

                  return (
                    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center" key={plan.id}>
                      <Button
                        aria-pressed={selected}
                        className={cn(
                          "flex min-h-11 flex-1 flex-col items-start gap-1 rounded-md p-2 hover:bg-muted",
                          selected && "outline-2 -outline-offset-2 outline-primary",
                        )}
                        onClick={() => setSelectedPlanId(plan.id)}
                        size="content"
                        type="button"
                        variant="surface"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{plan.name}</span>
                          <StatusBadge icon={Archive} label="Archivado" variant="neutral" />
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatPlanKind(plan.kind)} · <span className="tabular-nums">{formatValidity(plan)}</span>
                        </span>
                      </Button>
                      <Button
                        disabled={isMutating}
                        onClick={() => void onReactivatePlan(plan)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <RotateCcw aria-hidden="true" />
                        Reactivar plan
                      </Button>
                    </li>
                  );
                })}
              </ul>
              <ArchivedPlanPreview
                cycleId={cycle.id}
                open={open}
                plan={selectedPlan}
                workspaceAssignments={workspaceAssignments}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
