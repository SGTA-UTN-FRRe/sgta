"use client";

import { CheckCircle2, Plus } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SafeTutorDetail, SafeTutorListItem } from "./tutor-service";
import type { TutorsCatalogOptions, TutorsScreenData, TutorsScreenState } from "./tutor-screen-types";
import type { FilterStatus, SheetMode, SheetState, StatusRequest, TutorFormValues, TutorFormSubmitOptions } from "./tutor-presentation-types";
import { TutorRequestError, getTutorErrorMessage, getFieldErrors, requestJson, matchesTutorFilters, findStateData, formatTutorCount } from "./tutor-screen-utils";
import { EmptyState, PageHeader, SystemState } from "@/shared/components";
import { cn } from "@/shared/utils";
import { TutorList, ActionLink } from "./tutor-table";
import { FilterToolbar } from "./tutor-filters";
import { TutorSheet } from "./tutor-sheet";
import { StatusConfirmation } from "./tutor-status-dialog";
export { tutorsStateFixtures } from "./tutor-screen-utils";
export type { TutorsCatalogOptions, TutorsScreenData, TutorsScreenState } from "./tutor-screen-types";

export interface TutorsScreenProps {
  data: TutorsScreenData;
  catalogOptions?: TutorsCatalogOptions;
  initialSearch?: string;
  requiredAction?: "catalog" | "cycle";
  state?: TutorsScreenState;
}

