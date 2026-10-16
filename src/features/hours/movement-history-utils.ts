import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import type { SafeHourMovement } from "./hour-service";
import type { HoursStateDetail } from "./hours-screen-types";
import type { MovementHistoryScreenState } from "./movement-history-screen";
import type { StatusBadgeVariant } from "@/shared/components/status-badge";

export type ActivityKind = NonNullable<SafeHourMovement["category"]["activityKind"]>;
export type DirectionFilter = "ALL" | SafeHourMovement["direction"];
export type SourceFilter = "ALL" | "MANUAL" | ActivityKind;
export type ReversalFilter = "ALL" | SafeHourMovement["reversalState"];

export const directionLabels = {
  CREDIT: "Crédito",
  DEBIT: "Débito",
} as const;

export const activityKindLabels: Record<ActivityKind, string> = {
  MEETING: "Reunión",
  WORKSHOP: "Taller",
  EXTRAORDINARY: "Extraordinaria",
  RECOVERY: "Recuperación",
};

export const reversalLabels: Record<SafeHourMovement["reversalState"], string> = {
  CONFIRMED: "Confirmado",
  REVERSED: "Revertido",
  REVERSAL: "Reversión",
};

export const defaultStateDetails: Partial<
  Record<MovementHistoryScreenState, HoursStateDetail>
> = {
  empty: {
    description: "Los movimientos registrados en el ciclo aparecerán aquí.",
    title: "Todavía no hay movimientos",
  },
  error: {
    actionHref: "/admin/hours/movements",
    actionLabel: "Reintentar",
    description:
      "Reintentar para volver a consultar el historial del ciclo.",
    title: "No se pudo cargar el historial",
  },
  loading: {
    description: "Consultando los movimientos del ciclo…",
    title: "Cargando movimientos",
  },
  "search-empty": {
    description: "Probar con otro filtro o limpiar la búsqueda actual.",
    title: "No encontramos movimientos",
  },
  "required-action": {
    actionHref: "/admin/settings",
    actionLabel: "Configurar ciclo",
    description:
      "Crear un ciclo administrativo para consultar movimientos de horas.",
    title: "Configurar un ciclo para consultar movimientos",
  },
};

export const hoursErrorMessages: Record<string, string> = {
  cycle_not_found: "El ciclo seleccionado ya no está disponible.",
  cycle_not_open: "El ciclo ya no está abierto para crear una reversión.",
  forbidden: "No tienes permisos para corregir movimientos de horas.",
  internal_server_error: "No se pudo completar la operación. Intentar nuevamente.",
  movement_already_reversed: "El movimiento ya tiene una reversión registrada.",
  movement_not_found: "El movimiento ya no está disponible en el historial.",
  open_cycle_required: "Abrir un ciclo administrativo antes de consultar movimientos.",
  reversal_target_invalid: "Las reversiones no pueden encadenarse sobre otra reversión.",
  unauthorized: "La sesión expiró. Volver a iniciar sesión para continuar.",
};

class MovementHistoryRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "MovementHistoryRequestError";
    this.code = code;
  }
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

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
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
    throw new MovementHistoryRequestError("internal_server_error");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new MovementHistoryRequestError(getErrorCode(body));
  }

  return body as T;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof MovementHistoryRequestError) {
    return hoursErrorMessages[error.code] ?? hoursErrorMessages.internal_server_error;
  }

  return hoursErrorMessages.internal_server_error;
}

export function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

export function formatActivityKind(kind: ActivityKind) {
  return activityKindLabels[kind];
}

export function formatOrigin(movement: SafeHourMovement) {
  return movement.origin === null
    ? "Carga manual"
    : formatActivityKind(movement.origin.kind);
}

export function formatCycleStatus(status: SafeAdministrativeCycle["status"]) {
  return status === "OPEN" ? "Abierto" : "Cerrado";
}

export function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function sortMovements(movements: SafeHourMovement[]) {
  return [...movements].sort((left, right) => {
    const createdOrder = right.createdAt.localeCompare(left.createdAt);

    return createdOrder === 0
      ? right.id.localeCompare(left.id)
      : createdOrder;
  });
}

export function formatMovementCount(count: number) {
  return `${count} ${count === 1 ? "movimiento" : "movimientos"}`;
}

export function getReversalVariant(
  state: SafeHourMovement["reversalState"],
): StatusBadgeVariant {
  if (state === "REVERSED") {
    return "warning";
  }

  if (state === "REVERSAL") {
    return "info";
  }

  return "success";
}
