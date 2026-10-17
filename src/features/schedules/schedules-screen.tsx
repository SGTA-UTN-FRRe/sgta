"use client";

import Link from "next/link";
import { Archive, History, Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { PageHeader } from "@/shared/components/page-header";
import { SystemState } from "@/shared/components/system-state";

import { AssignmentEditor, type AssignmentEditorTarget } from "./assignment-editor";
import { ScheduleCalendar } from "./schedule-calendar";
import { SchedulePlanBar } from "./schedule-plan-header";
import { PlanEditorDialog, PlansArchiveSheet } from "./schedule-plan-dialogs";
import type {
  SafeScheduleAssignment,
  SafeSchedulePlan,
  SafeScheduleWorkspace,
} from "./schedule-service";
import {
  deriveWorkspaceState,
  getScheduleErrorMessage,
  requestJson,
  ScheduleRequestError,
  toAssignmentView,
  type AssignmentDraft,
  type AssignmentView,
  type PlanDraft,
  type SchedulesScreenState,
} from "./schedule-view-model";
import { findVisible, getInitialPlanId, notifySaved, pageTitleId, returnFocus } from "./schedule-screen-utils";
import { SchedulesLoadingState } from "./schedules-loading-state";

export type { SchedulesScreenState } from "./schedule-view-model";

export interface SchedulesScreenProps {
  state?: SchedulesScreenState;
  workspace: SafeScheduleWorkspace | null;
}

export function SchedulesScreen({
  state = "default",
  workspace: initialWorkspace,
}: SchedulesScreenProps) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [viewState, setViewState] = useState<SchedulesScreenState>(state);
  const [selectedPlanId, setSelectedPlanId] = useState(() => getInitialPlanId(initialWorkspace));
  const [selectedDay, setSelectedDay] = useState("LUN");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedCareers, setSelectedCareers] = useState<string[]>([]);
  const [calendarView, setCalendarView] = useState<"matrix" | "blocks">("matrix");
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [editorTarget, setEditorTarget] = useState<AssignmentEditorTarget | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiveConfirmationOpen, setIsArchiveConfirmationOpen] = useState(false);
  const [archiveConfirmationError, setArchiveConfirmationError] = useState<string | null>(null);
  const editorTriggerRef = useRef<HTMLElement | null>(null);
  const editorAssignmentIdRef = useRef<string | null>(null);
  const planDialogTriggerRef = useRef<HTMLElement | null>(null);
  const archiveSheetTriggerRef = useRef<HTMLElement | null>(null);

  const activePlans = useMemo(
    () => (workspace?.plans ?? []).filter((plan) => plan.status === "ACTIVE"),
    [workspace?.plans],
  );
  const archivedPlans = useMemo(
    () => (workspace?.plans ?? []).filter((plan) => plan.status === "INACTIVE"),
    [workspace?.plans],
  );
  const selectedPlan =
    activePlans.find((plan) => plan.id === selectedPlanId) ?? activePlans[0] ?? null;
  const planAssignments = useMemo(
    () =>
      workspace && selectedPlan
        ? workspace.assignments
            .filter((assignment) => assignment.planId === selectedPlan.id && assignment.status === "ACTIVE")
            .map((assignment) => toAssignmentView(assignment, selectedPlan))
        : [],
    [selectedPlan, workspace],
  );
  const loadWorkspace = useCallback(
    async (planId?: string) => {
      if (!workspace) {
        throw new ScheduleRequestError("open_cycle_required", 409);
      }

      const params = new URLSearchParams({ cycleId: workspace.currentCycle.id });
      params.set("date", workspace.requestedDate ?? workspace.effective.date);
      if (planId) {
        params.set("planId", planId);
      }

      return requestJson<SafeScheduleWorkspace>(`/api/admin/schedules?${params.toString()}`);
    },
    [workspace],
  );

  const refreshWorkspace = useCallback(
    async (planId: string | undefined, { showLoading = false } = {}) => {
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const nextWorkspace = await loadWorkspace(planId);
        setWorkspace(nextWorkspace);
        setSelectedPlanId(nextWorkspace.selectedPlan?.id ?? planId ?? "");
        setViewState(deriveWorkspaceState(nextWorkspace));
        return nextWorkspace;
      } catch (error) {
        setViewState("error");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadWorkspace],
  );

  const selectPlan = useCallback(
    async (planId: string) => {
      if (planId === selectedPlan?.id || isLoading || isMutating) {
        return;
      }

      setSelectedAssignmentId(null);
      setSelectedCareers([]);

      try {
        await refreshWorkspace(planId, { showLoading: true });
      } catch {
        // The error notice keeps the previous plan context available for a retry.
      }
    },
    [isLoading, isMutating, refreshWorkspace, selectedPlan?.id],
  );

  const retry = useCallback(() => {
    void refreshWorkspace(selectedPlan?.id, { showLoading: true }).catch(() => {});
  }, [refreshWorkspace, selectedPlan?.id]);

  const openAddEditor = useCallback(
    (trigger: HTMLElement) => {
      if (!selectedPlan || isMutating) {
        return;
      }

      editorTriggerRef.current = trigger;
      editorAssignmentIdRef.current = null;
      setSelectedAssignmentId(null);
      setEditorTarget({ initialDay: selectedDay, mode: "add" });
      setIsEditorOpen(true);
    },
    [isMutating, selectedDay, selectedPlan],
  );

  const openEditEditor = useCallback((assignment: AssignmentView, trigger: HTMLElement) => {
    editorTriggerRef.current = trigger;
    editorAssignmentIdRef.current = assignment.id;
    setSelectedDay(assignment.day);
    setSelectedAssignmentId(assignment.id);
    setEditorTarget({ assignment, initialDay: assignment.day, mode: "edit" });
    setIsEditorOpen(true);
  }, []);

  const handleEditorOpenChange = useCallback((open: boolean) => {
    setIsEditorOpen(open);
    if (!open) {
      setSelectedAssignmentId(null);
    }
  }, []);

  const restoreEditorFocus = useCallback((event: Event) => {
    event.preventDefault();
    const trigger = editorTriggerRef.current;
    const assignmentId = editorAssignmentIdRef.current;

    if (trigger?.isConnected) {
      trigger.focus();
    } else if (assignmentId) {
      findVisible(`[data-schedule-assignment-id="${assignmentId}"]`)?.focus();
    }

    editorTriggerRef.current = null;
    editorAssignmentIdRef.current = null;
  }, []);

  const openPlanDialog = useCallback((trigger: HTMLElement) => {
    planDialogTriggerRef.current = trigger;
    setIsPlanDialogOpen(true);
  }, []);

  const restorePlanDialogFocus = useCallback((event: Event) => {
    returnFocus(event, planDialogTriggerRef.current);
    planDialogTriggerRef.current = null;
  }, []);

  const openArchiveSheet = useCallback((trigger: HTMLElement) => {
    archiveSheetTriggerRef.current = trigger;
    setArchiveError(null);
    setIsArchiveOpen(true);
  }, []);

  const restoreArchiveSheetFocus = useCallback((event: Event) => {
    returnFocus(event, archiveSheetTriggerRef.current);
    archiveSheetTriggerRef.current = null;
  }, []);

  const savePlan = useCallback(
    async (draft: PlanDraft) => {
      if (!workspace) {
        throw new ScheduleRequestError("open_cycle_required", 409);
      }

      setIsMutating(true);

      try {
        const response = await requestJson<{ plan: SafeSchedulePlan }>("/api/admin/schedules/plans", {
          body: JSON.stringify({ ...draft, cycleId: workspace.currentCycle.id, status: "ACTIVE" }),
          method: "POST",
        });
        await refreshWorkspace(response.plan.id);
        setSelectedPlanId(response.plan.id);
        setSelectedCareers([]);
        setIsPlanDialogOpen(false);
        notifySaved("El plan se guardó correctamente.");
      } finally {
        setIsMutating(false);
      }
    },
    [refreshWorkspace, workspace],
  );

  const saveAssignment = useCallback(
    async (draft: AssignmentDraft, originalId?: string) => {
      if (!workspace || !selectedPlan) {
        throw new ScheduleRequestError("plan_not_found", 404);
      }

      setIsMutating(true);

      try {
        await requestJson<{ assignment: SafeScheduleAssignment }>(
          originalId
            ? `/api/admin/schedules/assignments/${originalId}`
            : "/api/admin/schedules/assignments",
          {
            body: JSON.stringify(originalId ? draft : { ...draft, planId: selectedPlan.id }),
            method: originalId ? "PATCH" : "POST",
          },
        );
        await refreshWorkspace(selectedPlan.id);
        handleEditorOpenChange(false);
        notifySaved("La asignación se guardó correctamente.");
      } finally {
        setIsMutating(false);
      }
    },
    [handleEditorOpenChange, refreshWorkspace, selectedPlan, workspace],
  );

  const deleteAssignment = useCallback(async () => {
    const assignment = editorTarget?.assignment;

    if (!assignment) {
      return;
    }

    setIsMutating(true);

    try {
      await requestJson<{ assignment: SafeScheduleAssignment }>(
        `/api/admin/schedules/assignments/${assignment.id}/status`,
        {
          body: JSON.stringify({ status: assignment.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
          method: "PATCH",
        },
      );
      await refreshWorkspace(selectedPlan?.id);
      handleEditorOpenChange(false);
      notifySaved("La asignación se eliminó correctamente.");
    } finally {
      setIsMutating(false);
    }
  }, [editorTarget?.assignment, handleEditorOpenChange, refreshWorkspace, selectedPlan?.id]);

  const reactivatePlan = useCallback(
    async (plan: SafeSchedulePlan) => {
      setIsMutating(true);
      setArchiveError(null);

      try {
        await requestJson<{ plan: SafeSchedulePlan }>(`/api/admin/schedules/plans/${plan.id}/status`, {
          body: JSON.stringify({ status: "ACTIVE" }),
          method: "PATCH",
        });
      } catch (error) {
        setArchiveError(getScheduleErrorMessage(error));
        setIsMutating(false);
        return;
      }

      setSelectedCareers([]);

      try {
        await refreshWorkspace(plan.id);
      } catch {
        // The change is saved; keep the reactivated plan visible until the next load.
        setWorkspace((current) =>
          current && {
            ...current,
            plans: current.plans.map((item) =>
              item.id === plan.id ? { ...item, status: "ACTIVE" as const } : item,
            ),
            selectedPlan: { ...plan, status: "ACTIVE" as const },
          },
        );
      }

      // Close after the refresh so focus returns to an enabled trigger.
      setSelectedPlanId(plan.id);
      setIsArchiveOpen(false);
      setIsMutating(false);
      notifySaved("El plan fue reactivado correctamente.");
    },
    [refreshWorkspace],
  );

  const archivePlan = useCallback(async () => {
    if (!selectedPlan) {
      return;
    }

    setIsMutating(true);
    setArchiveConfirmationError(null);

    try {
      await requestJson<{ plan: SafeSchedulePlan }>(`/api/admin/schedules/plans/${selectedPlan.id}/status`, {
        body: JSON.stringify({ status: "INACTIVE" }),
        method: "PATCH",
      });
    } catch (error) {
      setArchiveConfirmationError(getScheduleErrorMessage(error));
      setIsMutating(false);
      return;
    }

    setSelectedCareers([]);

    try {
      await refreshWorkspace(undefined);
    } catch {
      // The change is saved; drop the archived plan from the operational view.
      setWorkspace((current) => {
        if (!current) {
          return current;
        }

        const plans = current.plans.map((plan) =>
          plan.id === selectedPlan.id ? { ...plan, status: "INACTIVE" as const } : plan,
        );

        return { ...current, plans, selectedPlan: plans.find((plan) => plan.status === "ACTIVE") ?? null };
      });
    }

    // Close after the refresh so focus returns to an enabled trigger.
    setIsArchiveConfirmationOpen(false);
    setIsMutating(false);
    notifySaved("El plan fue archivado correctamente.");
  }, [refreshWorkspace, selectedPlan]);

  const requiresCycle = viewState === "required-action" || (viewState !== "error" && !workspace);
  const hasNoPlan = workspace !== null && activePlans.length === 0;
  const configureCycleLink = (
    <Link className={buttonVariants()} href="/admin/settings">
      Configurar ciclo
    </Link>
  );
  const archiveButton = (
    <Button
      disabled={isMutating}
      onClick={(event) => openArchiveSheet(event.currentTarget)}
      type="button"
      variant="ghost"
    >
      <History aria-hidden="true" />
      Archivo de planes
    </Button>
  );

  let headerAction = null;
  let headerSecondaryActions = null;

  if (requiresCycle) {
    headerAction = configureCycleLink;
  } else if (hasNoPlan) {
    headerAction = (
      <Button disabled={isMutating} onClick={(event) => openPlanDialog(event.currentTarget)} type="button">
        <Plus aria-hidden="true" />
        Crear plan
      </Button>
    );
    headerSecondaryActions = archivedPlans.length > 0 ? archiveButton : null;
  } else if (workspace) {
    headerAction = (
      <Button
        disabled={isMutating || isLoading || !selectedPlan}
        onClick={(event) => openAddEditor(event.currentTarget)}
        type="button"
      >
        <Plus aria-hidden="true" />
        Agregar asignación
      </Button>
    );
    headerSecondaryActions = (
      <>
        <Button disabled={isMutating} onClick={(event) => openPlanDialog(event.currentTarget)} type="button" variant="ghost">
          <Plus aria-hidden="true" />
          Nuevo plan
        </Button>
        {archiveButton}
      </>
    );
  }

  const showGridLoading = isLoading || viewState === "loading";

  return (
    <>
      <div className="flex flex-col gap-4 md:gap-6" data-slot="schedules-screen" data-state={showGridLoading ? "loading" : viewState}>
        <PageHeader
          action={headerAction}
          actionsBelowUntilWide
          description="Planificar guardias regulares y períodos especiales."
          secondaryActions={headerSecondaryActions}
          title="Horarios"
          titleId={pageTitleId}
        />

        {viewState === "error" && (
          <SystemState
            action={
              workspace ? (
                <Button onClick={retry} type="button" variant="outline">
                  Reintentar
                </Button>
              ) : (
                <Link className={buttonVariants({ variant: "outline" })} href="/admin/schedules">
                  Reintentar
                </Link>
              )
            }
            description="Reintentar para volver a consultar el plan seleccionado."
            title="No se pudo cargar el horario"
            variant="error"
          />
        )}

        {requiresCycle && (
          <SystemState
            action={configureCycleLink}
            description="Abrir un ciclo administrativo para comenzar a organizar las guardias."
            title="Abrir un ciclo para gestionar horarios"
            variant="required-action"
          />
        )}

        {hasNoPlan && (
          <SystemState
            action={
              <>
                <Button onClick={(event) => openPlanDialog(event.currentTarget)} type="button" variant="outline">
                  Crear plan
                </Button>
                {archivedPlans.length > 0 && (
                  <Button onClick={(event) => openArchiveSheet(event.currentTarget)} type="button" variant="outline">
                    Archivo de planes
                  </Button>
                )}
              </>
            }
            description={
              archivedPlans.length > 0
                ? "No hay planes activos en este ciclo. Crear un plan nuevo o reactivar uno desde Archivo de planes."
                : "Crear o activar un plan para comenzar a organizar las guardias."
            }
            title="No hay un plan de horario activo"
            variant="empty"
          />
        )}

        {workspace && selectedPlan && (
          <>
            <SchedulePlanBar
              archiveAction={
                <ConfirmationDialog
                  confirmLabel="Archivar plan"
                  description={`El plan ${selectedPlan.name} se moverá al archivo de planes y dejará de estar disponible en la grilla operativa principal. Se puede reactivar en cualquier momento desde Archivo de planes.`}
                  onConfirm={() => void archivePlan()}
                  onOpenChange={(open) => {
                    setArchiveConfirmationError(null);
                    setIsArchiveConfirmationOpen(open);
                  }}
                  open={isArchiveConfirmationOpen}
                  pending={isMutating}
                  pendingLabel="Archivando..."
                  summary={
                    archiveConfirmationError ? <p role="alert">{archiveConfirmationError}</p> : undefined
                  }
                  title="¿Archivar este plan?"
                  trigger={
                    <Button disabled={isMutating || isLoading} size="sm" type="button" variant="ghost">
                      <Archive aria-hidden="true" />
                      Archivar plan
                    </Button>
                  }
                />
              }
              onSelectPlan={(planId) => void selectPlan(planId)}
              plan={selectedPlan}
              plans={activePlans}
              workspace={workspace}
            />

            {showGridLoading ? (
              <SchedulesLoadingState />
            ) : (
              <ScheduleCalendar
                calendarView={calendarView}
                conflicts={workspace.conflicts}
                onCalendarViewChange={setCalendarView}
                onEdit={openEditEditor}
                onSelectedCareersChange={setSelectedCareers}
                onSelectedDayChange={setSelectedDay}
                planAssignments={planAssignments}
                selectedAssignmentId={isEditorOpen ? selectedAssignmentId : null}
                selectedCareers={selectedCareers}
                selectedDay={selectedDay}
              />
            )}
          </>
        )}
      </div>

      {workspace && (
        <>
          <PlanEditorDialog
            cycle={workspace.currentCycle}
            onCloseAutoFocus={restorePlanDialogFocus}
            onOpenChange={setIsPlanDialogOpen}
            onSave={savePlan}
            open={isPlanDialogOpen}
          />
          <PlansArchiveSheet
            archivedPlans={archivedPlans}
            cycle={workspace.currentCycle}
            error={archiveError}
            isMutating={isMutating}
            onCloseAutoFocus={restoreArchiveSheetFocus}
            onOpenChange={setIsArchiveOpen}
            onReactivatePlan={reactivatePlan}
            open={isArchiveOpen}
            workspaceAssignments={workspace.assignments}
          />
        </>
      )}

      {workspace && selectedPlan && (
        <>
          <AssignmentEditor
            onCloseAutoFocus={restoreEditorFocus}
            onDelete={deleteAssignment}
            onOpenChange={handleEditorOpenChange}
            onSave={saveAssignment}
            open={isEditorOpen}
            plan={selectedPlan}
            target={editorTarget}
            tutors={workspace.eligibleTutors}
          />
        </>
      )}
    </>
  );
}
