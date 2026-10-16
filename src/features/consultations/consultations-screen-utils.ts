import type {
  ConsultationFilters,
  ConsultationAnomalyCode,
  ConsultationReviewDetail,
  ConsultationWorkspace,
} from "./consultation-validation";
import type { SafeCareer } from "@/features/tutors/tutor-service";
import type { StatusBadgeVariant } from "@/shared/components/status-badge";

export type ReviewQueueItem = ConsultationWorkspace["reviewQueue"][number];
export type Classification = ConsultationReviewDetail["classification"];
export type DuplicateChoice = "" | "DUPLICATE" | "NOT_DUPLICATE" | "PEER_DUPLICATE";
export type ConsultationStatus = ConsultationFilters["status"];
export type SuggestionFilter = ConsultationFilters["suggestion"];
export type BulkAction = "CONFIRM_SUGGESTED_SUBJECT" | "CONFIRM_GENERAL";

export type ConsultationFilterState = {
  status: ConsultationStatus;
  careerId?: string;
  tutorId?: string;
  fromDate?: string;
  toDate?: string;
  classification?: "SUBJECT" | "GENERAL" | "PENDING_CLASSIFICATION";
  suggestion: SuggestionFilter;
  search?: string;
  limit: number;
  offset: number;
};

export type ReviewForm = {
  careerId: string;
  tutorId: string;
  consultationDate: string;
  classification: Classification;
  subjectId: string;
  acknowledgedAnomalies: ConsultationAnomalyCode[];
};

export type ConsultationSummary = ConsultationWorkspace["import"];

export type ConsultationsScreenProps = {
  careers: SafeCareer[];
  tutors: { id: string; name: string; status: "ACTIVE" | "INACTIVE" }[];
  initialFilters: ConsultationFilters;
  initialWorkspace: ConsultationWorkspace | null;
  initialLoadError?: string;
  initialFilterError: boolean;
  emptyWorkspace?: ConsultationWorkspace;
};

export const filterKeys = new Set([
  "status",
  "careerId",
  "tutorId",
  "fromDate",
  "toDate",
  "classification",
  "suggestion",
  "search",
  "limit",
  "offset",
]);

export const anomalyReasons: Record<string, string> = {
  MISSING_SOURCE_ROW_KEY: "La fila no tiene una clave estable en la fuente.",
  MISSING_CAREER: "No se informó una carrera.",
  UNRESOLVED_CAREER: "No se encontró la carrera en la lista disponible.",
  AMBIGUOUS_CAREER: "La carrera coincide con más de una opción disponible.",
  MISSING_STUDENT_FIRST_NAME: "Falta el nombre de la persona estudiante.",
  MISSING_STUDENT_LAST_NAME: "Falta el apellido de la persona estudiante.",
  INVALID_CONSULTATION_DATE: "La fecha de la consulta no es válida.",
  MISSING_TUTOR: "No se informó un tutor.",
  UNRESOLVED_TUTOR: "No se encontró el tutor en la lista disponible.",
  AMBIGUOUS_TUTOR: "El tutor coincide con más de una opción disponible.",
  MISSING_ACADEMIC_STAGE: "No se informó el tramo académico.",
  MISSING_MODALITY: "No se informó la modalidad.",
  MISSING_TOPIC: "No se informó el tema de la consulta.",
  POSSIBLE_DUPLICATE: "La consulta podría estar repetida.",
  SOURCE_ROW_CHANGED: "El contenido de la fila cambió desde la importación anterior.",
};

export const statusLabels: Record<string, string> = {
  PENDING_REVIEW: "Pendiente de revisión",
  READY: "Lista para consolidar",
  CONSOLIDATED: "Consolidada",
  DUPLICATE: "Duplicada",
};

export const anomalyFieldResolution: Record<string, string> = {
  MISSING_CAREER: "careerId",
  UNRESOLVED_CAREER: "careerId",
  AMBIGUOUS_CAREER: "careerId",
  MISSING_TUTOR: "tutorId",
  UNRESOLVED_TUTOR: "tutorId",
  AMBIGUOUS_TUTOR: "tutorId",
  INVALID_CONSULTATION_DATE: "consultationDate",
};