function InlineStateNotice({
  action,
  description,
  icon,
  title,
  tone,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
  tone: "danger" | "success" | "warning";
}) {
  const styles = {
    danger: "border-destructive/30 bg-muted/60",
    success: "border-success/30 bg-muted/60",
    warning: "border-warning/30 bg-muted/60",
  } as const;
  const iconStyles = {
    danger: "text-destructive",
    success: "text-success",
    warning: "text-warning",
  } as const;

  return (
    <div
      aria-live="polite"
      className={cn("mt-6 flex items-start gap-3 rounded-md border p-4", styles[tone])}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className={cn("mt-0.5 shrink-0", iconStyles[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

function readInitialFilter(name: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get(name) ?? "";
}

function normalizeInitialStatus(value: string): FilterStatus {
  return value === "active" || value === "inactive" ? value : "all";
}

export function TutorsScreen({
  catalogOptions,
  data,
  initialSearch,
  requiredAction = "cycle",
  state = "default",
}: TutorsScreenProps) {
  const [search, setSearch] = useState(() => initialSearch ?? readInitialFilter("search"));
  const [careerId, setCareerId] = useState(() => readInitialFilter("careerId"));
  const [status, setStatus] = useState<FilterStatus>(() =>
    normalizeInitialStatus(readInitialFilter("status")),
  );
  const [rows, setRows] = useState<SafeTutorListItem[]>(data.rows);
  const [screenState, setScreenState] = useState<TutorsScreenState>(state);
  const [listError, setListError] = useState<TutorRequestError | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [sheetDetail, setSheetDetail] = useState<SafeTutorDetail | null>(null);
  const [sheetDetailLoading, setSheetDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<TutorRequestError | null>(null);
  const [sheetError, setSheetError] = useState<TutorRequestError | null>(null);
  const [sheetFieldErrors, setSheetFieldErrors] = useState<Record<string, string>>({});
  const [sheetSaving, setSheetSaving] = useState(false);
  const [statusRequest, setStatusRequest] = useState<StatusRequest>(null);
  const [statusError, setStatusError] = useState<TutorRequestError | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const hasRequestedListRef = useRef(false);
  const detailRequestIdRef = useRef(0);

  const activeCatalogOptions = catalogOptions ?? {
    careers: [],
    subjects: [],
    scholarshipReferences: [],
    currentCycle: null,
  } satisfies TutorsCatalogOptions;

  const careers = activeCatalogOptions.careers;
  const hasActiveFilters = Boolean(search.trim() || careerId || status !== "all");

  useEffect(() => {
    // The public state prop is also used by state-fixture and recovery renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScreenState(state);
  }, [state]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (search.trim()) url.searchParams.set("search", search.trim());
      else url.searchParams.delete("search");
      if (careerId) url.searchParams.set("careerId", careerId);
      else url.searchParams.delete("careerId");
      if (status !== "all") url.searchParams.set("status", status);
      else url.searchParams.delete("status");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }

    const shouldFetch = hasRequestedListRef.current || hasActiveFilters || retryToken > 0;

    if (!shouldFetch) {
      return;
    }

    const controller = new AbortController();
    hasRequestedListRef.current = true;
    setScreenState("loading");
    setListError(null);
    const query = new URLSearchParams();

    if (search.trim()) query.set("search", search.trim());
    if (careerId) query.set("careerId", careerId);
    if (status !== "all") query.set("status", status.toUpperCase());

    void requestJson<{ tutors: SafeTutorListItem[] }>(
      `/api/admin/tutors${query.toString() === "" ? "" : `?${query.toString()}`}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setRows(result.tutors);
          setScreenState("default");
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setListError(error instanceof TutorRequestError ? error : new TutorRequestError("internal_server_error", 500));
          setScreenState("error");
        }
      });

    return () => controller.abort();
  }, [careerId, hasActiveFilters, retryToken, search, status]);

  const loadTutorDetail = useCallback(async (tutorId: string) => {
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    setSheetDetailLoading(true);
    setDetailError(null);
    setSheetError(null);
    setSheetDetail(null);

    try {
      const result = await requestJson<{ tutor: SafeTutorDetail }>(
        `/api/admin/tutors/${encodeURIComponent(tutorId)}`,
      );
      if (detailRequestIdRef.current === requestId) {
        setSheetDetail(result.tutor);
        setDetailError(null);
      }
    } catch (error) {
      if (detailRequestIdRef.current === requestId) {
        setDetailError(
          error instanceof TutorRequestError
            ? error
            : new TutorRequestError("internal_server_error", 500),
        );
      }
    } finally {
      if (detailRequestIdRef.current === requestId) {
        setSheetDetailLoading(false);
      }
    }
  }, []);

  const openSheet = useCallback(
    (mode: SheetMode, tutor: SafeTutorListItem | undefined, trigger: HTMLElement) => {
      lastTriggerRef.current = trigger;
      setSheet({ mode, tutor });
      setDetailError(null);
      setSheetError(null);
      setSheetFieldErrors({});
      if (mode === "add" || tutor === undefined) {
        detailRequestIdRef.current += 1;
        setSheetDetail(null);
        setSheetDetailLoading(false);
      } else {
        void loadTutorDetail(tutor.id);
      }
    },
    [loadTutorDetail],
  );

  const closeSheet = useCallback(() => {
    detailRequestIdRef.current += 1;
    setSheet(null);
    setSheetDetail(null);
    setDetailError(null);
    setSheetError(null);
    setSheetFieldErrors({});
    setSheetSaving(false);
  }, []);

  const updateRow = useCallback(
    (updatedTutor: SafeTutorListItem) => {
      setRows((previous) => {
        const index = previous.findIndex((tutor) => tutor.id === updatedTutor.id);
        const matchesFilters = matchesTutorFilters(
          updatedTutor,
          search,
          careerId,
          status,
        );

        if (!matchesFilters) {
          return previous.filter((tutor) => tutor.id !== updatedTutor.id);
        }

        if (index === -1) {
          return [updatedTutor, ...previous];
        }

        const next = [...previous];
        next[index] = updatedTutor;
        return next;
      });
    },
    [careerId, search, status],
  );

  const handleSheetSubmit = useCallback(
    async (values: TutorFormValues, options: TutorFormSubmitOptions) => {
      if (sheet === null || sheet.mode === "view") {
        return;
      }

      setSheetSaving(true);
      setSheetError(null);
      setSheetFieldErrors({});

      const cleanOptional = (value: string) => (value.trim() === "" ? null : value.trim());
      const basePayload = {
        firstName: values.firstName,
        lastName: values.lastName,
        preferredDisplayName: cleanOptional(values.preferredDisplayName),
        institutionalIdentifier: cleanOptional(values.institutionalIdentifier),
        applicationEmail: cleanOptional(values.applicationEmail),
      };
      const payload =
        sheet.mode === "add"
          ? {
              ...basePayload,
              primaryCareerId: values.primaryCareerId,
              subjectIds: values.subjectIds,
              cycleId: values.cycleId,
              scholarshipReferenceId: values.scholarshipReferenceId || null,
            }
          : {
              ...Object.fromEntries(
                options.changedFields.map((field) => [field, basePayload[field as keyof typeof basePayload]]),
              ),
              ...(options.changedFields.includes("primaryCareerId")
                ? { primaryCareerId: values.primaryCareerId }
                : {}),
              ...(options.subjectsChanged ? { subjectIds: values.subjectIds } : {}),
              ...(options.membershipChanged
                ? {
                    cycleId: values.cycleId,
                    scholarshipReferenceId: values.scholarshipReferenceId || null,
                  }
                : {}),
            };

      try {
        const result =
          sheet.mode === "add"
            ? await requestJson<{ tutor: SafeTutorDetail }>("/api/admin/tutors", {
                method: "POST",
                body: JSON.stringify(payload),
              })
            : await requestJson<{ tutor: SafeTutorDetail }>(
                `/api/admin/tutors/${encodeURIComponent(sheet.tutor!.id)}`,
                { method: "PATCH", body: JSON.stringify(payload) },
              );

        updateRow(result.tutor);
        closeSheet();
        setScreenState("success");
        setAnnouncement(
          sheet.mode === "add"
            ? "El tutor se agregó correctamente."
            : "Los datos del tutor se actualizaron correctamente.",
        );
      } catch (error) {
        const requestError =
          error instanceof TutorRequestError
            ? error
            : new TutorRequestError("internal_server_error", 500);
        setSheetError(requestError);
        setSheetFieldErrors(getFieldErrors(requestError));
      } finally {
        setSheetSaving(false);
      }
    },
    [closeSheet, sheet, updateRow],
  );

  const requestStatusChange = useCallback((tutor: SafeTutorListItem, trigger: HTMLElement) => {
    lastTriggerRef.current = trigger;
    setStatusError(null);
    setStatusRequest({ tutor, trigger });
  }, []);

  const confirmStatusChange = useCallback(async () => {
    if (statusRequest === null) {
      return;
    }

    setStatusSaving(true);
    setStatusError(null);

    try {
      const status = statusRequest.tutor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const result = await requestJson<{ tutor: SafeTutorDetail }>(
        `/api/admin/tutors/${encodeURIComponent(statusRequest.tutor.id)}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      updateRow(result.tutor);
      setStatusRequest(null);
      setScreenState("success");
      setAnnouncement(
        status === "INACTIVE"
          ? "El tutor se desactivó y sus antecedentes se conservaron."
          : "El tutor se reactivó correctamente.",
      );
    } catch (error) {
      setStatusError(error instanceof TutorRequestError ? error : new TutorRequestError("internal_server_error", 500));
    } finally {
      setStatusSaving(false);
    }
  }, [statusRequest, updateRow]);

  useEffect(() => {
    if (sheet !== null || statusRequest !== null || lastTriggerRef.current === null) {
      return;
    }

    if (document.contains(lastTriggerRef.current)) {
      lastTriggerRef.current.focus();
    } else {
      document.getElementById("tutor-search")?.focus();
    }
    lastTriggerRef.current = null;
  }, [sheet, statusRequest]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setCareerId("");
    setStatus("all");
  }, []);

  const retryList = useCallback(() => setRetryToken((value) => value + 1), []);
  const retryDetail = useCallback(() => {
    if (sheet?.tutor !== undefined) {
      void loadTutorDetail(sheet.tutor.id);
    }
  }, [loadTutorDetail, sheet]);

  const derivedState: TutorsScreenState =
    screenState === "default" || screenState === "success"
      ? rows.length === 0
        ? hasActiveFilters
          ? "search-empty"
          : "empty"
        : screenState
      : screenState;
  const stateData =
    listError !== null
      ? {
          state: "error" as const,
          title: "No se pudo cargar la lista",
          description: getTutorErrorMessage(listError, "Reintentar para volver a consultar los tutores."),
          actionLabel: "Reintentar",
        }
      : findStateData(derivedState, requiredAction);
  const headerAction =
    derivedState === "required-action" ? (
      <ActionLink href="/admin/settings" label={stateData?.actionLabel ?? "Configurar ciclo"} />
    ) : (
      <Button
        disabled={derivedState === "loading"}
        onClick={(event) => openSheet("add", undefined, event.currentTarget)}
        type="button"
      >
        <Plus aria-hidden="true" />
        {data.emptyAction}
      </Button>
    );

  return (
    <>
      <div
        aria-hidden={sheet !== null || statusRequest !== null ? true : undefined}
        data-slot="tutors-screen"
        data-state={derivedState}
      >
        <PageHeader action={headerAction} description={data.description} title="Tutores" />

        {screenState === "success" && (
          <InlineStateNotice
            description={announcement ?? "La información quedó actualizada."}
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            title="Cambios guardados"
            tone="success"
          />
        )}

        {announcement !== null && screenState !== "success" && (
          <div aria-live="polite" className="mt-6 flex items-start gap-3 rounded-md border border-info/30 bg-muted/60 p-4" role="status">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <p className="text-sm leading-6 text-foreground">{announcement}</p>
          </div>
        )}

        {derivedState === "error" && stateData && (
          <SystemState
            className="mt-4"
            action={<Button onClick={retryList} size="sm" type="button" variant="outline">{stateData.actionLabel ?? "Reintentar"}</Button>}
            description={stateData.description}
            title={stateData.title}
            variant="error"
          />
        )}

        {derivedState === "required-action" && stateData && (
          <SystemState
            className="mt-4"
            action={<ActionLink href="/admin/settings" label={stateData.actionLabel ?? "Configurar ciclo"} />}
            description={stateData.description}
            title={stateData.title}
            variant="required-action"
          />
        )}

        {derivedState !== "error" && derivedState !== "required-action" && (
          <>
            <FilterToolbar
              resultCount={rows.length}
              careerId={careerId}
              careerLabel={data.careerFilterLabel}
              careers={careers}
              onCareerChange={setCareerId}
              onClear={clearFilters}
              onSearchChange={setSearch}
              onStatusChange={setStatus}
              search={search}
              searchPlaceholder={data.searchPlaceholder}
              status={status}
              statusLabel={data.statusFilterLabel}
            />

            <p className="sr-only">
              {derivedState === "loading"
                ? "Preparando la lista de tutores…"
                : derivedState === "empty"
                  ? "Todavía no hay tutores cargados."
                  : derivedState === "search-empty"
                    ? "No hay resultados para la búsqueda actual."
                    : `Mostrando ${formatTutorCount(rows.length)}`}
            </p>

            {derivedState === "loading" && <TutorList rows={[]} loading onOpenSheet={openSheet} onRequestStatusChange={requestStatusChange} />}

            {derivedState === "empty" && (
              <div className="mt-4">
                <EmptyState
                  action={<Button onClick={(event) => openSheet("add", undefined, event.currentTarget)} type="button"><Plus aria-hidden="true" />{data.emptyAction}</Button>}
                  description="Agregar el primer tutor para comenzar a organizar la cobertura."
                  title={data.emptyTitle}
                />
              </div>
            )}

            {derivedState === "search-empty" && (
              <div className="mt-4">
                <EmptyState
                  action={<Button onClick={clearFilters} type="button" variant="outline">Limpiar filtros</Button>}
                  description={stateData?.description ?? "Probar con otro nombre o limpiar los filtros."}
                  title={stateData?.title ?? "No encontramos tutores"}
                />
              </div>
            )}

            {derivedState !== "loading" && derivedState !== "empty" && derivedState !== "search-empty" && (
              <TutorList
                onOpenSheet={openSheet}
                onRequestStatusChange={requestStatusChange}
                rows={rows}
              />
            )}
            <div className="mt-4">
              <ActionLink href="/admin/tutors/subjects" label="Ver materias" />
            </div>
          </>
        )}
      </div>

      <TutorSheet
        catalogOptions={activeCatalogOptions}
        detail={sheetDetail}
        detailError={detailError}
        detailLoading={sheetDetailLoading}
        fieldErrors={sheetFieldErrors}
        mode={sheet?.mode ?? null}
        onClose={closeSheet}
        onRetryDetail={retryDetail}
        onSubmit={handleSheetSubmit}
        open={sheet !== null}
        saving={sheetSaving}
        sheetError={sheetError}
        tutor={sheet?.tutor}
      />

      {statusRequest !== null && (
        <StatusConfirmation
          error={statusError}
          loading={statusSaving}
          onCancel={() => {
            setStatusRequest(null);
            setStatusError(null);
          }}
          onConfirm={() => void confirmStatusChange()}
          request={statusRequest}
        />
      )}
    </>
  );
}
