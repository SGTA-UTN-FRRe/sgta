"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ConsultationFilters,
  ConsultationAnomalyCode,
  ConsultationListItem,
  ConsultationReviewDetail,
  ConsultationWorkspace,
} from "@/features/consultations/consultation-validation";
import type { SafeCareer } from "@/features/tutors/tutor-service";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge, type StatusBadgeVariant } from "@/shared/components/status-badge";

type ReviewQueueItem = ConsultationWorkspace["reviewQueue"][number];
type Classification = ConsultationReviewDetail["classification"];
type DuplicateChoice = "" | "DUPLICATE" | "NOT_DUPLICATE" | "PEER_DUPLICATE";
type ConsultationStatus = ConsultationFilters["status"];

type ConsultationFilterState = {
  status: ConsultationStatus;
  careerId?: string;
  tutorId?: string;
  fromDate?: string;
  toDate?: string;
  classification?: "SUBJECT" | "GENERAL" | "PENDING_CLASSIFICATION";
  search?: string;
  limit: number;
  offset: number;
};

type ReviewForm = {
  careerId: string;
  tutorId: string;
  consultationDate: string;
  classification: Classification;
  subjectId: string;
  acknowledgedAnomalies: ConsultationAnomalyCode[];
};

type ConsultationSummary = ConsultationWorkspace["import"];

type ConsultationsScreenProps = {
  careers: SafeCareer[];
  tutors: { id: string; name: string; status: "ACTIVE" | "INACTIVE" }[];
  initialFilters: ConsultationFilters;
  initialWorkspace: ConsultationWorkspace | null;
  initialLoadError?: string;
  initialFilterError: boolean;
  emptyWorkspace?: ConsultationWorkspace;
};

const filterKeys = new Set([
  "status",
  "careerId",
  "tutorId",
  "fromDate",
  "toDate",
  "classification",
  "search",
  "limit",
  "offset",
]);

const anomalyReasons: Record<string, string> = {
  MISSING_SOURCE_ROW_KEY: "La fila no tiene una clave estable en la fuente.",
  MISSING_CAREER: "No se informó una carrera.",
  UNRESOLVED_CAREER: "No se pudo asociar la carrera con el catálogo.",
  AMBIGUOUS_CAREER: "La carrera coincide con más de una opción del catálogo.",
  MISSING_STUDENT_FIRST_NAME: "Falta el nombre de la persona estudiante.",
  MISSING_STUDENT_LAST_NAME: "Falta el apellido de la persona estudiante.",
  INVALID_CONSULTATION_DATE: "La fecha de la consulta no es válida.",
  MISSING_TUTOR: "No se informó un tutor.",
  UNRESOLVED_TUTOR: "No se pudo asociar el tutor con el catálogo.",
  AMBIGUOUS_TUTOR: "El tutor coincide con más de una opción del catálogo.",
  MISSING_ACADEMIC_STAGE: "No se informó el tramo académico.",
  MISSING_MODALITY: "No se informó la modalidad.",
  MISSING_TOPIC: "No se informó el tema de la consulta.",
  POSSIBLE_DUPLICATE: "La consulta podría estar repetida.",
  SOURCE_ROW_CHANGED: "El contenido de la fila cambió desde la importación anterior.",
};

const statusLabels: Record<string, string> = {
  PENDING_REVIEW: "Pendiente de revisión",
  READY: "Lista para consolidar",
  CONSOLIDATED: "Consolidada",
  DUPLICATE: "Duplicada",
};

const anomalyFieldResolution: Record<string, string> = {
  MISSING_CAREER: "careerId",
  UNRESOLVED_CAREER: "careerId",
  AMBIGUOUS_CAREER: "careerId",
  MISSING_TUTOR: "tutorId",
  UNRESOLVED_TUTOR: "tutorId",
  AMBIGUOUS_TUTOR: "tutorId",
  INVALID_CONSULTATION_DATE: "consultationDate",
};

const initialEmptyWorkspace: ConsultationWorkspace = {
  rows: [],
  reviewQueue: [],
  pendingReviewCount: 0,
  totalRows: 0,
  import: {
    runId: null,
    status: null,
    startedAt: null,
    completedAt: null,
    lastSuccessfulAt: null,
    newRows: 0,
    alreadyProcessedRows: 0,
    reviewRows: 0,
    duplicateCandidates: 0,
    errorRows: 0,
    errorCode: null,
  },
  pagination: { limit: 50, offset: 0 },
};

