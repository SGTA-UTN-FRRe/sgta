"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { SystemState } from "@/shared/components/system-state";
import { FormField } from "@/shared/components/form-field";
import { formatDate, type ConsultationsScreenProps } from "./consultations-screen-utils";
import { useConsultationsWorkspace } from "./use-consultations-workspace";
import { ConsultationFiltersBar } from "./consultation-filters";
import { ConsultationList, ReviewQueueCard, LoadingWorkspace } from "./consultation-list";
import { ReviewSheet } from "./consultation-review-sheet";
import { BulkConfirmationDialog } from "./consultation-bulk-dialog";

export function ConsultationsScreen(props: ConsultationsScreenProps) {
  const { careers, tutors } = props;
  const {
    filters,
    workspace,
    listLoading,
    listError,
    filterError,
    importing,
    importMessage,
    importError,
    selectedStagingId,
    reviewDetail,
    reviewForm,
    duplicateChoices,
    reviewLoading,
    reviewSaving,
    reviewError,
    reviewSuccess,
    reviewDirty,
    selectedStagingIds,
    selectionLoading,
    bulkSubmitting,
    bulkConfirmationAction,
    bulkMessage,
    bulkError,
    announcement,
    screenRef,
    screenState,
    updateFilter,
    clearFilters,
    retryList,
    loadReview,
    openReview,
    closeReview,
    handleImport,
    selectAllFiltered,
    toggleStagingSelection,
    openBulkConfirmation,
    closeBulkConfirmation,
    confirmBulkAction,
    saveReview,
    currentWorkspace,
    status,
    lastUpdate,
    canImport,
    currentPageStart,
    currentPageEnd,
    nextOffset,
    canGoForward,
    visibleQueue,
    visibleRows,
    visibleQueueIds,
    allVisibleSelected,
    someVisibleSelected,
    toggleVisibleQueue,
    setReviewForm,
    setDuplicateChoices,
    lastTriggerRef,
    bulkDialogTriggerRef,
  } = useConsultationsWorkspace(props);
  return (
    <>
      <div
        data-slot="consultations-screen"
        data-state={screenState}
        ref={screenRef}
        tabIndex={-1}
      >
        <PageHeader
          title="Consultas"
          description="Importar, revisar y consultar registros de atención académica."
          action={
            <Button
              disabled={!canImport}
              onClick={() => void handleImport()}
              type="button"
            >
              {importing ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />}
              {currentWorkspace.import.status === "FAILED" ? "Reintentar" : "Actualizar consultas"}
            </Button>
          }
        />

        <section
          aria-label="Estado de la fuente de consultas"
          className="mt-4 grid gap-4 rounded-xl border border-border bg-card p-3 md:mt-6 md:p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
          data-state={currentWorkspace.import.status === "FAILED" ? "unavailable" : currentWorkspace.import.status === "PARTIAL" ? "degraded" : "ready"}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
              {currentWorkspace.import.status === "FAILED" || currentWorkspace.import.status === "PARTIAL"
                ? <AlertTriangle className="h-5 w-5" />
                : <CheckCircle2 className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-semibold text-foreground">Estado de la importación</h2>
                <StatusBadge label={status.label} variant={status.variant} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{status.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Última actualización correcta: {lastUpdate ? formatDate(lastUpdate) : "Sin registros"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm sm:min-w-52">
            <span className="text-muted-foreground">Pendientes de revisión</span>
            <strong className="text-right tabular-nums">{currentWorkspace.pendingReviewCount}</strong>
            <span className="text-muted-foreground">Filas con errores</span>
            <strong className="text-right tabular-nums">{currentWorkspace.import.errorRows}</strong>
          </div>
        </section>

        {importError && (
          <SystemState variant="error" className="mt-4" title={importError} />
        )}
        {importMessage && (
          <div className="mt-4 rounded-md border border-success/30 bg-muted/60 p-3 text-sm text-foreground" role="status">
            <p>{importMessage}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Nuevas: {currentWorkspace.import.newRows}</span>
              <span>Ya procesadas: {currentWorkspace.import.alreadyProcessedRows}</span>
              <span>Para revisar: {currentWorkspace.import.reviewRows}</span>
              <span>Errores: {currentWorkspace.import.errorRows}</span>
            </div>
          </div>
        )}
        {announcement && !importMessage && !importError && !bulkMessage && (
          <p aria-live="polite" className="sr-only" role="status">{announcement}</p>
        )}
        {filterError && (
          <SystemState variant="degraded" role="alert" className="mt-4" title="Los filtros de la dirección no son válidos. Se muestran todas las consultas."
            action={<Button onClick={clearFilters} size="sm" type="button" variant="outline">Limpiar filtros</Button>} />
        )}
        {listError && workspace !== null && (
          <SystemState variant="error" className="mt-4" title={listError} description="Se conservan los datos que ya estaban disponibles."
            action={<Button onClick={retryList} size="sm" type="button" variant="outline">Reintentar</Button>} />
        )}

        <ConsultationFiltersBar careers={careers} tutors={tutors} filters={filters} resultCount={currentWorkspace.totalRows + visibleQueue.length} onChange={updateFilter} onClear={clearFilters} />

        <p aria-live="polite" className="mt-4 min-h-5 text-sm text-muted-foreground" role="status">
          {listLoading
            ? <><LoaderCircle aria-hidden="true" className="mr-2 inline h-4 w-4 animate-spin" />Actualizando resultados…</>
            : screenState === "loading"
              ? "Cargando consultas…"
              : listError && workspace === null
                ? null
                : `${currentWorkspace.totalRows} consultas registradas · ${currentWorkspace.pendingReviewCount} pendientes de revisión`}
        </p>

        {screenState === "error" && workspace === null && (
          <SystemState variant="error" className="mt-3" title="No se pudo cargar la lista de consultas."
            description="Reintentar para volver a cargar las consultas registradas."
            action={<Button onClick={retryList} type="button" variant="outline">Reintentar</Button>} />
        )}
        {screenState === "loading" && workspace === null && <LoadingWorkspace />}

        {workspace !== null && (
          <>
            <section aria-labelledby="pending-reviews-heading" className="mt-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-semibold text-foreground" id="pending-reviews-heading">Pendientes de revisión</h2>
                <span className="text-sm text-muted-foreground">{currentWorkspace.pendingReviewCount} en total</span>
              </div>
              <div className="mb-3 grid gap-3 rounded-md border border-border bg-card p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <FormField inline id="consultations-select-page" label="Seleccionar página">
                    <Checkbox
                      aria-label="Seleccionar las consultas pendientes de esta página"
                      aria-checked={someVisibleSelected ? "mixed" : allVisibleSelected}
                      checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
                      disabled={visibleQueueIds.length === 0 || selectionLoading || bulkSubmitting}
                      onCheckedChange={toggleVisibleQueue}
                    />
                  </FormField>
                  <Button
                    disabled={selectionLoading || bulkSubmitting}
                    onClick={() => void selectAllFiltered()}
                    type="button"
                    variant="outline"
                  >
                    {selectionLoading ? "Seleccionando…" : "Seleccionar todas las filtradas"}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedStagingIds.length} seleccionadas · máximo 500
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={selectedStagingIds.length === 0 || selectionLoading || bulkSubmitting}
                    onClick={(event) =>
                      openBulkConfirmation(
                        "CONFIRM_SUGGESTED_SUBJECT",
                        event.currentTarget,
                      )
                    }
                    type="button" variant="outline"
                  >
                    Confirmar materia sugerida
                  </Button>
                  <Button
                    disabled={selectedStagingIds.length === 0 || selectionLoading || bulkSubmitting}
                    onClick={(event) =>
                      openBulkConfirmation("CONFIRM_GENERAL", event.currentTarget)
                    }
                    type="button"
                    variant="outline"
                  >
                    Confirmar como General / Varias
                  </Button>
                </div>
              </div>
              {bulkMessage && (
                <p className="mb-3 rounded-md border border-success/30 bg-muted/50 p-3 text-sm text-foreground" role="status">
                  {bulkMessage}
                </p>
              )}
              {bulkError && bulkConfirmationAction === null && (
                <p className="mb-3 rounded-md border border-destructive/30 bg-muted/50 p-3 text-sm text-foreground" role="alert">
                  {bulkError}
                </p>
              )}
              {visibleQueue.length > 0 ? (
                <div className="grid gap-3">
                  {visibleQueue.map((item) => (
                    <ReviewQueueCard
                      key={item.stagingId}
                      careers={careers}
                      item={item}
                      onOpen={openReview}
                      onToggleSelection={toggleStagingSelection}
                      selected={selectedStagingIds.includes(item.stagingId)}
                    />
                  ))}
                </div>
              ) : (
                <SystemState variant="empty" title={filters.status === "PENDING_REVIEW" ? "No hay consultas pendientes con estos filtros." : "No hay consultas pendientes en este resultado."} />
              )}
            </section>

            <section aria-labelledby="canonical-consultations-heading" className="mt-7">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-semibold text-foreground" id="canonical-consultations-heading">Consultas registradas</h2>
                {currentWorkspace.totalRows > 0 && (
                  <span className="text-sm text-muted-foreground">Mostrando {currentPageStart}–{currentPageEnd} de {currentWorkspace.totalRows}</span>
                )}
              </div>
              {visibleRows.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-3 md:p-4">
                  <ConsultationList careers={careers} rows={visibleRows} onOpen={openReview} />
                </div>
              ) : filters.status !== "PENDING_REVIEW" ? (
                <EmptyState
                  action={screenState === "search-empty"
                    ? <Button onClick={clearFilters} type="button" variant="outline">Limpiar filtros</Button>
                    : <Button onClick={() => void handleImport()} disabled={importing} type="button" variant="outline">Actualizar consultas</Button>}
                  description={screenState === "search-empty"
                    ? "Probar con otros términos o quitar alguno de los filtros."
                    : "Al actualizar la fuente, las consultas registradas aparecerán aquí."}
                  title={screenState === "search-empty" ? "No hay resultados para estos filtros" : "Todavía no hay consultas registradas"}
                />
              ) : null}
              {(currentWorkspace.pagination.offset > 0 || canGoForward) && (
                <nav aria-label="Paginación de consultas registradas" className="mt-4 flex items-center justify-between gap-3">
                  <Button
                    disabled={currentWorkspace.pagination.offset === 0 || listLoading}
                    onClick={() => updateFilter("offset", String(Math.max(0, currentWorkspace.pagination.offset - currentWorkspace.pagination.limit)))}
                    type="button"
                    variant="outline"
                  >
                    <ArrowLeft aria-hidden="true" />Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">Página {Math.floor(currentWorkspace.pagination.offset / currentWorkspace.pagination.limit) + 1}</span>
                  <Button
                    disabled={!canGoForward || listLoading}
                    onClick={() => updateFilter("offset", String(nextOffset))}
                    type="button"
                    variant="outline"
                  >
                    Siguiente<ArrowRight aria-hidden="true" />
                  </Button>
                </nav>
              )}
            </section>
          </>
        )}
      </div>

      {bulkConfirmationAction !== null && (
        <BulkConfirmationDialog
          returnFocus={() => {
            const trigger = bulkDialogTriggerRef.current;
            if (trigger?.isConnected && !trigger.matches(":disabled")) trigger.focus();
            else screenRef.current?.focus();
          }}
          action={bulkConfirmationAction}
          count={selectedStagingIds.length}
          error={bulkError}
          submitting={bulkSubmitting}
          onClose={closeBulkConfirmation}
          onConfirm={() => void confirmBulkAction()}
        />
      )}

      {selectedStagingId !== null && (
        <ReviewSheet
          careers={careers}
          returnFocus={() => { if (lastTriggerRef.current?.isConnected) lastTriggerRef.current.focus(); else screenRef.current?.focus(); }}
          detail={reviewDetail}
          duplicateChoices={duplicateChoices}
          form={reviewForm}
          loading={reviewLoading}
          saving={reviewSaving}
          error={reviewError}
          success={reviewSuccess}
          dirty={reviewDirty}
          onClose={closeReview}
          onLoadMore={(offset) => void loadReview(selectedStagingId, offset, true)}
          onRetry={() => void loadReview(selectedStagingId)}
          onSave={(form, choices) => void saveReview(form, choices)}
          onFormChange={setReviewForm}
          onDuplicateChoice={(id, choice) => setDuplicateChoices((current) => ({ ...current, [id]: choice }))}
        />
      )}
    </>
  );
}
