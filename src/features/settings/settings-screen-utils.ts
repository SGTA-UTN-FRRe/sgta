import type { FormEvent } from "react";
import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import type { SafeHourCategory } from "@/features/hours/hour-service";
import type { SafeCareer, SafeScholarshipReference, SafeSubject } from "@/features/tutors/tutor-service";
import type { CareerColor } from "@/shared/career-color";
import type { StatusBadgeVariant } from "@/shared/components/status-badge";

export type SettingsState =
  | "default"
  | "loading"
  | "error"
  | "required-action"
  | "success";

export type Feedback = {
  kind: "error" | "success";
  message: string;
  description?: string;
  /** Load failures offer a retry; save failures keep the form for correction. */
  retry?: boolean;
};

export type PendingOperation = "refresh" | "save" | "create-cycle";

export const LOAD_ERROR_FEEDBACK: Feedback = {
  kind: "error",
  message: "No se pudo cargar la configuración.",
  description: "Reintentar para volver a consultar los datos.",
  retry: true,
};

export type CycleForm = {
  name: string;
  startDate: string;
  endDate: string;
};

export type CareerForm = {
  color?: CareerColor;
  id: string | null;
  name: string;
};

export type SubjectForm = {
  id: string | null;
  name: string;
  careerId: string;
};

export type ScholarshipForm = {
  id: string | null;
  type: string;
  knownRequiredHours: string;
  notes: string;
};

export type HourActivityKind = NonNullable<SafeHourCategory["activityKind"]>;

export type HourCategoryForm = {
  id: string | null;
  name: string;
  activityKind: HourActivityKind | "";
};

type SettingsPayload = {
  currentCycle: SafeAdministrativeCycle | null;
  cycles: SafeAdministrativeCycle[];
  careers: SafeCareer[];
  subjects: SafeSubject[];
  scholarshipReferences: SafeScholarshipReference[];
  hourCategories: SafeHourCategory[];
};

export type SubmitHandler = (event: FormEvent<HTMLFormElement>) => void;

export interface SettingsScreenProps {
  currentCycle: SafeAdministrativeCycle | null;
  cycles: SafeAdministrativeCycle[];
  careers?: SafeCareer[];
  subjects?: SafeSubject[];
  scholarshipReferences?: SafeScholarshipReference[];
  hourCategories?: SafeHourCategory[];
  initialErrorMessage?: string;
  initialState?: SettingsState;
}

export const EMPTY_CYCLE_FORM: CycleForm = {
  name: "",
  startDate: "",
  endDate: "",
};

export const EMPTY_CAREER_FORM: CareerForm = {
  id: null,
  name: "",
};

export const EMPTY_SUBJECT_FORM: SubjectForm = {
  id: null,
  name: "",
  careerId: "",
};

export const EMPTY_SCHOLARSHIP_FORM: ScholarshipForm = {
  id: null,
  type: "",
  knownRequiredHours: "",
  notes: "",
};

export const EMPTY_HOUR_CATEGORY_FORM: HourCategoryForm = {
  id: null,
  name: "",
  activityKind: "",
};

export const hourActivityKindLabels: Record<HourActivityKind, string> = {
  MEETING: "Reunión",
  WORKSHOP: "Taller",
  EXTRAORDINARY: "Extraordinaria",
  RECOVERY: "Recuperación",
};

export const hourActivityKinds = Object.keys(
  hourActivityKindLabels,
) as HourActivityKind[];

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const settingsErrorMessages: Record<string, string> = {
  unauthorized: "La sesión expiró. Volver a iniciar sesión para continuar.",
  forbidden: "La cuenta no tiene permisos para administrar la configuración.",
  invalid_request: "Revisar los datos ingresados antes de guardar.",
  invalid_date_range:
    "La fecha de finalización debe ser posterior o igual a la de inicio.",
  open_cycle_exists:
    "Ya existe un ciclo abierto. Cerrar el ciclo actual antes de crear otro.",
  cycle_not_found: "No se encontró el ciclo solicitado.",
  cycle_already_closed: "El ciclo ya está cerrado y no puede modificarse.",
  duplicate_career_name: "Ya existe una carrera con ese nombre.",
  duplicate_subject_name:
    "Ya existe una materia con ese nombre dentro de la carrera seleccionada.",
  duplicate_scholarship_reference_type:
    "Ya existe una referencia de beca con ese tipo.",
  duplicate_category_name: "Ya existe una categoría de horas con ese nombre.",
  inactive_career: "Seleccionar una carrera activa para continuar.",
  inactive_subject: "Seleccionar una materia activa para continuar.",
  inactive_scholarship_reference:
    "Seleccionar una referencia de beca activa para continuar.",
  invalid_activity_kind:
    "Seleccionar un origen de actividad válido para la categoría.",
  career_subject_mismatch:
    "La materia seleccionada debe pertenecer a la carrera indicada.",
  catalog_conflict:
    "No se puede cambiar la carrera porque la materia conserva asignaciones.",
  status_already_set: "El estado seleccionado ya está aplicado.",
  category_not_found: "No se encontró la categoría solicitada.",
  internal_server_error:
    "No se pudo guardar la configuración. Intentar nuevamente.",
};

