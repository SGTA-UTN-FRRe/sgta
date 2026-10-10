import type { SafeTutorListItem } from "./tutor-service";
import type { TutorStateFixture, TutorsScreenState } from "./tutor-screen-types";
import type { FilterStatus } from "./tutor-presentation-types";
import type { StatusBadgeVariant } from "@/shared/components/status-badge";

export const tutorsStateFixtures: TutorStateFixture[] = [
  {
    state: "loading",
    title: "Cargando tutores",
    description: "Estamos preparando la lista de tutores.",
  },
  {
    state: "empty",
    title: "Todavía no hay tutores",
    description: "Agregar el primer tutor para comenzar a organizar la cobertura.",
    actionLabel: "Agregar tutor",
  },
  {
    state: "search-empty",
    title: "No encontramos tutores",
    description: "Probar con otro nombre o limpiar los filtros.",
    actionLabel: "Limpiar filtros",
  },
  {
    state: "error",
    title: "No se pudo cargar la lista",
    description: "Reintentar para volver a consultar los tutores.",
    actionLabel: "Reintentar",
  },
  {
    state: "required-action",
    title: "Abrir un ciclo para gestionar tutores",
    description:
      "Es necesario contar con un ciclo abierto para incorporar tutores al período actual.",
    actionLabel: "Configurar ciclo",
  },
];

type TutorValidationIssue = {
  path: Array<string | number>;
  message: string;
};

export class TutorRequestError extends Error {
  readonly code: string;
  readonly issues: TutorValidationIssue[];
  readonly status: number;

  constructor(
    code: string,
    status: number,
    issues: TutorValidationIssue[] = [],
  ) {
    super(code);
    this.name = "TutorRequestError";
    this.code = code;
    this.issues = issues;
    this.status = status;
  }
}

export const stateVariants: Record<SafeTutorListItem["status"], StatusBadgeVariant> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
};

const tutorErrorMessages: Record<string, string> = {
  duplicate_subject_assignment:
    "No se puede asignar la misma materia m\\u00e1s de una vez.",
  unauthorized: "La sesión expiró. Volver a iniciar sesión para continuar.",
  forbidden: "No tienes permisos para administrar tutores.",
  invalid_request: "Revisar los datos ingresados antes de guardar.",
  open_cycle_required: "Abrir un ciclo para incorporar un tutor al período actual.",
  cycle_required_for_membership_change:
    "Seleccionar el ciclo abierto para actualizar la beca del tutor.",
  cycle_not_found: "No se encontró el ciclo seleccionado.",
  cycle_not_open: "El ciclo seleccionado ya no está abierto.",
  tutor_not_found: "No se encontró el tutor solicitado. Actualizar la lista e intentar nuevamente.",
  career_not_found: "La carrera seleccionada ya no está disponible.",
  subject_not_found: "Una de las materias seleccionadas ya no está disponible.",
  scholarship_reference_not_found:
    "La referencia de beca seleccionada ya no está disponible.",
  duplicate_institutional_identifier:
    "El identificador institucional ya está asociado a otro tutor.",
  application_account_not_found:
    "No se encontró una cuenta de Tutor habilitada con ese correo.",
  application_account_not_tutor:
    "La cuenta seleccionada no está habilitada como Tutor.",
  application_account_disabled: "La cuenta de Tutor está deshabilitada.",
  application_account_already_linked:
    "La cuenta de Tutor ya está vinculada a otro tutor.",
  career_subject_mismatch: "Las materias deben pertenecer a la carrera seleccionada.",
  inactive_career: "La carrera seleccionada está inactiva.",
  inactive_subject: "Una de las materias seleccionadas está inactiva.",
  inactive_scholarship_reference:
    "La referencia de beca seleccionada está inactiva.",
  catalog_conflict: "No se puede modificar esa relación porque conserva datos históricos.",
  status_already_set: "El tutor ya tiene ese estado.",
  internal_server_error: "No se pudo guardar el cambio. Intentar nuevamente.",
};

export function getTutorErrorMessage(error: unknown, fallback = "No se pudo completar la solicitud.") {
  if (error instanceof TutorRequestError) {
    return tutorErrorMessages[error.code] ?? fallback;
  }

  return fallback;
}

export function getFieldErrors(error: unknown) {
  if (!(error instanceof TutorRequestError)) {
    return {};
  }

  return error.issues.reduce<Record<string, string>>((errors, issue) => {
    const field = issue.path.find((segment): segment is string => typeof segment === "string");

    if (field !== undefined && errors[field] === undefined) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}

export function getErrorCode(body: unknown) {
  if (typeof body === "object" && body !== null && "error" in body) {
    const code = (body as { error?: unknown }).error;

    if (typeof code === "string") {
      return code;
    }
  }

  return "internal_server_error";
}

export function getErrorIssues(body: unknown) {
  if (typeof body !== "object" || body === null || !("issues" in body)) {
    return [];
  }

  const issues = (body as { issues?: unknown }).issues;

  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.filter(
    (issue): issue is TutorValidationIssue =>
      typeof issue === "object" &&
      issue !== null &&
      "path" in issue &&
      Array.isArray((issue as { path?: unknown }).path) &&
      "message" in issue &&
      typeof (issue as { message?: unknown }).message === "string",
  );
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  let response: Response;

  try {
    response = await fetch(input, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new TutorRequestError("internal_server_error", 500);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new TutorRequestError(
      getErrorCode(body),
      response.status,
      getErrorIssues(body),
    );
  }

  return body as T;
}

export function statusLabel(status: SafeTutorListItem["status"]) {
  return status === "ACTIVE" ? "Activo" : "Inactivo";
}

export function scholarshipLabel(tutor: SafeTutorListItem) {
  return tutor.scholarshipReference?.type ?? "Sin referencia";
}

export function cycleLabel(tutor: SafeTutorListItem) {
  return tutor.currentCycleLabel ?? "Sin ciclo abierto";
}

export function matchesTutorFilters(
  tutor: SafeTutorListItem,
  search: string,
  careerId: string,
  status: FilterStatus,
) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const searchFields = [
    tutor.formalName,
    tutor.firstName,
    tutor.lastName,
    tutor.preferredDisplayName,
    tutor.institutionalIdentifier,
    tutor.primaryCareer.name,
    tutor.scholarshipReference?.type,
  ];

  return (
    (normalizedSearch === "" ||
      searchFields.some((field) =>
        field?.toLocaleLowerCase().includes(normalizedSearch),
      )) &&
    (careerId === "" || tutor.primaryCareer.id === careerId) &&
    (status === "all" || tutor.status === status.toUpperCase())
  );
}

export function findStateData(
  state: TutorsScreenState,
  requiredAction: "catalog" | "cycle",
): TutorStateFixture | undefined {
  if (state === "default" || state === "success") {
    return undefined;
  }

  if (state === "required-action" && requiredAction === "catalog") {
    return {
      state,
      title: "Completar el catálogo académico",
      description:
        "Es necesario contar con al menos una carrera activa para gestionar tutores.",
      actionLabel: "Configurar catálogo",
    };
  }

  return tutorsStateFixtures.find((stateData) => stateData.state === state);
}

export function formatTutorCount(count: number) {
  return `${count} ${count === 1 ? "tutor" : "tutores"}`;
}