function filtersToSearchParams(filters: ConsultationFilterState) {
  const params = new URLSearchParams();

  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.careerId) params.set("careerId", filters.careerId);
  if (filters.tutorId) params.set("tutorId", filters.tutorId);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.classification) params.set("classification", filters.classification);
  if (filters.search) params.set("search", filters.search);
  if (filters.limit !== 50) params.set("limit", String(filters.limit));
  if (filters.offset > 0) params.set("offset", String(filters.offset));

  return params;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function parseURLFilters(search: string): ConsultationFilterState | null {
  const params = new URLSearchParams(search);
  const values: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    if (!filterKeys.has(key) || Object.hasOwn(values, key)) return null;
    values[key] = value;
  }

  const status = values.status ?? "ALL";
  const allowedStatuses = ["ALL", "PENDING_REVIEW", "READY", "CONSOLIDATED", "DUPLICATE"];
  const classification = values.classification;
  if (!allowedStatuses.includes(status)) return null;
  if (
    classification !== undefined &&
    !["SUBJECT", "GENERAL", "PENDING_CLASSIFICATION"].includes(classification)
  ) return null;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (values.careerId && !uuid.test(values.careerId)) return null;
  if (values.tutorId && !uuid.test(values.tutorId)) return null;
  if (values.fromDate && !validDate(values.fromDate)) return null;
  if (values.toDate && !validDate(values.toDate)) return null;
  if (values.fromDate && values.toDate && values.fromDate > values.toDate) return null;
  if (values.search !== undefined && (values.search.trim().length === 0 || values.search.length > 120)) return null;

  const limit = Number(values.limit ?? 50);
  const offset = Number(values.offset ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  if (!Number.isInteger(offset) || offset < 0 || offset > 100_000) return null;

  return {
    status: status as ConsultationStatus,
    ...(values.careerId ? { careerId: values.careerId } : {}),
    ...(values.tutorId ? { tutorId: values.tutorId } : {}),
    ...(values.fromDate ? { fromDate: values.fromDate } : {}),
    ...(values.toDate ? { toDate: values.toDate } : {}),
    ...(classification ? { classification: classification as ConsultationFilterState["classification"] } : {}),
    ...(values.search ? { search: values.search.trim() } : {}),
    limit,
    offset,
  };
}

function writeURLFilters(filters: ConsultationFilterState, replace = false) {
  const params = filtersToSearchParams(filters);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const url = `${window.location.pathname}${suffix}${window.location.hash}`;

  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

async function responseJSON<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.valueOf())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: value.length > 10 ? "short" : "medium",
    ...(value.length > 10 ? { timeStyle: "short" as const } : {}),
    timeZone: "UTC",
  }).format(date).normalize("NFKC");
}

function fullName(firstName: string | null | undefined, lastName: string | null | undefined) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Sin nombre informado";
}

function selectClassName() {
  return "flex h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
}

function sourcePresentation(summary: ConsultationSummary) {
  if (summary.status === "FAILED") {
    return {
      label: "Fuente no disponible",
      description: "No se pudo acceder a la fuente de consultas.",
      variant: "danger" as const,
    };
  }
  if (summary.status === "PARTIAL") {
    return {
      label: "Actualización parcial",
      description: "La fuente respondió, pero algunas filas requieren atención.",
      variant: "warning" as const,
    };
  }
  if (summary.status === "RUNNING") {
    return {
      label: "Actualización en curso",
      description: "La importación todavía está procesando las filas.",
      variant: "info" as const,
    };
  }
  if (summary.status === "SUCCEEDED") {
    return {
      label: "Fuente actualizada",
      description: "La última actualización terminó correctamente.",
      variant: "success" as const,
    };
  }
  return {
    label: "Sin actualizaciones",
    description: "Todavía no se registró una actualización de la fuente.",
    variant: "neutral" as const,
  };
}

function statusVariant(status: string): StatusBadgeVariant {
  if (status === "CONSOLIDATED") return "success";
  if (status === "PENDING_REVIEW") return "warning";
  if (status === "DUPLICATE") return "neutral";
  return "info";
}

function anomalyLabel(code: string) {
  return anomalyReasons[code] ?? "La fila requiere revisión antes de consolidarse.";
}

function emptyReviewForm(detail: ConsultationReviewDetail): ReviewForm {
  return {
    careerId: detail.normalized.careerId ?? "",
    tutorId: detail.normalized.tutorId ?? "",
    consultationDate: detail.normalized.consultationDate ?? "",
    classification: detail.classification,
    subjectId: detail.canonical?.subject
      ? detail.references.subjects.find((subject) => subject.name === detail.canonical?.subject)?.id ?? ""
      : "",
    acknowledgedAnomalies: [...detail.acknowledgedAnomalies],
  };
}

function mergeWorkspacePage(
  current: ConsultationWorkspace | null,
  next: ConsultationWorkspace,
) {
  if (next.pagination.offset === 0) return next;
  return {
    ...next,
    reviewQueue: current?.reviewQueue ?? next.reviewQueue,
  };
}