export class SettingsRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "SettingsRequestError";
    this.code = code;
  }
}

function formatCycleDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

export function formatCyclePeriod(cycle: SafeAdministrativeCycle) {
  return `${formatCycleDate(cycle.startDate)} — ${formatCycleDate(cycle.endDate)}`;
}

function getErrorCode(body: unknown) {
  if (typeof body === "object" && body !== null && "error" in body) {
    const typedBody = body as {
      error?: unknown;
      issues?: unknown;
    };
    const code = typedBody.error;

    if (
      code === "invalid_request" &&
      Array.isArray(typedBody.issues) &&
      typedBody.issues.some(
        (issue) =>
          typeof issue === "object" &&
          issue !== null &&
          "path" in issue &&
          Array.isArray((issue as { path?: unknown; }).path) &&
          (issue as { path: unknown[]; }).path.includes("activityKind"),
      )
    ) {
      return "invalid_activity_kind";
    }

    if (typeof code === "string") {
      return code;
    }
  }

  return "internal_server_error";
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(input, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new SettingsRequestError("internal_server_error");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new SettingsRequestError(getErrorCode(body));
  }

  return body as T;
}

export function getFeedbackMessage(error: unknown) {
  if (error instanceof SettingsRequestError) {
    return (
      settingsErrorMessages[error.code] ??
      settingsErrorMessages.internal_server_error
    );
  }

  return settingsErrorMessages.internal_server_error;
}

export async function loadSettings(): Promise<SettingsPayload> {
  const [
    currentCycleResponse,
    cyclesResponse,
    careersResponse,
    subjectsResponse,
    scholarshipResponse,
    hourCategoriesResponse,
  ] = await Promise.all([
    requestJson<{ cycle: SafeAdministrativeCycle | null; }>(
      "/api/admin/cycles/current",
    ),
    requestJson<{ cycles: SafeAdministrativeCycle[]; }>(
      "/api/admin/cycles",
    ),
    requestJson<{ careers: SafeCareer[]; }>(
      "/api/admin/settings/careers?status=ALL",
    ),
    requestJson<{ subjects: SafeSubject[]; }>(
      "/api/admin/settings/subjects?status=ALL",
    ),
    requestJson<{ scholarshipReferences: SafeScholarshipReference[]; }>(
      "/api/admin/settings/scholarship-references?status=ALL",
    ),
    requestJson<{ categories: SafeHourCategory[]; }>(
      "/api/admin/settings/hour-categories?status=ALL",
    ),
  ]);

  return {
    currentCycle: currentCycleResponse.cycle,
    cycles: cyclesResponse.cycles,
    careers: careersResponse.careers,
    subjects: subjectsResponse.subjects,
    scholarshipReferences: scholarshipResponse.scholarshipReferences,
    hourCategories: hourCategoriesResponse.categories,
  };
}

export function statusLabel(status: "ACTIVE" | "INACTIVE") {
  return status === "ACTIVE" ? "Activa" : "Inactiva";
}

export function statusVariant(status: "ACTIVE" | "INACTIVE"): StatusBadgeVariant {
  return status === "ACTIVE" ? "success" : "neutral";
}

export function sortByName<T extends { name: string; }>(items: T[]) {
  return [...items].sort((left, right) =>
    left.name.localeCompare(right.name, "es-AR", { sensitivity: "base" }),
  );
}

export function sortSubjects(items: SafeSubject[]) {
  return [...items].sort((left, right) => {
    const careerOrder = left.careerName.localeCompare(
      right.careerName,
      "es-AR",
      { sensitivity: "base" },
    );

    if (careerOrder !== 0) {
      return careerOrder;
    }

    return left.name.localeCompare(right.name, "es-AR", {
      sensitivity: "base",
    });
  });
}

export function sortScholarshipReferences(items: SafeScholarshipReference[]) {
  return [...items].sort((left, right) =>
    left.type.localeCompare(right.type, "es-AR", { sensitivity: "base" }),
  );
}

export function upsertById<T extends { id: string; }>(items: T[], next: T) {
  const existingIndex = items.findIndex((item) => item.id === next.id);

  if (existingIndex === -1) {
    return [...items, next];
  }

  return items.map((item) => (item.id === next.id ? next : item));
}
