"use client";

import { CheckCircle2, Plus } from "lucide-react";
import { type FormEvent, useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { SystemState } from "@/shared/components/system-state";
import type { SafeHourBalance, SafeHourMovement, SafeHourBulkMovementResult } from "./hour-service";
import type { HourMovementOperation, HoursScreenData, HoursScreenState, HoursStateDetail } from "./hours-screen-types";
import { ActionLink, HoursNotice } from "./hours-notice";
import { HoursFilters } from "./hours-filters";
import { BalanceList } from "./hours-table";
import { MovementDialog } from "./movement-dialog";
import { MovementHistorySheet } from "./movement-history-sheet";
import {
  applyMovementsToBalances, defaultStateDetails, filterBalances, firstMovementCategoryId,
  formatActivityKind, formatTutorCount, getHoursErrorMessage, historyByTutor, mergeHistory,
  requestJson, sortMovements, type BalanceFilter, type HourWorkspaceResponse,
} from "./hours-screen-utils";

export interface HoursScreenProps {
  data: HoursScreenData;
  initialErrorMessage?: string;
  state?: HoursScreenState;
  stateDetail?: HoursStateDetail;
}

export function HoursScreen({
  data,
  initialErrorMessage,
  state = "default",
  stateDetail,
}: HoursScreenProps) {
  const [workspace, setWorkspace] = useState<HourWorkspaceResponse>({
    currentCycle: data.currentCycle,
    balances: data.balances,
    eligibleTutors: data.eligibleTutors,
    categories: data.categories,
  });
  const [historyCache, setHistoryCache] = useState<Record<string, SafeHourMovement[]>>(() =>
    historyByTutor(data.history),
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BalanceFilter>("all");
  const [category, setCategory] = useState("");
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [historyBalance, setHistoryBalance] = useState<SafeHourBalance | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mutationSuccess, setMutationSuccess] = useState(false);
  const [selectedTutorIds, setSelectedTutorIds] = useState<string[]>(() =>
    data.eligibleTutors.map((tutor) => tutor.id),
  );
  const [operation, setOperation] = useState<HourMovementOperation>("MOVEMENT");
  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [movementCategory, setMovementCategory] = useState(() =>
    firstMovementCategoryId(data.categories),
  );
  const [durationHours, setDurationHours] = useState("01");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [movementDate, setMovementDate] = useState(data.currentCycle?.startDate ?? "");
  const [movementNote, setMovementNote] = useState("");
  const movementTriggerRef = useRef<HTMLElement | null>(null);
  const historyTriggerRef = useRef<HTMLElement | null>(null);

  const screenState = mutationSuccess && state === "default" ? "success" : state;
  const stateData = stateDetail ?? defaultStateDetails[screenState];
  const history = useMemo(
    () => Object.values(historyCache).flatMap((entries) => entries),
    [historyCache],
  );
  const filteredBalances = useMemo(
    () => filterBalances(workspace.balances, history, { category, search, status }),
    [category, history, search, status, workspace.balances],
  );
  const hasActiveFilters = Boolean(search || category || status !== "all");
  const shouldShowSearchEmpty =
    screenState === "search-empty" ||
    (screenState === "default" && hasActiveFilters && filteredBalances.length === 0);

  const openMovementDialog = useCallback((trigger: HTMLElement) => {
    movementTriggerRef.current = trigger;
    setAnnouncement(null);
    setMutationSuccess(false);
    setOperationError(null);
    setMovementDialogOpen(true);
  }, []);

  const closeMovementDialog = useCallback(() => {
    setMovementDialogOpen(false);
    setOperationError(null);
    const trigger = movementTriggerRef.current;

    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
        movementTriggerRef.current = null;
      });
    }
  }, []);

  const loadHistory = useCallback(async (balance: SafeHourBalance) => {
    if (balance.cycle.id.length === 0) {
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await requestJson<{ movements: SafeHourMovement[] }>(
        `/api/admin/hours/movements?cycleId=${encodeURIComponent(balance.cycle.id)}&tutorId=${encodeURIComponent(balance.tutor.id)}&limit=200`,
      );
      setHistoryCache((current) => ({
        ...current,
        [balance.tutor.id]: sortMovements(response.movements),
      }));
    } catch (error) {
      setHistoryError(getHoursErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = useCallback(
    (balance: SafeHourBalance, trigger: HTMLElement) => {
      historyTriggerRef.current = trigger;
      setHistoryBalance(balance);
      void loadHistory(balance);
    },
    [loadHistory],
  );

  const closeHistory = useCallback(() => {
    setHistoryBalance(null);
    setHistoryError(null);
    const trigger = historyTriggerRef.current;

    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
        historyTriggerRef.current = null;
      });
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus("all");
    setCategory("");
    setAnnouncement("Los filtros se limpiaron y la selección visible volvió a quedar explícita.");
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedTutorIds((currentSelection) => {
      const eligibleIds = workspace.eligibleTutors.map((tutor) => tutor.id);
      const allSelected =
        eligibleIds.length > 0 && currentSelection.length === eligibleIds.length;

      return allSelected ? [] : eligibleIds;
    });
  }, [workspace.eligibleTutors]);

  const handleToggleTutor = useCallback((tutorId: string) => {
    setSelectedTutorIds((currentSelection) =>
      currentSelection.includes(tutorId)
        ? currentSelection.filter((selectedId) => selectedId !== tutorId)
        : [...currentSelection, tutorId],
    );
  }, []);

  const handleOperationChange = useCallback(
    (nextOperation: HourMovementOperation) => {
      setOperation(nextOperation);

      if (nextOperation === "RECOVERY") {
        setDirection("CREDIT");
        setMovementCategory(
          workspace.categories.find((option) => option.activityKind === "RECOVERY")?.id ?? "",
        );
        return;
      }

      const currentCategory = workspace.categories.find(
        (option) => option.id === movementCategory,
      );
      setMovementCategory(
        currentCategory?.activityKind === "RECOVERY"
          ? firstMovementCategoryId(workspace.categories)
          : movementCategory,
      );
    },
    [movementCategory, workspace.categories],
  );

  const handleCategoryChange = useCallback(
    (nextCategory: string) => {
      setMovementCategory(nextCategory);
      const selected = workspace.categories.find((option) => option.id === nextCategory);

      if (selected?.activityKind) {
        setDirection("CREDIT");
      }
    },
    [workspace.categories],
  );

  const refreshWorkspaceAndHistory = useCallback(async (cycleId: string) => {
    const nextWorkspace = await requestJson<HourWorkspaceResponse>("/api/admin/hours");
    const nextHistory = await requestJson<{ movements: SafeHourMovement[] }>(
      `/api/admin/hours/movements?cycleId=${encodeURIComponent(cycleId)}&limit=200`,
    );
    setWorkspace(nextWorkspace);
    setHistoryCache(historyByTutor(nextHistory.movements));
    setSelectedTutorIds(nextWorkspace.eligibleTutors.map((tutor) => tutor.id));
  }, []);

  const handleMovementSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const cycleId = workspace.currentCycle?.id;

      if (!cycleId || submitting) {
        return;
      }

      setSubmitting(true);
      setOperationError(null);

      const payload = {
        categoryId: movementCategory,
        cycleId,
        direction: operation === "RECOVERY" ? "CREDIT" : direction,
        duration: {
          hours: Number(durationHours),
          minutes: Number(durationMinutes),
        },
        movementDate,
        note: movementNote.trim() === "" ? null : movementNote.trim(),
        operation,
        tutorIds: selectedTutorIds,
      } as const;

      let result: SafeHourBulkMovementResult;

      try {
        result = await requestJson<SafeHourBulkMovementResult>(
          "/api/admin/hours/movements",
          {
            body: JSON.stringify(payload),
            method: "POST",
          },
        );
      } catch (error) {
        setOperationError(`No se registró ningún movimiento. ${getHoursErrorMessage(error)}`);
        setSubmitting(false);
        return;
      }

      setHistoryCache((current) => mergeHistory(current, result.movements));
      setWorkspace((current) => ({
        ...current,
        balances: applyMovementsToBalances(current.balances, result.movements),
      }));

      let refreshWarning: string | null = null;

      try {
        await refreshWorkspaceAndHistory(cycleId);
      } catch {
        refreshWarning =
          "No se pudo actualizar la vista completa; volver a cargar Horas para consultar el saldo actualizado.";
      }

      const selectedCategory = workspace.categories.find(
        (option) => option.id === movementCategory,
      );
      const origin = result.origin
        ? formatActivityKind(result.origin.kind)
        : selectedCategory?.activityKind
          ? formatActivityKind(selectedCategory.activityKind)
          : "Carga manual";
      const affectedCount = result.movements.length;
      const mutationAnnouncement = `Se registraron movimientos para ${formatTutorCount(affectedCount)}. Origen: ${origin}.`;

      setAnnouncement(
        refreshWarning === null
          ? mutationAnnouncement
          : `${mutationAnnouncement} ${refreshWarning}`,
      );
      setMutationSuccess(true);
      setOperation("MOVEMENT");
      setDirection("CREDIT");
      setMovementCategory(firstMovementCategoryId(workspace.categories));
      setDurationHours("01");
      setDurationMinutes("30");
      setMovementDate(workspace.currentCycle?.startDate ?? "");
      setMovementNote("");
      setSubmitting(false);
      closeMovementDialog();
    },
    [
      closeMovementDialog,
      direction,
      durationHours,
      durationMinutes,
      movementCategory,
      movementDate,
      movementNote,
      operation,
      refreshWorkspaceAndHistory,
      selectedTutorIds,
      submitting,
      workspace.categories,
      workspace.currentCycle?.id,
      workspace.currentCycle?.startDate,
    ],
  );

  const currentHistoryEntries = historyBalance
    ? historyCache[historyBalance.tutor.id] ?? []
    : [];
  const headerStateDetail = stateData ?? defaultStateDetails.error!;
  const headerAction =
    screenState === "required-action" ? (
      <ActionLink
        href={headerStateDetail.actionHref ?? "/admin/settings"}
        label={headerStateDetail.actionLabel ?? "Configurar ciclo"}
      />
    ) : (
      <div className="flex flex-wrap gap-2">
        <ActionLink href="/admin/hours/movements" label="Ver movimientos" />
        <Button
          disabled={screenState === "loading" || workspace.categories.length === 0 || workspace.eligibleTutors.length === 0}
          onClick={(event) => openMovementDialog(event.currentTarget)}
          type="button"
        >
          <Plus aria-hidden="true" />
          Registrar movimiento
        </Button>
      </div>
    );

  return (
    <>
      <div
        data-slot="hours-screen"
        data-state={screenState}
      >
        <PageHeader action={headerAction} description={data.description} title="Horas" />

        {screenState === "success" && (
          <HoursNotice
            description={
              announcement ?? "La transacción se completó y el saldo se actualizó."
            }
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            title="Movimiento registrado"
            tone="success"
          />
        )}

        {announcement && screenState !== "success" && (
          <div
            aria-live="polite"
            className="mt-6 flex items-start gap-3 rounded-md border border-info/30 bg-muted/60 p-4"
            role="status"
          >
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <p className="text-sm leading-6 text-foreground">{announcement}</p>
          </div>
        )}

        {screenState === "error" && (
          <SystemState
            action={
              <ActionLink
                href={headerStateDetail.actionHref ?? "/admin/hours"}
                label={headerStateDetail.actionLabel ?? "Reintentar"}
              />
            }
            description={initialErrorMessage ?? headerStateDetail.description}
            title={headerStateDetail.title}
            variant="error"
          />
        )}

        {screenState === "required-action" && (
          <SystemState
            action={
              <ActionLink
                href={headerStateDetail.actionHref ?? "/admin/settings"}
                label={headerStateDetail.actionLabel ?? "Configurar ciclo"}
              />
            }
            description={headerStateDetail.description}
            title={headerStateDetail.title}
            variant="required-action"
          />
        )}

        {screenState !== "error" && screenState !== "required-action" && (
          <>
            <HoursFilters
              categories={workspace.categories}
              category={category}
              categoryLabel={data.categoryFilterLabel}
              disabled={screenState === "loading" || screenState === "empty"}
              resultCount={filteredBalances.length}
              onCategoryChange={setCategory}
              onClear={clearFilters}
              onSearchChange={setSearch}
              onStatusChange={setStatus}
              search={search}
              searchPlaceholder={data.searchPlaceholder}
              status={status}
              statusLabel={data.statusFilterLabel}
            />

            <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
              {screenState === "loading"
                ? "Preparando los saldos del ciclo…"
                : screenState === "empty"
                  ? "Todavía no hay saldos cargados."
                  : shouldShowSearchEmpty
                    ? "No hay resultados para la búsqueda actual."
                    : null}
            </p>

            {screenState === "loading" && <BalanceList balances={[]} loading onHistory={openHistory} />}

            {screenState === "empty" && (
              <div className="mt-4">
                <EmptyState
                  action={
                    <Button
                      onClick={(event) => openMovementDialog(event.currentTarget)}
                      type="button"
                    >
                      <Plus aria-hidden="true" />
                      {stateData?.actionLabel ?? "Registrar movimiento"}
                    </Button>
                  }
                  description={stateData?.description ?? "Todavía no hay saldos cargados."}
                  title={stateData?.title ?? "Todavía no hay saldos"}
                />
              </div>
            )}

            {shouldShowSearchEmpty && (
              <div className="mt-4">
                <EmptyState
                  action={
                    <Button onClick={clearFilters} type="button" variant="outline">
                      Limpiar filtros
                    </Button>
                  }
                  description={stateData?.description ?? "Probar con otro nombre o limpiar los filtros."}
                  title={stateData?.title ?? "No encontramos balances"}
                />
              </div>
            )}

            {screenState !== "loading" &&
              screenState !== "empty" &&
              !shouldShowSearchEmpty && (
                <BalanceList balances={filteredBalances} onHistory={openHistory} />
              )}
          </>
        )}
      </div>

      <MovementDialog
        category={movementCategory}
        data={{ ...data, ...workspace, history: history }}
        date={movementDate}
        direction={direction}
        durationHours={durationHours}
        durationMinutes={durationMinutes}
        errorMessage={operationError}
        note={movementNote}
        onCategoryChange={handleCategoryChange}
        onClose={closeMovementDialog}
        onDateChange={setMovementDate}
        onDirectionChange={setDirection}
        onDurationHoursChange={setDurationHours}
        onDurationMinutesChange={setDurationMinutes}
        onNoteChange={setMovementNote}
        onOperationChange={handleOperationChange}
        onSubmit={handleMovementSubmit}
        onToggleAll={handleToggleAll}
        onToggleTutor={handleToggleTutor}
        open={movementDialogOpen}
        operation={operation}
        selectedTutorIds={selectedTutorIds}
        submitting={submitting}
        returnFocusRef={movementTriggerRef}
      />

      <MovementHistorySheet
        balance={historyBalance}
        entries={currentHistoryEntries}
        error={historyError}
        loading={historyLoading}
        onClose={closeHistory}
        onRetry={() => {
          if (historyBalance) {
            void loadHistory(historyBalance);
          }
        }}
        returnFocusRef={historyTriggerRef}
        open={Boolean(historyBalance)}
      />
    </>
  );
}
