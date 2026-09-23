import type {
  TutorSelfServiceRequiredActionReason,
} from "./tutor-self-service-service";

const longDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
  year: "numeric",
});

export class TutorSelfServiceRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "TutorSelfServiceRequestError";
    this.code = code;
  }
}

export function focusTutorPageTitle() {
  document.getElementById("tutor-page-title")?.focus();
}

export function formatLongDate(date: string) {
  const label = longDateFormatter.format(new Date(`${date}T00:00:00Z`));
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

export function formatShortDate(date: string) {
  return shortDateFormatter.format(new Date(`${date}T00:00:00Z`));
}

export function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function formatTimeRange(startMinutes: number, endMinutes: number) {
  return `${formatTime(startMinutes)} a ${formatTime(endMinutes)}`;
}

export function formatSignedMinutes(minutes: number) {
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function getBalanceLabel(state: "current" | "owes") {
  return state === "current" ? "Al d\u00eda" : "Debe horas";
}

export function getMovementDirectionLabel(direction: "CREDIT" | "DEBIT") {
  return direction === "CREDIT" ? "Cr\u00e9dito" : "D\u00e9bito";
}

export function getAssignmentKindLabel(kind: "DUTY" | "RECOVERY") {
  return kind === "DUTY" ? "Guardia" : "Recuperaci\u00f3n";
}

export function getPlanKindLabel(kind: "REGULAR" | "SPECIAL") {
  return kind === "REGULAR" ? "Regular" : "Especial";
}

export function getRequiredActionCopy(reason: TutorSelfServiceRequiredActionReason) {
  switch (reason) {
    case "ACCOUNT_NOT_LINKED":
      return {
        description:
          "La cuenta todavía no está vinculada a un perfil de Tutor. Contactar a la administración de Tutorías para solicitar acceso.",
        title: "Completar la vinculación de la cuenta",
      };
    case "OPEN_CYCLE_REQUIRED":
      return {
        description:
          "No hay un ciclo administrativo abierto para mostrar información personal.",
        title: "No hay un ciclo vigente",
      };
    case "CYCLE_MEMBERSHIP_REQUIRED":
      return {
        description:
          "El perfil todavía no tiene una pertenencia configurada para el ciclo vigente.",
        title: "Completar la pertenencia al ciclo",
      };
  }
}

export function getTutorSelfServiceErrorMessage(code: string) {
  const messages: Record<string, string> = {
    account_not_linked:
      "La cuenta todavía no está vinculada a un perfil de Tutor.",
    cycle_membership_required:
      "El perfil todavía no tiene una pertenencia configurada para el ciclo vigente.",
    date_outside_cycle:
      "La fecha seleccionada no pertenece al ciclo administrativo vigente.",
    forbidden: "No tienes permisos para consultar esta información.",
    internal_server_error:
      "No se pudo cargar la información. Intentar nuevamente.",
    invalid_request: "Revisar la fecha seleccionada antes de intentar nuevamente.",
    open_cycle_required:
      "No hay un ciclo administrativo abierto para consultar esta información.",
    special_plan_overlap:
      "No se pudo resolver el horario especial para la fecha seleccionada.",
    unauthorized: "La sesión expiró. Volver a iniciar sesión para continuar.",
  };

  return messages[code] ?? messages.internal_server_error;
}

export async function requestTutorSelfService<T>(input: RequestInfo | URL) {
  let response: Response;

  try {
    response = await fetch(input, {
      headers: { accept: "application/json" },
    });
  } catch {
    throw new TutorSelfServiceRequestError("internal_server_error");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "internal_server_error";
    throw new TutorSelfServiceRequestError(code);
  }

  return body as T;
}
