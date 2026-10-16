"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import type { SafeHourMovement, SafeHourReversalResult } from "./hour-service";
import type { HoursScreenState, HoursStateDetail } from "./hours-screen-types";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { SystemState } from "@/shared/components/system-state";
import { ActionLink, HoursNotice } from "./hours-notice";
import { HistoryFilters } from "./movement-history-filters";
import { MovementHistoryTable } from "./movement-history-table";
import { ReversalDialog } from "./movement-reversal-dialog";
import {
  defaultStateDetails, formatMovementCount, formatOrigin, getErrorMessage,
  normalizeSearch, requestJson, sortMovements,
  type DirectionFilter, type ReversalFilter, type SourceFilter,
} from "./movement-history-utils";

export type MovementHistoryScreenState = HoursScreenState;

export interface MovementHistoryScreenProps {
  cycles: SafeAdministrativeCycle[];
  dataDescription: string;
  initialCategoryId?: string;
  initialCycleId: string | null;
  initialErrorMessage?: string;
  initialMovements: SafeHourMovement[];
  initialState?: MovementHistoryScreenState;
  initialStateDetail?: HoursStateDetail;
  initialTutorId?: string;
}

export function MovementHistoryScreen({
  cycles,
  dataDescription,
  initialCategoryId,
  initialCycleId,
  initialErrorMessage,
  initialMovements,
  initialState = "default",
  initialStateDetail,
  initialTutorId,
}: MovementHistoryScreenProps) {
  const [movements, setMovements] = useState<SafeHourMovement[]>(() =>
    sortMovements(initialMovements),
  );
  const [selectedCycleId, setSelectedCycleId] = useState(initialCycleId ?? "");
  const [selectedTutorId, setSelectedTutorId] = useState(initialTutorId ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialCategoryId ?? "",
  );
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<DirectionFilter>("ALL");
  const [source, setSource] = useState<SourceFilter>("ALL");
  const [reversal, setReversal] = useState<ReversalFilter>("ALL");
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(
    initialErrorMessage ?? null,
  );
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<SafeHourMovement | null>(null);
  const [reversalError, setReversalError] = useState<string | null>(null);
  const [reversingMovementId, setReversingMovementId] = useState<string | null>(null);
  const reversalTriggerRef = useRef<HTMLElement | null>(null);

  const filterTutors = useMemo(() => {
    const tutors = new Map<string, SafeHourMovement["tutor"]>();

    for (const movement of movements) {
      tutors.set(movement.tutor.id, movement.tutor);
    }

    return [...tutors.values()].sort((left, right) =>
      left.formalName.localeCompare(right.formalName, "es-AR"),
    );
  }, [movements]);
  const filterCategories = useMemo(() => {
    const categories = new Map<string, SafeHourMovement["category"]>();

    for (const movement of movements) {
      categories.set(movement.category.id, movement.category);
    }

    return [...categories.values()].sort((left, right) =>
      left.name.localeCompare(right.name, "es-AR"),
    );
  }, [movements]);
  const filteredMovements = useMemo(() => {
    const normalizedSearch = normalizeSearch(search.trim());

    return movements.filter((movement) => {
      const searchableText = normalizeSearch(
        [
          movement.tutor.formalName,
          movement.tutor.careerName,
          movement.category.name,
          movement.cycle.name,
          movement.note ?? "",
          movement.actor.displayName,
          formatOrigin(movement),
        ].join(" "),
      );
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesTutor = !selectedTutorId || movement.tutor.id === selectedTutorId;
      const matchesCategory =
        !selectedCategoryId || movement.category.id === selectedCategoryId;
      const matchesDirection =
        direction === "ALL" || movement.direction === direction;
      const matchesSource =
        source === "ALL" ||
        (source === "MANUAL"
          ? movement.origin === null
          : movement.origin?.kind === source);
      const matchesReversal =
        reversal === "ALL" || movement.reversalState === reversal;

      return (
        matchesSearch &&
        matchesTutor &&
        matchesCategory &&
        matchesDirection &&
        matchesSource &&
        matchesReversal
      );
    });
  }, [direction, movements, reversal, search, selectedCategoryId, selectedTutorId, source]);
  const hasActiveFilters = Boolean(
    search ||
      selectedTutorId ||
      selectedCategoryId ||
      direction !== "ALL" ||
      source !== "ALL" ||
      reversal !== "ALL",
  );
  const isLoading = loading || initialState === "loading";
  const blockedByInitialState =
    initialState === "error" || initialState === "required-action";
  const screenState: MovementHistoryScreenState =
    blockedByInitialState
      ? initialState
      : isLoading
        ? "loading"
        : requestError !== null && movements.length === 0
          ? "error"
          : mutationSuccess
            ? "success"
            : movements.length === 0
              ? hasActiveFilters
                ? "search-empty"
                : "empty"
              : hasActiveFilters && filteredMovements.length === 0
                ? "search-empty"
                : "default";
  const stateDetail =
    initialStateDetail ??
    defaultStateDetails[screenState] ??
    defaultStateDetails.error!;
  const backHref = selectedTutorId
    ? `/admin/hours#balance-${encodeURIComponent(selectedTutorId)}`
    : "/admin/hours";

  const syncHistoryUrl = useCallback((
    nextCycleId: string,
    nextTutorId: string,
    nextCategoryId: string,
  ) => {
    const params = new URLSearchParams();

    if (nextCycleId) {
      params.set("cycleId", nextCycleId);
    }

    if (nextTutorId) {
      params.set("tutorId", nextTutorId);
    }

    if (nextCategoryId) {
      params.set("categoryId", nextCategoryId);
    }

    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `/admin/hours/movements${query ? `?${query}` : ""}`,
    );
  }, []);

  useEffect(() => {
    syncHistoryUrl(selectedCycleId, selectedTutorId, selectedCategoryId);
  }, [selectedCategoryId, selectedCycleId, selectedTutorId, syncHistoryUrl]);

  const loadCycle = useCallback(async (cycleId: string, preserveFilters: boolean) => {
    if (!cycleId) {
      setMovements([]);
      return;
    }

    setLoading(true);
    setRequestError(null);
    setMutationSuccess(false);
    setAnnouncement(null);

    if (!preserveFilters) {
      setSelectedTutorId("");
      setSelectedCategoryId("");
    }

    try {
      const response = await requestJson<{ movements: SafeHourMovement[] }>(
        `/api/admin/hours/movements?cycleId=${encodeURIComponent(cycleId)}&limit=200`,
      );
      setMovements(sortMovements(response.movements));
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const openReversal = useCallback(
    (movement: SafeHourMovement, trigger: HTMLElement) => {
      reversalTriggerRef.current = trigger;
      setMutationSuccess(false);
      setAnnouncement(null);
      setReversalError(null);
      setReversalTarget(movement);
    },
    [],
  );

  const closeReversal = useCallback(() => {
    setReversalTarget(null);
    setReversalError(null);
  }, []);

  const handleReverse = useCallback(async () => {
    if (reversalTarget === null || reversingMovementId !== null) {
      return;
    }

    const targetId = reversalTarget.id;
    setReversingMovementId(targetId);
    setReversalError(null);

    try {
      const result = await requestJson<SafeHourReversalResult>(
        `/api/admin/hours/movements/${encodeURIComponent(targetId)}/reverse`,
        { method: "POST" },
      );
      setMovements((current) =>
        sortMovements([
          ...current.filter(
            (movement) =>
              movement.id !== result.original.id && movement.id !== result.reversal.id,
          ),
          result.original,
          result.reversal,
        ]),
      );
      setAnnouncement(
        "El movimiento fue revertido. El original permanece visible y la compensación quedó registrada.",
      );
      setMutationSuccess(true);
      setReversingMovementId(null);
      closeReversal();
    } catch (error) {
      setReversalError(
        `No se registró la reversión. ${getErrorMessage(error)}`,
      );
      setReversingMovementId(null);
    }
  }, [closeReversal, reversalTarget, reversingMovementId]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedTutorId("");
    setSelectedCategoryId("");
    setDirection("ALL");
    setSource("ALL");
    setReversal("ALL");
    setAnnouncement("Los filtros se limpiaron y el historial completo volvió a quedar visible.");
  }, []);

  return (
    <>
      <div data-slot="movement-history-screen" data-state={screenState}>
        <PageHeader
          breadcrumbs={[{ href: backHref, label: "Horas" }, { label: "Movimientos" }]}
          description={dataDescription}
          title="Movimientos"
        />
        {screenState === "success" && <HoursNotice
          title="Reversión registrada" tone="success"
          icon={<CheckCircle2 aria-hidden="true" className="size-5" />}
          description={announcement ?? "La reversión se registró y el historial se actualizó."}
        />}
        {announcement && screenState !== "success" && <p role="status" className="sr-only">{announcement}</p>}
        {(screenState === "error" || screenState === "required-action") ? (
          <SystemState
            variant={screenState} title={stateDetail.title}
            description={requestError ?? stateDetail.description}
            action={<ActionLink href={stateDetail.actionHref ?? "/admin/hours/movements"} label={stateDetail.actionLabel ?? "Reintentar"} />}
          />
        ) : (
          <div className="space-y-4 pt-6">
            {requestError && movements.length > 0 && <SystemState
              variant="error" title="No se pudo actualizar el historial" description={requestError}
              action={<Button onClick={() => void loadCycle(selectedCycleId, true)} variant="outline">Reintentar</Button>}
            />}
            <fieldset disabled={isLoading} className="min-w-0">
              <legend className="sr-only">Filtros de movimientos</legend>
              <HistoryFilters
                categories={filterCategories} categoryId={selectedCategoryId}
                cycles={cycles} cycleId={selectedCycleId} defaultCycleId={initialCycleId ?? ""}
                direction={direction} onCategoryChange={setSelectedCategoryId}
                onClear={clearFilters} hasActiveFilters={hasActiveFilters} resultCount={filteredMovements.length} disabled={isLoading}
                onCycleChange={(nextCycleId) => {
                  setSelectedCycleId(nextCycleId);
                  syncHistoryUrl(nextCycleId, "", "");
                  void loadCycle(nextCycleId, false);
                }}
                onDirectionChange={setDirection} onReversalChange={setReversal}
                onSearchChange={setSearch} onSourceChange={setSource} onTutorChange={setSelectedTutorId}
                reversal={reversal} search={search} source={source} tutors={filterTutors} tutorId={selectedTutorId}
              />
            </fieldset>
            <p aria-live="polite" className="sr-only">
              {isLoading ? "Consultando movimientos…" : filteredMovements.length === 0 && hasActiveFilters
                ? "No hay resultados para los filtros actuales." : `Mostrando ${formatMovementCount(filteredMovements.length)}`}
            </p>
            <MovementHistoryTable
              movements={filteredMovements} loading={isLoading}
              onReverse={openReversal} reverseDisabled={reversingMovementId !== null}
              empty={<EmptyState title={hasActiveFilters ? "No encontramos movimientos" : "Todavía no hay movimientos"}
                description={hasActiveFilters ? "Probar con otro filtro o limpiar la búsqueda actual." : "Los movimientos registrados en el ciclo seleccionado aparecerán aquí."}
                action={hasActiveFilters ? <Button onClick={clearFilters} variant="outline">Limpiar filtros</Button> : undefined}
              />}
            />
          </div>
        )}
      </div>
      <ReversalDialog
        error={reversalError} onClose={closeReversal}
        onConfirm={() => void handleReverse()} submitting={reversingMovementId !== null} target={reversalTarget}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const trigger = reversalTriggerRef.current;
          if (trigger?.isConnected) trigger.focus();
          else document.querySelector<HTMLElement>("h1")?.focus();
          reversalTriggerRef.current = null;
        }}
      />
    </>
  );
}
