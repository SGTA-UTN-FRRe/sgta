"use client";

import { History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { FormField } from "@/shared/components/form-field";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { SystemState } from "@/shared/components/system-state";
import { cn } from "@/shared/utils";
import { CareerSection } from "./career-settings-section";
import { SubjectSection } from "./subject-settings-section";
import { ScholarshipSection } from "./scholarship-settings-section";
import { HourCategorySection } from "./hour-category-settings-section";
import { FeedbackBanner } from "./settings-feedback";
import {
  EMPTY_CAREER_FORM,
  EMPTY_SUBJECT_FORM,
  EMPTY_SCHOLARSHIP_FORM,
  EMPTY_HOUR_CATEGORY_FORM,
  formatCyclePeriod,
  type HourActivityKind,
  type SettingsScreenProps,
} from "./settings-screen-utils";
import { useSettingsScreen } from "./use-settings-screen";

export type { SettingsScreenProps, SettingsState } from "./settings-screen-utils";

export function SettingsScreen(props: SettingsScreenProps) {
  const {
    closeCycleTriggerRef,
    closeCycleHistoryRef,
    isLoading,
    pendingOperation,
    dataLoaded,
    screenState,
    updateStateForEditing,
    refreshSettings,
    handleCreateCycle,
    handleCloseCycle,
    handleCareerSubmit,
    handleCareerStatusChange,
    handleSubjectSubmit,
    handleSubjectStatusChange,
    handleScholarshipSubmit,
    handleScholarshipStatusChange,
    handleHourCategorySubmit,
    handleHourCategoryStatusChange,
    currentCycle,
    cycles,
    careers,
    subjects,
    scholarshipReferences,
    hourCategories,
    cycleForm,
    setCycleForm,
    careerForm,
    setCareerForm,
    subjectForm,
    setSubjectForm,
    scholarshipForm,
    setScholarshipForm,
    hourCategoryForm,
    setHourCategoryForm,
    state,
    feedback,
    closeConfirmationOpen,
    setCloseConfirmationOpen,
  } = useSettingsScreen(props);
  const loadFailed = feedback?.kind === "error" && feedback.retry === true;
  const pendingStatus =
    pendingOperation === "refresh"
      ? "Actualizando configuración"
      : "Guardando cambios de configuración";
  return (
    <div className="min-w-0" data-slot="settings-screen" data-state={screenState}>
      <PageHeader
        action={
          loadFailed ? undefined : (
            <Button
              disabled={isLoading}
              onClick={() => void refreshSettings()}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw
                aria-hidden="true"
                className={cn(isLoading && pendingOperation === "refresh" && "animate-spin")}
              />
              Actualizar
            </Button>
          )
        }
        breadcrumbs={[{ label: "Configuración" }]}
        description="Administrar el ciclo vigente, el catálogo académico y las referencias de beca."
        title="Configuración"
      />

      <div className="mt-6 space-y-6">
        {feedback && (
          <FeedbackBanner
            retryAction={
              <Button
                disabled={isLoading}
                onClick={() => void refreshSettings()}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCw aria-hidden="true" />
                Reintentar
              </Button>
            }
            feedback={feedback}
          />
        )}

        {state === "loading" && (
          <div
            aria-live="polite"
            aria-label={pendingStatus}
            className="space-y-3 text-sm text-muted-foreground"
            role="status"
          >
            <p>{pendingStatus}…</p>
            <Skeleton className="h-2 w-full" />
          </div>
        )}

        {dataLoaded && (
          <>
            <section aria-labelledby="current-cycle-title">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle id="current-cycle-title">Ciclo actual</CardTitle>
                      <CardDescription className="mt-2">
                        El ciclo abierto define el contexto administrativo vigente.
                      </CardDescription>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge
                        label={currentCycle === null ? "Requiere acción" : "Ciclo abierto"}
                        variant={currentCycle === null ? "warning" : "success"}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {currentCycle === null ? (
                    <>
                      <SystemState
                        className="py-0"
                        variant="required-action"
                        title="Todavía no hay un ciclo abierto"
                        description="Crear un ciclo para establecer el contexto de las operaciones administrativas."
                      />
                      <form
                        aria-labelledby="create-cycle-title"
                        className="space-y-4 border-t border-border pt-5"
                        onSubmit={handleCreateCycle}
                      >
                        <h3 className="font-display text-lg font-semibold" id="create-cycle-title">
                          Crear ciclo
                        </h3>
                        <div className="grid gap-4 md:grid-cols-3">
                          <FormField id="cycle-field-1" label="Nombre">
                            <Input
                              disabled={isLoading}
                              onChange={(event) =>
                                setCycleForm((previous) => ({
                                  ...previous,
                                  name: event.target.value,
                                }))
                              }
                              placeholder="Ciclo lectivo 2027"
                              required
                              value={cycleForm.name}
                            />
                          </FormField>
                          <FormField id="cycle-field-2" label="Fecha de inicio">
                            <Input
                              disabled={isLoading}
                              onChange={(event) =>
                                setCycleForm((previous) => ({
                                  ...previous,
                                  startDate: event.target.value,
                                }))
                              }
                              required
                              type="date"
                              value={cycleForm.startDate}
                            />
                          </FormField>
                          <FormField id="cycle-field-3" label="Fecha de finalización">
                            <Input
                              disabled={isLoading}
                              onChange={(event) =>
                                setCycleForm((previous) => ({
                                  ...previous,
                                  endDate: event.target.value,
                                }))
                              }
                              required
                              type="date"
                              value={cycleForm.endDate}
                            />
                          </FormField>
                        </div>
                        <Button disabled={isLoading} type="submit">
                          {isLoading && pendingOperation === "create-cycle"
                            ? "Guardando ciclo…"
                            : "Crear ciclo"}
                        </Button>
                      </form>
                    </>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-foreground">
                          {currentCycle.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatCyclePeriod(currentCycle)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Para crear un ciclo nuevo, primero cerrar el ciclo actual.
                        </p>
                      </div>
                      <Button
                        className="self-start sm:self-auto"
                        disabled={isLoading}
                        onClick={(event) => {
                          closeCycleTriggerRef.current = event.currentTarget;
                          setCloseConfirmationOpen(true);
                        }}
                        type="button"
                        variant="destructive"
                      >
                        Cerrar ciclo
                      </Button>
                    </div>
                  )}

                  <section
                    aria-labelledby="cycle-history-title"
                    className="border-t border-border pt-4 focus-visible:outline-none"
                    ref={closeCycleHistoryRef}
                    tabIndex={-1}
                  >
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button id="cycle-history-title" size="sm" type="button" variant="outline">
                          <History aria-hidden="true" />
                          Historial de ciclos
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Historial de ciclos</DialogTitle>
                          <DialogDescription>
                            Los ciclos cerrados conservan su información para consulta futura.
                          </DialogDescription>
                        </DialogHeader>
                        {cycles.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Todavía no hay ciclos registrados.
                          </p>
                        ) : (
                          <ul className="divide-y divide-border" aria-label="Ciclos registrados">
                            {cycles.map((cycle) => (
                              <li
                                className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                                key={cycle.id}
                              >
                                <div>
                                  <p className="font-medium text-foreground">{cycle.name}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {formatCyclePeriod(cycle)}
                                  </p>
                                </div>
                                <StatusBadge
                                  label={cycle.status === "OPEN" ? "Abierto" : "Cerrado"}
                                  variant={cycle.status === "OPEN" ? "success" : "neutral"}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </DialogContent>
                    </Dialog>
                  </section>
                </CardContent>
              </Card>
            </section>

            <div className="grid min-w-0 gap-6">
              <CareerSection
                careers={careers}
                disabled={isLoading}
                form={careerForm}
                onColorChange={(color) => setCareerForm((previous) => ({ ...previous, color }))}
                onCancel={() => {
                  setCareerForm(EMPTY_CAREER_FORM);
                  updateStateForEditing();
                }}
                onEdit={(career) => {
                  setCareerForm({ id: career.id, name: career.name, color: career.color });
                  updateStateForEditing();
                }}
                onNameChange={(name) =>
                  setCareerForm((previous) => ({ ...previous, name }))
                }
                onStatusChange={(career) => void handleCareerStatusChange(career)}
                onSubmit={handleCareerSubmit}
              />

              <SubjectSection
                careers={careers}
                disabled={isLoading}
                form={subjectForm}
                onCancel={() => {
                  setSubjectForm(EMPTY_SUBJECT_FORM);
                  updateStateForEditing();
                }}
                onCareerChange={(careerId) =>
                  setSubjectForm((previous) => ({ ...previous, careerId }))
                }
                onEdit={(subject) => {
                  setSubjectForm({
                    id: subject.id,
                    name: subject.name,
                    careerId: subject.careerId,
                  });
                  updateStateForEditing();
                }}
                onNameChange={(name) =>
                  setSubjectForm((previous) => ({ ...previous, name }))
                }
                onStatusChange={(subject) => void handleSubjectStatusChange(subject)}
                onSubmit={handleSubjectSubmit}
                subjects={subjects}
              />
            </div>

            <HourCategorySection
              categories={hourCategories}
              disabled={isLoading}
              form={hourCategoryForm}
              onActivityKindChange={(activityKind) =>
                setHourCategoryForm((previous) => ({
                  ...previous,
                  activityKind: activityKind as HourActivityKind | "",
                }))
              }
              onCancel={() => {
                setHourCategoryForm(EMPTY_HOUR_CATEGORY_FORM);
                updateStateForEditing();
              }}
              onEdit={(category) => {
                setHourCategoryForm({
                  id: category.id,
                  name: category.name,
                  activityKind: category.activityKind ?? "",
                });
                updateStateForEditing();
              }}
              onNameChange={(name) =>
                setHourCategoryForm((previous) => ({ ...previous, name }))
              }
              onStatusChange={(category) => void handleHourCategoryStatusChange(category)}
              onSubmit={handleHourCategorySubmit}
            />

            <ScholarshipSection
              disabled={isLoading}
              form={scholarshipForm}
              onCancel={() => {
                setScholarshipForm(EMPTY_SCHOLARSHIP_FORM);
                updateStateForEditing();
              }}
              onEdit={(reference) => {
                setScholarshipForm({
                  id: reference.id,
                  type: reference.type,
                  knownRequiredHours:
                    reference.knownRequiredHours === null
                      ? ""
                      : String(reference.knownRequiredHours),
                  notes: reference.notes ?? "",
                });
                updateStateForEditing();
              }}
              onHoursChange={(knownRequiredHours) =>
                setScholarshipForm((previous) => ({ ...previous, knownRequiredHours }))
              }
              onNotesChange={(notes) =>
                setScholarshipForm((previous) => ({ ...previous, notes }))
              }
              onStatusChange={(reference) => void handleScholarshipStatusChange(reference)}
              onSubmit={handleScholarshipSubmit}
              onTypeChange={(type) =>
                setScholarshipForm((previous) => ({ ...previous, type }))
              }
              references={scholarshipReferences}
            />
          </>
        )}
      </div>

      <ConfirmationDialog
        open={closeConfirmationOpen}
        onOpenChange={setCloseConfirmationOpen}
        title="Confirmar cierre del ciclo"
        description={`Se cerrará “${currentCycle?.name ?? ""}”. El historial permanecerá disponible y el próximo ciclo comenzará con saldo de horas cero.`}
        confirmLabel="Confirmar cierre"
        pendingLabel="Cerrando ciclo…"
        pending={isLoading}
        destructive
        onConfirm={() => void handleCloseCycle()}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (closeCycleTriggerRef.current?.isConnected) closeCycleTriggerRef.current.focus();
          else closeCycleHistoryRef.current?.focus();
        }}
      />
    </div>
  );
}