export function ConsultationsScreen({
  careers,
  tutors,
  initialFilters,
  initialWorkspace,
  initialLoadError,
  initialFilterError,
  emptyWorkspace = initialEmptyWorkspace,
}: ConsultationsScreenProps) {
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
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const listRequestRef = useRef<AbortController | null>(null);
  const reviewRequestRef = useRef(0);
  const initialFilterKey = useRef(JSON.stringify(initialFilters));
  const currentFiltersRef = useRef(filters);
  const filterKey = JSON.stringify(filters);
  const activeFilters = Boolean(
    filters.careerId ||
      filters.tutorId ||
      filters.fromDate ||
      filters.toDate ||
      filters.classification ||
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
    if (filterKey === initialFilterKey.current && retryToken === 0) return;

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
      writeURLFilters({ status: "ALL", limit: 50, offset: 0 }, true);
      return;
    }
    writeURLFilters(parsed, true);
  }, []);

  useEffect(() => {
    function handlePopState() {
      const parsed = parseURLFilters(window.location.search);
      if (parsed === null) {
        const defaults: ConsultationFilterState = { status: "ALL", limit: 50, offset: 0 };
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
    const defaults: ConsultationFilterState = { status: "ALL", limit: 50, offset: 0 };
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
      currentFiltersRef.current = next;
      setFilters(next);
      writeURLFilters(next, replace);
    },
    [filters],
  );

  const clearFilters = useCallback(() => {
    const defaults: ConsultationFilterState = { status: "ALL", limit: 50, offset: 0 };
    setFilterError(false);
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
        setDuplicateChoices((current) => {
          const next = { ...current };
          for (const candidate of body.review!.duplicateCandidates) {
            if (Object.hasOwn(next, candidate.candidateId)) continue;
            next[candidate.candidateId] = candidate.decision === "PENDING"
              ? ""
              : candidate.isCurrentDuplicate
                ? "DUPLICATE"
                : candidate.decision === "DUPLICATE"
                  ? "PEER_DUPLICATE"
                  : "NOT_DUPLICATE";
          }
          return next;
        });
        return true;
      } catch (error) {
        if (reviewRequestRef.current === requestId) {
          setReviewError(
            error instanceof Error && error.message === "not_found"
              ? "La consulta ya no está disponible. Actualizá la lista e intentá nuevamente."
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
          setImportError("Ya hay una actualización en curso. Reintentá en unos momentos.");
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
            const refreshed = await loadReview(selectedStagingId, 0);
            setReviewError(refreshed
              ? "La consulta cambió o una decisión de duplicado entró en conflicto. Se actualizó la ficha; revisá los datos antes de guardar otra vez."
              : "La consulta cambió, pero no se pudo actualizar la ficha. Reintentá cargar el detalle antes de guardar.");
            await refreshWorkspace(currentFiltersRef.current);
            return;
          }
          if (response.status === 404) {
            setReviewError("La consulta ya no está disponible. Actualizá la lista e intentá nuevamente.");
            return;
          }
          setReviewError("No se pudo guardar la revisión. Revisá los campos e intentá nuevamente.");
          return;
        }

        setReviewDetail(result.review);
        setReviewForm(emptyReviewForm(result.review));
        setDuplicateChoices({});
        setReviewSuccess(
          result.outcome === "consolidated"
            ? "La consulta quedó consolidada."
            : result.outcome === "duplicate"
              ? "La consulta quedó identificada como duplicada."
              : "La revisión quedó guardada.",
        );
        await refreshWorkspace(currentFiltersRef.current);
      } catch {
        setReviewError("No se pudo guardar la revisión. Revisá la conexión e intentá nuevamente.");
      } finally {
        setReviewSaving(false);
      }
    },
    [loadReview, refreshWorkspace, reviewDetail, selectedStagingId],
  );

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

  return (
    <>
      <div
        aria-hidden={selectedStagingId !== null ? true : undefined}
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
          className="mt-5 grid gap-4 rounded-md border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
          data-state={currentWorkspace.import.status === "FAILED" ? "unavailable" : currentWorkspace.import.status === "PARTIAL" ? "degraded" : "ready"}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 text-foreground-secondary" aria-hidden="true">
              {currentWorkspace.import.status === "FAILED" || currentWorkspace.import.status === "PARTIAL"
                ? <AlertTriangle className="h-5 w-5" />
                : <CheckCircle2 className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-foreground">Estado de la importación</h2>
                <StatusBadge label={status.label} variant={status.variant} />
              </div>
              <p className="mt-1 text-sm text-foreground-secondary">{status.description}</p>
              <p className="mt-1 text-xs text-foreground-muted">
                Última actualización correcta: {lastUpdate ? formatDate(lastUpdate) : "Sin registros"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm sm:min-w-52">
            <span className="text-foreground-secondary">Pendientes de revisión</span>
            <strong className="text-right tabular-nums">{currentWorkspace.pendingReviewCount}</strong>
            <span className="text-foreground-secondary">Filas con errores</span>
            <strong className="text-right tabular-nums">{currentWorkspace.import.errorRows}</strong>
          </div>
        </section>

        {importError && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-surface/60 p-3 text-sm text-foreground" role="alert">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <span>{importError}</span>
          </div>
        )}
        {importMessage && (
          <div className="mt-4 rounded-md border border-success/30 bg-success-surface/60 p-3 text-sm text-foreground" role="status">
            <p>{importMessage}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-secondary">
              <span>Nuevas: {currentWorkspace.import.newRows}</span>
              <span>Ya procesadas: {currentWorkspace.import.alreadyProcessedRows}</span>
              <span>Para revisar: {currentWorkspace.import.reviewRows}</span>
              <span>Errores: {currentWorkspace.import.errorRows}</span>
            </div>
          </div>
        )}
        {announcement && !importMessage && !importError && (
          <p aria-live="polite" className="sr-only" role="status">{announcement}</p>
        )}
        {filterError && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning-surface/60 p-3 text-sm" role="alert">
            <span>Los filtros de la dirección no son válidos. Se muestran todas las consultas.</span>
            <Button onClick={clearFilters} size="sm" type="button" variant="outline">Limpiar filtros</Button>
          </div>
        )}
        {listError && workspace !== null && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-surface/60 p-3 text-sm" role="alert">
            <span>{listError} Se conservan los datos que ya estaban disponibles.</span>
            <Button onClick={retryList} size="sm" type="button" variant="outline">Reintentar</Button>
          </div>
        )}

        <section aria-label="Filtros de consultas" className="mt-6 rounded-md border border-border bg-surface p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Search aria-hidden="true" className="h-4 w-4 text-foreground-secondary" />
            <h2 className="font-semibold text-foreground">Filtrar consultas</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
              Estado
              <select className={selectClassName()} value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
                <option value="ALL">Todos</option>
                <option value="PENDING_REVIEW">Pendientes de revisión</option>
                <option value="READY">Listas para consolidar</option>
                <option value="CONSOLIDATED">Consolidadas</option>
                <option value="DUPLICATE">Duplicadas</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
              Carrera
              <select className={selectClassName()} value={filters.careerId ?? ""} onChange={(event) => updateFilter("careerId", event.target.value)}>
                <option value="">Todas las carreras</option>
                {careers.map((career) => <option key={career.id} value={career.id}>{career.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
              Tutor
              <select className={selectClassName()} value={filters.tutorId ?? ""} onChange={(event) => updateFilter("tutorId", event.target.value)}>
                <option value="">Todos los tutores</option>
                {tutors.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.name}{tutor.status === "INACTIVE" ? " · Inactivo" : ""}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
              Desde
              <Input aria-label="Fecha desde" type="date" value={filters.fromDate ?? ""} onChange={(event) => updateFilter("fromDate", event.target.value)} />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
              Hasta
              <Input aria-label="Fecha hasta" type="date" value={filters.toDate ?? ""} onChange={(event) => updateFilter("toDate", event.target.value)} />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
              Clasificación
              <select className={selectClassName()} value={filters.classification ?? ""} onChange={(event) => updateFilter("classification", event.target.value)}>
                <option value="">Todas</option>
                <option value="SUBJECT">Materia</option>
                <option value="GENERAL">General / Varias</option>
                <option value="PENDING_CLASSIFICATION">Pendiente de clasificación</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary sm:col-span-2 xl:col-span-4">
              Buscar
              <Input
                aria-label="Buscar consultas"
                autoComplete="off"
                maxLength={120}
                onChange={(event) => updateFilter("search", event.target.value, true)}
                placeholder="Estudiante, carrera, tutor o tema"
                type="search"
                value={filters.search ?? ""}
              />
            </label>
            <div className="flex items-end sm:col-span-2 xl:col-span-2">
              <Button className="w-full sm:w-auto" onClick={clearFilters} type="button" variant="outline">Limpiar filtros</Button>
            </div>
          </div>
        </section>

        <p aria-live="polite" className="mt-4 min-h-5 text-sm text-foreground-secondary" role="status">
          {listLoading
            ? <><LoaderCircle aria-hidden="true" className="mr-2 inline h-4 w-4 animate-spin" />Actualizando resultados…</>
            : screenState === "loading"
              ? "Cargando consultas…"
              : listError && workspace === null
                ? "No se pudieron cargar las consultas."
                : `${currentWorkspace.totalRows} consultas registradas · ${currentWorkspace.pendingReviewCount} pendientes de revisión`}
        </p>

        {screenState === "error" && workspace === null && (
          <div className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-danger/30 bg-danger-surface/50 p-5" role="alert">
              <div>
                <h2 className="font-semibold text-foreground">No se pudo cargar la lista</h2>
                <p className="mt-1 text-sm text-foreground-secondary">{listError ?? "Reintentar para volver a consultar las consultas registradas."}</p>
              </div>
              <Button onClick={retryList} type="button" variant="outline">Reintentar</Button>
            </div>
          </div>
        )}
        {screenState === "loading" && workspace === null && <LoadingWorkspace />}

        {workspace !== null && (
          <>
            <section aria-labelledby="pending-reviews-heading" className="mt-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground" id="pending-reviews-heading">Pendientes de revisión</h2>
                <span className="text-sm text-foreground-secondary">{currentWorkspace.pendingReviewCount} en total</span>
              </div>
              {visibleQueue.length > 0 ? (
                <div className="grid gap-3">
                  {visibleQueue.map((item) => (
                    <ReviewQueueCard key={item.stagingId} item={item} onOpen={openReview} />
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-border px-4 py-5 text-sm text-foreground-secondary">
                  {filters.status === "PENDING_REVIEW" ? "No hay consultas pendientes con estos filtros." : "No hay consultas pendientes en este resultado."}
                </p>
              )}
            </section>

            <section aria-labelledby="canonical-consultations-heading" className="mt-7">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground" id="canonical-consultations-heading">Consultas registradas</h2>
                {currentWorkspace.totalRows > 0 && (
                  <span className="text-sm text-foreground-secondary">Mostrando {currentPageStart}–{currentPageEnd} de {currentWorkspace.totalRows}</span>
                )}
              </div>
              {visibleRows.length > 0 ? (
                <ConsultationList rows={visibleRows} onOpen={openReview} />
              ) : filters.status !== "PENDING_REVIEW" ? (
                <EmptyState
                  action={screenState === "search-empty"
                    ? <Button onClick={clearFilters} type="button" variant="outline">Limpiar filtros</Button>
                    : undefined}
                  description={screenState === "search-empty"
                    ? "Probá con otros términos o quitá alguno de los filtros."
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
                  <span className="text-sm text-foreground-secondary">Página {Math.floor(currentWorkspace.pagination.offset / currentWorkspace.pagination.limit) + 1}</span>
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

      {selectedStagingId !== null && (
        <ReviewSheet
          detail={reviewDetail}
          duplicateChoices={duplicateChoices}
          form={reviewForm}
          loading={reviewLoading}
          saving={reviewSaving}
          error={reviewError}
          success={reviewSuccess}
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

function LoadingWorkspace() {
  return (
    <div aria-label="Cargando consultas" className="mt-5 grid gap-3" role="status">
      <span className="sr-only">Cargando consultas…</span>
      {[0, 1, 2].map((item) => (
        <div aria-hidden="true" className="h-20 animate-pulse rounded-md border border-border bg-surface-subtle" key={item} />
      ))}
    </div>
  );
}

function ReviewQueueCard({ item, onOpen }: { item: ReviewQueueItem; onOpen: (id: string, trigger: HTMLElement) => void }) {
  const name = fullName(item.studentFirstName, item.studentLastName);
  const unresolved = item.anomalyFlags.filter((flag) => !item.acknowledgedAnomalies.includes(flag));

  return (
    <article className="grid gap-4 rounded-md border border-warning/30 bg-warning-surface/30 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{name}</h3>
          <StatusBadge label={statusLabels[item.status] ?? "Pendiente"} variant="warning" />
        </div>
        <p className="mt-1 text-sm text-foreground-secondary">
          {formatDate(item.consultationDate)} · {item.career ?? "Carrera sin resolver"} · {item.tutor ?? "Tutor sin resolver"}
        </p>
        {unresolved.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-foreground">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>{unresolved.map(anomalyLabel).join(" ")}</span>
          </p>
        )}
        <p className="mt-1 text-xs text-foreground-secondary">Clasificación: {classificationLabel(item.classification)}</p>
      </div>
      <Button
        className="w-full sm:w-auto"
        onClick={(event) => onOpen(item.stagingId, event.currentTarget)}
        type="button"
        variant="outline"
      >
        Revisar a {name}
      </Button>
    </article>
  );
}

function ConsultationList({ rows, onOpen }: { rows: ConsultationListItem[]; onOpen: (id: string, trigger: HTMLElement) => void }) {
  return (
    <>
      <ul className="grid gap-3 md:hidden" aria-label="Consultas registradas">
        {rows.map((row) => (
          <li className="rounded-md border border-border bg-surface p-4" key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{fullName(row.studentFirstName, row.studentLastName)}</p>
                <p className="mt-1 text-sm text-foreground-secondary">{formatDate(row.consultationDate)} · {row.tutor}</p>
                <p className="mt-1 text-sm text-foreground-secondary">{row.rawTopic ?? "Tema no informado"}</p>
              </div>
              <StatusBadge label={statusLabels[row.status] ?? row.status} variant={statusVariant(row.status)} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-foreground-secondary">{classificationLabel(row.classification)}{row.subject ? ` · ${row.subject}` : ""}</span>
              <Button onClick={(event) => onOpen(row.stagingId, event.currentTarget)} size="sm" type="button" variant="outline">Ver detalle</Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden rounded-md border border-border bg-surface md:block">
        <Table>
          <caption className="sr-only">Consultas registradas con fecha, estudiante, carrera, tutor, tema, clasificación y estado</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Fecha</TableHead>
              <TableHead scope="col">Estudiante</TableHead>
              <TableHead className="hidden xl:table-cell" scope="col">Carrera</TableHead>
              <TableHead scope="col">Tutor</TableHead>
              <TableHead className="hidden xl:table-cell" scope="col">Tema</TableHead>
              <TableHead scope="col">Clasificación</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col"><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">{formatDate(row.consultationDate)}</TableCell>
                <TableCell>
                  <div className="font-medium">{fullName(row.studentFirstName, row.studentLastName)}</div>
                  {row.studentContact && <a aria-label={`Contacto de ${fullName(row.studentFirstName, row.studentLastName)}`} className="text-xs text-primary underline-offset-4 hover:underline" href={`mailto:${encodeURIComponent(row.studentContact)}`}>{row.studentContact}</a>}
                </TableCell>
                <TableCell className="hidden max-w-56 truncate xl:table-cell">{row.career}</TableCell>
                <TableCell>{row.tutor}</TableCell>
                <TableCell className="hidden max-w-64 truncate xl:table-cell">{row.rawTopic ?? "Sin tema"}</TableCell>
                <TableCell>{classificationLabel(row.classification)}{row.subject ? <span className="block text-xs text-foreground-secondary">{row.subject}</span> : null}</TableCell>
                <TableCell><StatusBadge label={statusLabels[row.status] ?? row.status} variant={statusVariant(row.status)} /></TableCell>
                <TableCell><Button aria-label={`Ver detalle de ${fullName(row.studentFirstName, row.studentLastName)}`} onClick={(event) => onOpen(row.stagingId, event.currentTarget)} size="sm" type="button" variant="outline">Ver detalle</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function classificationLabel(classification: string) {
  if (classification === "SUBJECT") return "Materia";
  if (classification === "GENERAL") return "General / Varias";
  return "Pendiente de clasificación";
}

function ReviewSheet({
  detail,
  duplicateChoices,
  form,
  loading,
  saving,
  error,
  success,
  onClose,
  onLoadMore,
  onRetry,
  onSave,
  onFormChange,
  onDuplicateChoice,
}: {
  detail: ConsultationReviewDetail | null;
  duplicateChoices: Record<string, DuplicateChoice>;
  form: ReviewForm | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  onClose: () => void;
  onLoadMore: (offset: number) => void;
  onRetry: () => void;
  onSave: (form: ReviewForm, choices: Record<string, DuplicateChoice>) => void;
  onFormChange: (form: ReviewForm | null) => void;
  onDuplicateChoice: (candidateId: string, choice: DuplicateChoice) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const readOnly = detail !== null && ["CONSOLIDATED", "DUPLICATE"].includes(detail.status);
  const subjects = detail?.references.subjects.filter(
    (subject) => subject.careerId === form?.careerId,
  ) ?? [];
  const candidatePageEnd = detail
    ? detail.duplicateCandidatesOffset + detail.duplicateCandidates.length
    : 0;
  const pendingVisibleCandidates = detail?.duplicateCandidates.filter(
    (candidate) => candidate.decision === "PENDING" && !duplicateChoices[candidate.candidateId],
  ).length ?? 0;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.querySelector<HTMLButtonElement>("[data-review-close]")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function updateForm<K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) {
    if (form === null) return;
    onFormChange({ ...form, [key]: value });
    setFieldError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form === null || detail === null) return;
    if (!form.careerId || !form.tutorId || !validDate(form.consultationDate)) {
      setFieldError("Seleccioná una carrera, un tutor y una fecha válida.");
      return;
    }
    if (form.classification === "SUBJECT" && !form.subjectId) {
      setFieldError("Seleccioná una materia para esta clasificación.");
      return;
    }
    const unacknowledged = detail.anomalyFlags.filter(
      (anomaly) => !form.acknowledgedAnomalies.includes(anomaly),
    );
    if (unacknowledged.length > 0) {
      setFieldError("Revisá y confirmá cada observación antes de guardar.");
      return;
    }
    if (pendingVisibleCandidates > 0) {
      setFieldError("Indicá si cada posible duplicado mostrado es duplicado o no.");
      return;
    }
    setFieldError(null);
    onSave(form, duplicateChoices);
  }

  const rawAndNormalized: { label: string; raw: string | null | undefined; normalized: string | null | undefined }[] = detail
    ? [
        { label: "Carrera", raw: detail.sourceRow.career, normalized: detail.normalized.career },
        { label: "Estudiante", raw: [detail.sourceRow.studentFirstName, detail.sourceRow.studentLastName].filter(Boolean).join(" "), normalized: [detail.normalized.studentFirstName, detail.normalized.studentLastName].filter(Boolean).join(" ") },
        { label: "Fecha", raw: detail.sourceRow.consultationDate, normalized: detail.normalized.consultationDate },
        { label: "Tutor", raw: detail.sourceRow.tutor, normalized: detail.normalized.tutor },
        { label: "Tramo académico", raw: detail.sourceRow.academicStage, normalized: detail.normalized.academicStage },
        { label: "Modalidad", raw: detail.sourceRow.modality, normalized: detail.normalized.modality },
        { label: "Tema", raw: detail.sourceRow.topic, normalized: detail.normalized.topic },
        { label: "Contacto", raw: detail.sourceRow.contact, normalized: detail.normalized.contact },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/35 motion-reduce:transition-none" data-slot="consultation-review-overlay">
      <div
        aria-labelledby="consultation-review-title"
        aria-modal="true"
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-border bg-canvas shadow-dialog"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border bg-surface px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground" id="consultation-review-title">
              {detail ? `Detalle de ${fullName(detail.normalized.studentFirstName ?? detail.sourceRow.studentFirstName, detail.normalized.studentLastName ?? detail.sourceRow.studentLastName)}` : "Revisión de consulta"}
            </h2>
            <p className="mt-1 text-sm text-foreground-secondary">Comparar la fila original con los valores normalizados.</p>
          </div>
          <Button aria-label="Cerrar detalle" data-review-close onClick={onClose} size="icon" type="button" variant="ghost">
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {loading && (
            <div aria-live="polite" className="flex items-center gap-2 rounded-md border border-border bg-surface p-4 text-sm text-foreground-secondary" role="status">
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />Cargando detalle de la consulta…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger-surface/60 p-4" role="alert">
              <p className="text-sm text-foreground">{error}</p>
              <Button className="mt-3" onClick={onRetry} size="sm" type="button" variant="outline">Reintentar</Button>
            </div>
          )}
          {success && <p className="mb-4 rounded-md border border-success/30 bg-success-surface/60 p-3 text-sm" role="status">{success}</p>}
          {detail && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={statusLabels[detail.status] ?? detail.status} variant={statusVariant(detail.status)} />
                <span className="text-sm text-foreground-secondary">Revisión {detail.reviewVersion}</span>
              </div>

              <section aria-labelledby="source-comparison-heading">
                <h3 className="mb-2 font-semibold text-foreground" id="source-comparison-heading">Valores originales y normalizados</h3>
                <div className="overflow-hidden rounded-md border border-border bg-surface">
                  <div className="grid grid-cols-[minmax(5rem,0.55fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-border bg-surface-subtle px-3 py-2 text-xs font-semibold text-foreground-secondary sm:px-4">
                    <span>Campo</span><span>Valor original</span><span>Candidato normalizado</span>
                  </div>
                  {rawAndNormalized.map((field) => (
                    <div className="grid grid-cols-[minmax(5rem,0.55fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border/70 px-3 py-3 text-sm last:border-b-0 sm:px-4" key={field.label}>
                      <strong className="text-foreground">{field.label}</strong>
                      <span className="break-words text-foreground-secondary">{field.raw?.trim() || "Sin dato"}</span>
                      <span className="break-words text-foreground">{field.normalized?.trim() || "Sin dato"}</span>
                    </div>
                  ))}
                </div>
                {detail.normalized.contact && <p aria-label="Contacto de la persona estudiante" className="mt-2 break-all text-sm text-foreground-secondary">Contacto: {detail.normalized.contact}</p>}
              </section>

              <section aria-labelledby="anomalies-heading">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground" id="anomalies-heading">
                  <AlertTriangle aria-hidden="true" className="h-4 w-4 text-warning" />Observaciones que requieren revisión
                </h3>
                {detail.anomalyFlags.length === 0 ? (
                  <p className="rounded-md border border-success/30 bg-success-surface/40 p-3 text-sm">No se detectaron observaciones.</p>
                ) : (
                  <ul className="grid gap-2">
                    {detail.anomalyFlags.map((anomaly) => {
                      const resolvedByField = anomalyFieldResolution[anomaly];
                      const checked = form?.acknowledgedAnomalies.includes(anomaly) ?? false;
                      return (
                        <li className="rounded-md border border-warning/30 bg-warning-surface/20 p-3" key={anomaly}>
                          <p className="text-sm text-foreground">{anomalyLabel(anomaly)}</p>
                          {resolvedByField && (
                            <p className="mt-1 text-xs text-foreground-secondary">Se resuelve al confirmar el campo correspondiente.</p>
                          )}
                          <label className="mt-2 flex items-start gap-2 text-sm text-foreground">
                            <input
                              checked={checked}
                              disabled={readOnly || form === null}
                              onChange={(event) => {
                                if (!form) return;
                                const next = event.target.checked
                                  ? [...form.acknowledgedAnomalies, anomaly]
                                  : form.acknowledgedAnomalies.filter((value) => value !== anomaly);
                                updateForm("acknowledgedAnomalies", next);
                              }}
                              type="checkbox"
                            />
                            Confirmo que revisé esta observación
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section aria-labelledby="review-fields-heading">
                <h3 className="mb-3 font-semibold text-foreground" id="review-fields-heading">Decisión de revisión</h3>
                {readOnly ? (
                  <p className="rounded-md border border-border bg-surface p-3 text-sm text-foreground-secondary">Este registro ya tiene un estado final. El detalle se muestra en modo de consulta.</p>
                ) : form ? (
                  <form className="grid gap-3 rounded-md border border-border bg-surface p-4" onSubmit={submit}>
                    <label className="grid gap-1.5 text-sm font-medium text-foreground">
                      Carrera
                      <select className={selectClassName()} onChange={(event) => {
                        updateForm("careerId", event.target.value);
                        if (form.subjectId && !detail.references.subjects.some((subject) => subject.id === form.subjectId && subject.careerId === event.target.value)) {
                          onFormChange({ ...form, careerId: event.target.value, subjectId: "" });
                        }
                      }} value={form.careerId}>
                        <option value="">Seleccionar carrera</option>
                        {detail.references.careers.map((career) => <option key={career.id} value={career.id}>{career.name}{career.status === "INACTIVE" ? " · Inactiva" : ""}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium text-foreground">
                      Tutor
                      <select className={selectClassName()} onChange={(event) => updateForm("tutorId", event.target.value)} value={form.tutorId}>
                        <option value="">Seleccionar tutor</option>
                        {detail.references.tutors.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.name}{tutor.status === "INACTIVE" ? " · Inactivo" : ""}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium text-foreground">
                      Fecha de consulta
                      <Input onChange={(event) => updateForm("consultationDate", event.target.value)} type="date" value={form.consultationDate} />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium text-foreground">
                      Clasificación
                      <select className={selectClassName()} onChange={(event) => updateForm("classification", event.target.value as Classification)} value={form.classification}>
                        <option value="PENDING_CLASSIFICATION">Pendiente de clasificación</option>
                        <option value="SUBJECT">Materia</option>
                        <option value="GENERAL">General / Varias</option>
                      </select>
                    </label>
                    {form.classification === "SUBJECT" && (
                      <label className="grid gap-1.5 text-sm font-medium text-foreground">
                        Materia
                        <select className={selectClassName()} onChange={(event) => updateForm("subjectId", event.target.value)} value={form.subjectId}>
                          <option value="">Seleccionar materia</option>
                          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}{subject.status === "INACTIVE" ? " · Inactiva" : ""}</option>)}
                        </select>
                      </label>
                    )}
                    {fieldError && <p className="text-sm text-danger" role="alert">{fieldError}</p>}
                    <Button className="mt-1 w-full sm:w-fit" disabled={saving} type="submit">
                      {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <CheckCircle2 aria-hidden="true" />}
                      {saving ? "Guardando revisión…" : "Guardar revisión"}
                    </Button>
                  </form>
                ) : null}
              </section>

              <section aria-labelledby="duplicate-candidates-heading">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-foreground" id="duplicate-candidates-heading">Posibles duplicados ({detail.duplicateCandidateCount})</h3>
                  {detail.duplicateCandidateCount > detail.duplicateCandidatesLimit && (
                    <span className="text-xs text-foreground-secondary">Mostrando {detail.duplicateCandidatesOffset + 1}–{candidatePageEnd}</span>
                  )}
                </div>
                {detail.duplicateCandidates.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border p-3 text-sm text-foreground-secondary">No hay posibles duplicados asociados a esta fila.</p>
                ) : (
                  <ul className="grid gap-2">
                    {detail.duplicateCandidates.map((candidate) => {
                      const name = fullName(candidate.peer.studentFirstName, candidate.peer.studentLastName);
                      const choice = duplicateChoices[candidate.candidateId] ?? "";
                      return (
                        <li className="rounded-md border border-border bg-surface p-3" key={candidate.candidateId}>
                          <p className="font-medium text-foreground">{name}</p>
                          <p className="mt-1 text-sm text-foreground-secondary">{formatDate(candidate.peer.consultationDate)} · {candidate.peer.career ?? "Carrera sin resolver"} · {candidate.peer.tutor ?? "Tutor sin resolver"}</p>
                          {candidate.peer.hasCanonical && <p className="mt-1 text-xs text-foreground-secondary">El registro relacionado ya está consolidado.</p>}
                          <label className="mt-3 grid gap-1.5 text-sm font-medium text-foreground">
                            Decisión para el posible duplicado de {name}
                            <select
                              className={selectClassName()}
                              disabled={readOnly || candidate.decision === "DUPLICATE" && !candidate.isCurrentDuplicate}
                              onChange={(event) => onDuplicateChoice(candidate.candidateId, event.target.value as DuplicateChoice)}
                              value={choice}
                            >
                              <option value="">Sin decidir</option>
                              <option value="DUPLICATE">Confirmar duplicado</option>
                              <option value="NOT_DUPLICATE">No es duplicado</option>
                              {choice === "PEER_DUPLICATE" && <option value="PEER_DUPLICATE">El otro registro es el duplicado</option>}
                            </select>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {detail.duplicateCandidateCount > detail.duplicateCandidatesLimit && (
                  <div className="mt-3 flex justify-between gap-3">
                    <Button disabled={detail.duplicateCandidatesOffset === 0 || loading} onClick={() => onLoadMore(Math.max(0, detail.duplicateCandidatesOffset - detail.duplicateCandidatesLimit))} size="sm" type="button" variant="outline">Anterior</Button>
                    <Button disabled={candidatePageEnd >= detail.duplicateCandidateCount || loading} onClick={() => onLoadMore(candidatePageEnd)} size="sm" type="button" variant="outline">Siguientes duplicados</Button>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
        <footer className="flex justify-end border-t border-border bg-surface px-4 py-3 sm:px-6">
          <Button onClick={onClose} type="button" variant="outline">Cerrar</Button>
        </footer>
      </div>
    </div>
  );
}
