import { useCallback, useEffect, useRef, useState } from "react";
import type { ConsultationReviewDetail, ConsultationWorkspace } from "./consultation-validation";
import {
  initialEmptyWorkspace,
  filtersToSearchParams,
  mergeWorkspacePage,
  parseURLFilters,
  writeURLFilters,
  responseJSON,
  emptyReviewForm,
  initialDuplicateChoice,
  reviewFormsEqual,
  sourcePresentation,
  type BulkAction,
  type ConsultationFilterState,
  type ConsultationStatus,
  type ConsultationsScreenProps,
  type DuplicateChoice,
  type ReviewForm,
  type ConsultationSummary,
} from "./consultations-screen-utils";

export function useConsultationsWorkspace({ initialFilters, initialWorkspace, initialLoadError, initialFilterError, emptyWorkspace = initialEmptyWorkspace }: ConsultationsScreenProps) {
  const [filters, setFilters] = useState<ConsultationFilterState>(initialFilters);
  const [workspace, setWorkspace] = useState<ConsultationWorkspace | null>(initialWorkspace);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(initialLoadError ?? null);
  const [filterError, setFilterError] = useState(initialFilterError);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedStagingId, setSelectedStagingId] = useState<string | null>(null);
  const [reviewDetail, setReviewDetail] = useState<ConsultationReviewDetail | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm | null>(null);
  const [duplicateChoices, setDuplicateChoices] = useState<Record<string, DuplicateChoice>>({});
  const [duplicateBaseline, setDuplicateBaseline] = useState<Record<string, DuplicateChoice>>({});
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [selectedStagingIds, setSelectedStagingIds] = useState<string[]>([]);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkConfirmationAction, setBulkConfirmationAction] =
    useState<BulkAction | null>(null);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const bulkDialogTriggerRef = useRef<HTMLElement | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const listRequestRef = useRef<AbortController | null>(null);
  const reviewRequestRef = useRef(0);
  const initialRequestSkippedRef = useRef(false);
  const currentFiltersRef = useRef(filters);
  const filterKey = JSON.stringify(filters);
  const activeFilters = Boolean(
    filters.careerId ||
      filters.tutorId ||
      filters.fromDate ||
      filters.toDate ||
      filters.classification ||
      filters.suggestion !== "ALL" ||
      filters.search ||
      filters.status !== "ALL",
  );
  const hasVisibleRecords = (workspace?.rows.length ?? 0) > 0 || (workspace?.reviewQueue.length ?? 0) > 0;
  const screenState = listLoading || importing
    ? "loading"
    : workspace === null && listError
      ? "error"
      : listError !== null || (importError !== null && workspace?.import.status !== "FAILED")
        ? "error"
      : workspace?.import.status === "FAILED"
        ? "unavailable"
        : workspace?.import.status === "PARTIAL"
          ? "degraded"
          : hasVisibleRecords
              ? importMessage
                ? "success"
                : "default"
              : activeFilters
                ? "search-empty"
                : importMessage
                  ? "success"
                  : "empty";

  const fetchWorkspace = useCallback(
    async (nextFilters: ConsultationFilterState, signal?: AbortSignal) => {
      const query = filtersToSearchParams(nextFilters).toString();
      const response = await fetch(`/api/admin/consultations${query ? `?${query}` : ""}`, {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("list_unavailable");
      const nextWorkspace = await responseJSON<ConsultationWorkspace>(response);

      if (nextFilters.offset > 0) {
        const queueFilters = { ...nextFilters, offset: 0 };
        const queueQuery = filtersToSearchParams(queueFilters).toString();
        const queueResponse = await fetch(`/api/admin/consultations?${queueQuery}`, {
          cache: "no-store",
          signal,
        });
        if (!queueResponse.ok) throw new Error("list_unavailable");
        const queueWorkspace = await responseJSON<ConsultationWorkspace>(queueResponse);
        return { ...nextWorkspace, reviewQueue: queueWorkspace.reviewQueue };
      }

      return nextWorkspace;
    },
    [],
  );

  const refreshWorkspace = useCallback(
    async (nextFilters: ConsultationFilterState = filters) => {
      listRequestRef.current?.abort();
      const controller = new AbortController();
      listRequestRef.current = controller;
      setListLoading(true);
      setListError(null);

      try {
        const nextWorkspace = await fetchWorkspace(nextFilters, controller.signal);
        if (!controller.signal.aborted) {
          setWorkspace((current) => mergeWorkspacePage(current, nextWorkspace));
          setListError(null);
        }
      } catch {
        if (!controller.signal.aborted) {
          setListError("No se pudo cargar la lista de consultas. Reintentar.");
        }
      } finally {
        if (!controller.signal.aborted) setListLoading(false);
      }
    },
    [fetchWorkspace, filters],
  );

  useEffect(() => {
    // The server supplied the initial workspace; later resets still need a read.
    if (!initialRequestSkippedRef.current) {
      initialRequestSkippedRef.current = true;
      return;
    }

    const controller = new AbortController();
    listRequestRef.current?.abort();
    listRequestRef.current = controller;
    setListLoading(true);
    setListError(null);
    const timer = window.setTimeout(() => {
      void fetchWorkspace(filters, controller.signal)
        .then((nextWorkspace) => {
          if (!controller.signal.aborted) {
            setWorkspace((current) => mergeWorkspacePage(current, nextWorkspace));
            setListError(null);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setListError("No se pudo cargar la lista de consultas. Reintentar.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setListLoading(false);
        });
    }, 160);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchWorkspace, filterKey, filters, retryToken]);

  useEffect(() => {
    const parsed = parseURLFilters(window.location.search);
    if (parsed === null) {
      writeURLFilters(
        { status: "ALL", suggestion: "ALL", limit: 50, offset: 0 },
        true,
      );
      return;
    }
    writeURLFilters(parsed, true);
  }, []);

  useEffect(() => {
    function handlePopState() {
      const parsed = parseURLFilters(window.location.search);
      if (parsed === null) {
        const defaults: ConsultationFilterState = { status: "ALL", suggestion: "ALL", limit: 50, offset: 0 };
        writeURLFilters(defaults, true);
        setFilterError(true);
        currentFiltersRef.current = defaults;
        setFilters(defaults);
        return;
      }
      setFilterError(false);
      writeURLFilters(parsed, true);
      currentFiltersRef.current = parsed;
      setFilters(parsed);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!filterError) return;
    const defaults: ConsultationFilterState = { status: "ALL", suggestion: "ALL", limit: 50, offset: 0 };
    writeURLFilters(defaults, true);
  }, [filterError]);

  const updateFilter = useCallback(
    (key: keyof ConsultationFilterState, value: string, replace = false) => {
      const next = { ...filters, offset: 0 } as ConsultationFilterState;
      if (key === "status") next.status = (value || "ALL") as ConsultationStatus;
      else if (key === "limit") next.limit = Number(value || 50);
      else if (key === "offset") next.offset = Number(value || 0);
      else if (value.trim().length > 0) (next as Record<string, unknown>)[key] = value.trim();
      else delete (next as Record<string, unknown>)[key];

      setFilterError(false);
      setSelectedStagingIds([]);
      setBulkMessage(null);
      setBulkError(null);
      currentFiltersRef.current = next;
      setFilters(next);
      writeURLFilters(next, replace);
    },
    [filters],
  );

  const clearFilters = useCallback(() => {
    const defaults: ConsultationFilterState = { status: "ALL", suggestion: "ALL", limit: 50, offset: 0 };
    setFilterError(false);
    setSelectedStagingIds([]);
    setBulkMessage(null);
    setBulkError(null);
    currentFiltersRef.current = defaults;
    setFilters(defaults);
    writeURLFilters(defaults);
  }, []);

  const retryList = useCallback(() => setRetryToken((current) => current + 1), []);

  const loadReview = useCallback(
    async (stagingId: string, candidateOffset = 0, preserveForm = false): Promise<boolean> => {
      const requestId = reviewRequestRef.current + 1;
      reviewRequestRef.current = requestId;
      setReviewLoading(true);
      setReviewError(null);
      setReviewSuccess(null);

      try {
        const response = await fetch(
          `/api/admin/consultations/review/${encodeURIComponent(stagingId)}?candidateLimit=100&candidateOffset=${candidateOffset}`,
          { cache: "no-store" },
        );
        const body = await responseJSON<{ review?: ConsultationReviewDetail; error?: string }>(response);
        if (!response.ok || body.review === undefined) {
          throw new Error(body.error ?? "review_unavailable");
        }
        if (reviewRequestRef.current !== requestId) return false;

        setReviewDetail(body.review);
        if (!preserveForm) setReviewForm(emptyReviewForm(body.review));
        const withLoadedCandidates = (current: Record<string, DuplicateChoice>) => {
          const next = { ...current };
          for (const candidate of body.review!.duplicateCandidates) {
            if (Object.hasOwn(next, candidate.candidateId)) continue;
            next[candidate.candidateId] = initialDuplicateChoice(candidate);
          }
          return next;
        };
        setDuplicateChoices(withLoadedCandidates);
        setDuplicateBaseline(withLoadedCandidates);
        return true;
      } catch (error) {
        if (reviewRequestRef.current === requestId) {
          setReviewError(
            error instanceof Error && error.message === "not_found"
              ? "La consulta ya no está disponible. Actualizar la lista e intentar nuevamente."
              : "No se pudo cargar el detalle de la consulta. Reintentar.",
          );
        }
        return false;
      } finally {
        if (reviewRequestRef.current === requestId) setReviewLoading(false);
      }
    },
    [],
  );

  const openReview = useCallback(
    (stagingId: string, trigger: HTMLElement) => {
      lastTriggerRef.current = trigger;
      reviewRequestRef.current += 1;
      setSelectedStagingId(stagingId);
      setReviewDetail(null);
      setReviewForm(null);
      setDuplicateChoices({});
      setDuplicateBaseline({});
      setReviewError(null);
      setReviewSuccess(null);
      void loadReview(stagingId);
    },
    [loadReview],
  );

  const closeReview = useCallback(() => {
    reviewRequestRef.current += 1;
    setSelectedStagingId(null);
    setReviewDetail(null);
    setReviewForm(null);
    setReviewError(null);
    setReviewSuccess(null);
    if (lastTriggerRef.current?.isConnected) {
      lastTriggerRef.current.focus();
    } else {
      queueMicrotask(() => screenRef.current?.focus());
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    setImportError(null);
    setImportMessage(null);
    setAnnouncement("Actualizando consultas.");

    try {
      const response = await fetch("/api/admin/consultations/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxRows: 1000 }),
      });
      const body = await responseJSON<{
        outcome?: string;
        summary?: ConsultationSummary;
        error?: string;
      }>(response);

      if (body.summary) {
        setWorkspace((current) => current
          ? { ...current, import: body.summary! }
          : { ...emptyWorkspace, import: body.summary! });
      }

      if (!response.ok) {
        if (body.error === "import_unavailable") {
          setImportError("No se pudo acceder a la fuente de consultas.");
          setAnnouncement("La fuente no está disponible. Las consultas registradas siguen visibles.");
        } else if (body.error === "import_already_running") {
          setImportError("Ya hay una actualización en curso. Reintentar en unos momentos.");
          setAnnouncement("La actualización ya está en curso.");
        } else {
          setImportError("No se pudo actualizar la fuente. Reintentar.");
          setAnnouncement("No se pudo completar la actualización.");
        }
      } else {
        const summary = body.summary;
        setImportMessage(
          `Actualización completada: ${summary?.newRows ?? 0} nuevas, ${summary?.alreadyProcessedRows ?? 0} ya procesadas, ${summary?.reviewRows ?? 0} requieren revisión y ${summary?.errorRows ?? 0} con errores.`,
        );
        setAnnouncement("La lista de consultas quedó actualizada.");
      }

      await refreshWorkspace(currentFiltersRef.current);
    } catch {
      setImportError("No se pudo actualizar la fuente. Las consultas registradas siguen disponibles.");
      setAnnouncement("No se pudo completar la actualización.");
      await refreshWorkspace(currentFiltersRef.current);
    } finally {
      setImporting(false);
    }
  }, [emptyWorkspace, importing, refreshWorkspace]);

  const selectAllFiltered = useCallback(async () => {
    setSelectionLoading(true);
    setBulkError(null);
    setBulkMessage(null);

    try {
      const params = filtersToSearchParams({ ...filters, offset: 0 }).toString();
      const response = await fetch(
        `/api/admin/consultations/bulk${params ? `?${params}` : ""}`,
        { cache: "no-store" },
      );
      const selection = await responseJSON<{
        stagingIds?: string[];
        matchingCount?: number;
        error?: string;
      }>(response);
      if (
        !response.ok ||
        selection.stagingIds === undefined ||
        selection.matchingCount === undefined
      ) {
        throw new Error(selection.error ?? "selection_unavailable");
      }

      setSelectedStagingIds(selection.stagingIds);
      const message =
        selection.matchingCount === 0
          ? "No hay consultas pendientes con estos filtros."
          : selection.matchingCount > selection.stagingIds.length
            ? `Se seleccionaron ${selection.stagingIds.length} de ${selection.matchingCount} pendientes; quedan ${selection.matchingCount - selection.stagingIds.length} para otra tanda. Confirmar el lote y seleccionar la siguiente tanda para continuar.`
            : `Se seleccionaron ${selection.stagingIds.length} consultas pendientes.`;
      setBulkMessage(message);
      setAnnouncement(message);
    } catch {
      setBulkError("No se pudieron seleccionar las consultas filtradas. Intentar nuevamente.");
    } finally {
      setSelectionLoading(false);
    }
  }, [filters]);

  const toggleStagingSelection = useCallback(
    (stagingId: string) => {
      if (selectedStagingIds.includes(stagingId)) {
        setSelectedStagingIds(
          selectedStagingIds.filter((id) => id !== stagingId),
        );
      } else if (selectedStagingIds.length >= 500) {
        setBulkMessage("El máximo es 500 consultas por acción.");
      } else {
        setSelectedStagingIds([...selectedStagingIds, stagingId]);
      }
      setBulkError(null);
    },
    [selectedStagingIds],
  );

  const openBulkConfirmation = useCallback(
    (action: BulkAction, trigger: HTMLElement) => {
      bulkDialogTriggerRef.current = trigger;
      setBulkError(null);
      setBulkConfirmationAction(action);
    },
    [],
  );

  const closeBulkConfirmation = useCallback(() => {
    setBulkConfirmationAction(null);
    setBulkError(null);
  }, []);

  const confirmBulkAction = useCallback(async () => {
    if (bulkConfirmationAction === null || selectedStagingIds.length === 0) {
      return;
    }

    setBulkSubmitting(true);
    setBulkError(null);
    try {
      const response = await fetch("/api/admin/consultations/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: bulkConfirmationAction,
          stagingIds: selectedStagingIds,
        }),
      });
      const result = await responseJSON<{
        confirmedCount?: number;
        skippedCount?: number;
        error?: string;
      }>(response);
      if (
        !response.ok ||
        result.confirmedCount === undefined ||
        result.skippedCount === undefined
      ) {
        throw new Error(result.error ?? "bulk_action_failed");
      }

      const message = `${result.confirmedCount} confirmadas, ${result.skippedCount} omitidas.`;
      setBulkMessage(message);
      setAnnouncement(message);
      setSelectedStagingIds([]);
      setBulkConfirmationAction(null);
      await refreshWorkspace(currentFiltersRef.current);
    } catch {
      setBulkError("No se pudo completar la consolidación masiva. Intentar nuevamente.");
    } finally {
      setBulkSubmitting(false);
    }
  }, [
    bulkConfirmationAction,
    refreshWorkspace,
    selectedStagingIds,
  ]);

  const saveReview = useCallback(
    async (form: ReviewForm, choices: Record<string, DuplicateChoice>) => {
      if (selectedStagingId === null || reviewDetail === null) return;
      setReviewSaving(true);
      setReviewError(null);
      setReviewSuccess(null);

      const duplicateDecisions = Object.entries(choices)
        .filter((entry): entry is [string, "DUPLICATE" | "NOT_DUPLICATE"] =>
          entry[1] === "DUPLICATE" || entry[1] === "NOT_DUPLICATE",
        )
        .map(([candidateId, decision]) => ({ candidateId, decision }));
      const body = {
        expectedVersion: reviewDetail.reviewVersion,
        careerId: form.careerId,
        tutorId: form.tutorId,
        consultationDate: form.consultationDate,
        classification: form.classification,
        subjectId: form.classification === "SUBJECT" ? form.subjectId || null : null,
        acknowledgedAnomalies: form.acknowledgedAnomalies,
        ...(duplicateDecisions.length > 0 ? { duplicateDecisions } : {}),
      };

      try {
        const response = await fetch(
          `/api/admin/consultations/review/${encodeURIComponent(selectedStagingId)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const result = await responseJSON<{
          outcome?: "review_saved" | "consolidated" | "duplicate";
          review?: ConsultationReviewDetail;
          error?: string;
        }>(response);

        if (!response.ok || result.review === undefined) {
          if (response.status === 409) {
            setReviewDetail(null);
            setReviewForm(null);
            setDuplicateChoices({});
            setDuplicateBaseline({});
            const refreshed = await loadReview(selectedStagingId, 0);
            setReviewError(refreshed
              ? "La consulta cambió o una decisión de duplicado entró en conflicto. Se actualizó el detalle; revisar los datos antes de guardar otra vez."
              : "La consulta cambió, pero no se pudo actualizar el detalle. Reintentar la carga antes de guardar.");
            await refreshWorkspace(currentFiltersRef.current);
            return;
          }
          if (response.status === 404) {
            setReviewError("La consulta ya no está disponible. Actualizar la lista e intentar nuevamente.");
            return;
          }
          setReviewError("No se pudo guardar la revisión. Revisar los campos e intentar nuevamente.");
          return;
        }

        setReviewDetail(result.review);
        setReviewForm(emptyReviewForm(result.review));
        setDuplicateChoices({});
        setDuplicateBaseline({});
        setReviewSuccess(
          result.outcome === "consolidated"
            ? "La consulta quedó consolidada."
            : result.outcome === "duplicate"
              ? "La consulta quedó identificada como duplicada."
              : "La revisión quedó guardada.",
        );
        await refreshWorkspace(currentFiltersRef.current);
      } catch {
        setReviewError("No se pudo guardar la revisión. Revisar la conexión e intentar nuevamente.");
      } finally {
        setReviewSaving(false);
      }
    },
    [loadReview, refreshWorkspace, reviewDetail, selectedStagingId],
  );

  const reviewDirty =
    reviewDetail !== null &&
    reviewForm !== null &&
    !["CONSOLIDATED", "DUPLICATE"].includes(reviewDetail.status) &&
    (!reviewFormsEqual(reviewForm, emptyReviewForm(reviewDetail)) ||
      Object.entries(duplicateChoices).some(([id, choice]) => choice !== (duplicateBaseline[id] ?? "")));
  const currentWorkspace = workspace ?? emptyWorkspace;
  const status = sourcePresentation(currentWorkspace.import);
  const lastUpdate = currentWorkspace.import.lastSuccessfulAt;
  const canImport = !importing;
  const currentPageStart = currentWorkspace.totalRows === 0
    ? 0
    : currentWorkspace.pagination.offset + 1;
  const currentPageEnd = Math.min(
    currentWorkspace.pagination.offset + currentWorkspace.rows.length,
    currentWorkspace.totalRows,
  );
  const nextOffset = currentWorkspace.pagination.offset + currentWorkspace.pagination.limit;
  const canGoForward = nextOffset < currentWorkspace.totalRows;
  const visibleQueue = currentWorkspace.reviewQueue;
  const visibleRows = currentWorkspace.rows;
  const visibleQueueIds = visibleQueue.map((item) => item.stagingId);
  const selectedVisibleCount = visibleQueueIds.filter((id) =>
    selectedStagingIds.includes(id),
  ).length;
  const allVisibleSelected =
    visibleQueueIds.length > 0 &&
    selectedVisibleCount === visibleQueueIds.length;
  const someVisibleSelected =
    selectedVisibleCount > 0 && !allVisibleSelected;
  const toggleVisibleQueue = () => {
    if (allVisibleSelected) {
      setSelectedStagingIds((current) =>
        current.filter((id) => !visibleQueueIds.includes(id)),
      );
      return;
    }
    setSelectedStagingIds((current) =>
      [...new Set([...current, ...visibleQueueIds])].slice(0, 500),
    );
  };


  return {
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
    activeFilters,
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
    bulkDialogTriggerRef
  };
}