export const initialEmptyWorkspace: ConsultationWorkspace = {
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

export function filtersToSearchParams(filters: ConsultationFilterState) {
  const params = new URLSearchParams();

  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.careerId) params.set("careerId", filters.careerId);
  if (filters.tutorId) params.set("tutorId", filters.tutorId);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.classification) params.set("classification", filters.classification);
  if (filters.suggestion !== "ALL") params.set("suggestion", filters.suggestion);
  if (filters.search) params.set("search", filters.search);
  if (filters.limit !== 50) params.set("limit", String(filters.limit));
  if (filters.offset > 0) params.set("offset", String(filters.offset));

  return params;
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseURLFilters(search: string): ConsultationFilterState | null {
  const params = new URLSearchParams(search);
  const values: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    if (!filterKeys.has(key) || Object.hasOwn(values, key)) return null;
    values[key] = value;
  }

  const status = values.status ?? "ALL";
  const suggestion = values.suggestion ?? "ALL";
  const allowedStatuses = ["ALL", "PENDING_REVIEW", "READY", "CONSOLIDATED", "DUPLICATE"];
  const classification = values.classification;
  if (!allowedStatuses.includes(status)) return null;
  if (!["ALL", "WITH_SUGGESTION", "WITHOUT_SUGGESTION"].includes(suggestion)) return null;
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
    suggestion: suggestion as SuggestionFilter,
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

export function writeURLFilters(filters: ConsultationFilterState, replace = false) {
  const params = filtersToSearchParams(filters);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const url = `${window.location.pathname}${suffix}${window.location.hash}`;

  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

export async function responseJSON<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.valueOf())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: value.length > 10 ? "short" : "medium",
    ...(value.length > 10 ? { timeStyle: "short" as const } : {}),
    timeZone: "UTC",
  }).format(date).normalize("NFKC");
}

export function fullName(firstName: string | null | undefined, lastName: string | null | undefined) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Sin nombre informado";
}


export function sourcePresentation(summary: ConsultationSummary) {
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

export function statusVariant(status: string): StatusBadgeVariant {
  if (status === "CONSOLIDATED") return "success";
  if (status === "PENDING_REVIEW") return "warning";
  if (status === "DUPLICATE") return "neutral";
  return "info";
}

export function anomalyLabel(code: string) {
  return anomalyReasons[code] ?? "La fila requiere revisión antes de consolidarse.";
}

export function emptyReviewForm(detail: ConsultationReviewDetail): ReviewForm {
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

export function reviewFormsEqual(left: ReviewForm, right: ReviewForm) {
  return (
    left.careerId === right.careerId &&
    left.tutorId === right.tutorId &&
    left.consultationDate === right.consultationDate &&
    left.classification === right.classification &&
    left.subjectId === right.subjectId &&
    [...left.acknowledgedAnomalies].sort().join(",") === [...right.acknowledgedAnomalies].sort().join(",")
  );
}

export function initialDuplicateChoice(
  candidate: ConsultationReviewDetail["duplicateCandidates"][number],
): DuplicateChoice {
  if (candidate.decision === "PENDING") return "";
  if (candidate.isCurrentDuplicate) return "DUPLICATE";
  return candidate.decision === "DUPLICATE" ? "PEER_DUPLICATE" : "NOT_DUPLICATE";
}

export function mergeWorkspacePage(
  current: ConsultationWorkspace | null,
  next: ConsultationWorkspace,
) {
  if (next.pagination.offset === 0) return next;
  return {
    ...next,
    reviewQueue: current?.reviewQueue ?? next.reviewQueue,
  };
}

export function classificationLabel(classification: string) {
  if (classification === "SUBJECT") return "Materia";
  if (classification === "GENERAL") return "General / Varias";
  return "Pendiente de clasificación";
}
