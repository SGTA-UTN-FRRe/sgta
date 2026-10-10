import type {
  SafeHourBalance,
  SafeHourCategory,
  SafeHourMovement,
} from "@/features/hours/hour-service";
import type {
  HoursScreenData,
  HoursScreenState,
  HoursStateDetail,
} from "@/features/hours/hours-screen-types";

export type BalanceFilter = SafeHourBalance["state"] | "all";
export type ActivityKind = NonNullable<SafeHourCategory["activityKind"]>;
export type MovementDirection = "CREDIT" | "DEBIT";
export type HourWorkspaceResponse = Pick<
  HoursScreenData,
  "currentCycle" | "balances" | "eligibleTutors" | "categories"
>;

export const directionLabels = {
  CREDIT: "Crédito",
  DEBIT: "Débito",
} as const;

const activityKindLabels: Record<ActivityKind, string> = {
  MEETING: "Reunión",
  WORKSHOP: "Taller",
  EXTRAORDINARY: "Extraordinaria",
  RECOVERY: "Recuperación",
};

export const defaultStateDetails: Partial<Record<HoursScreenState, HoursStateDetail>> = {
  empty: {
    actionLabel: "Registrar movimiento",
    description: "Todavía no hay saldos cargados.",
    title: "Todavía no hay saldos",
  },
  error: {
    actionHref: "/admin/hours",
    actionLabel: "Reintentar",
    description: "Reintentar para volver a consultar los saldos.",
    title: "No se pudieron cargar las horas",
  },
  loading: {
    description: "Estamos preparando los balances del ciclo actual.",
    title: "Cargando saldos",
  },
  "search-empty": {
    actionLabel: "Limpiar filtros",
    description: "Probar con otro nombre o limpiar los filtros.",
    title: "No encontramos balances",
  },
  "required-action": {
    actionHref: "/admin/settings",
    actionLabel: "Configurar ciclo",
    description: "El balance se calcula dentro de un ciclo administrativo abierto.",
    title: "Abrir un ciclo para consultar horas",
  },
};

const hoursErrorMessages: Record<string, string> = {
  activity_credit_required:
    "Las actividades y recuperaciones sólo pueden registrarse como crédito.",
  cycle_not_open: "El ciclo actual ya no está abierto para registrar movimientos.",
  forbidden: "No tienes permisos para registrar movimientos de horas.",
  inactive_category: "La categoría seleccionada ya no está activa.",
  inactive_tutor: "Uno de los tutores seleccionados ya no está activo.",
  invalid_request: "Revisar los datos del movimiento antes de intentar nuevamente.",
  movement_date_outside_cycle:
    "La fecha debe pertenecer al ciclo administrativo vigente.",
  no_active_categories: "No hay categorías activas disponibles para registrar movimientos.",
  no_eligible_tutors: "No hay tutores elegibles disponibles para registrar movimientos.",
  open_cycle_required: "Abrir un ciclo administrativo antes de registrar movimientos.",
  recovery_category_required:
    "Seleccionar una categoría activa configurada para recuperación.",
  tutor_not_in_cycle: "Uno de los tutores seleccionados no pertenece al ciclo vigente.",
  unauthorized: "La sesión expiró. Volver a iniciar sesión para continuar.",
  internal_server_error:
    "No se pudo completar la operación. Intentar nuevamente.",
};

class HoursRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "HoursRequestError";
    this.code = code;
  }
}

function getErrorCode(body: unknown) {
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
    throw new HoursRequestError("internal_server_error");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HoursRequestError(getErrorCode(body));
  }

  return body as T;
}

export function getHoursErrorMessage(error: unknown) {
  if (error instanceof HoursRequestError) {
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

export function formatTutorCount(count: number) {
  return `${count} ${count === 1 ? "tutor" : "tutores"}`;
}

export function parseDurationMinutes(hours: string, minutes: string) {
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);

  if (
    !Number.isInteger(parsedHours) ||
    !Number.isInteger(parsedMinutes) ||
    parsedHours < 0 ||
    parsedMinutes < 0 ||
    parsedMinutes > 59
  ) {
    return 0;
  }

  return parsedHours * 60 + parsedMinutes;
}

export function formatActivityKind(kind: ActivityKind) {
  return activityKindLabels[kind];
}

export function firstMovementCategoryId(categories: SafeHourCategory[]) {
  return categories.find((category) => category.activityKind !== "RECOVERY")?.id ?? "";
}

export function formatMovementOrigin(movement: SafeHourMovement) {
  return movement.origin === null
    ? "Carga manual"
    : formatActivityKind(movement.origin.kind);
}

export function applyMovementsToBalances(
  balances: SafeHourBalance[],
  movements: SafeHourMovement[],
) {
  const deltaByTutor = new Map<string, number>();

  for (const movement of movements) {
    deltaByTutor.set(
      movement.tutor.id,
      (deltaByTutor.get(movement.tutor.id) ?? 0) + movement.signedDurationMinutes,
    );
  }

  return balances.map((balance) => {
    const delta = deltaByTutor.get(balance.tutor.id) ?? 0;

    if (delta === 0) {
      return balance;
    }

    const signedBalanceMinutes = balance.signedBalanceMinutes + delta;

    return {
      ...balance,
      signedBalanceMinutes,
      state: signedBalanceMinutes >= 0 ? ("current" as const) : ("owes" as const),
    };
  });
}

function normalizeSearchValue(value: string) {
  return value
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterBalances(
  balances: SafeHourBalance[],
  history: SafeHourMovement[],
  { category, search, status }: { category: string; search: string; status: BalanceFilter },
) {
  const normalizedSearch = normalizeSearchValue(search.trim());

  return balances.filter((balance) => {
    const searchText = normalizeSearchValue(
      [balance.tutor.formalName, balance.tutor.careerName, balance.cycle.name].join(" "),
    );
    const matchesSearch = !normalizedSearch || searchText.includes(normalizedSearch);
    const matchesStatus = status === "all" || balance.state === status;
    const matchesCategory =
      !category ||
      history.some(
        (entry) => entry.tutor.id === balance.tutor.id && entry.category.id === category,
      );

    return matchesSearch && matchesStatus && matchesCategory;
  });
}

export function sortMovements(movements: SafeHourMovement[]) {
  return [...movements].sort((left, right) => {
    const dateOrder = right.movementDate.localeCompare(left.movementDate);

    return dateOrder === 0
      ? right.createdAt.localeCompare(left.createdAt)
      : dateOrder;
  });
}

export function historyByTutor(movements: SafeHourMovement[]) {
  return movements.reduce<Record<string, SafeHourMovement[]>>((result, movement) => {
    const tutorMovements = result[movement.tutor.id] ?? [];
    result[movement.tutor.id] = sortMovements([...tutorMovements, movement]);
    return result;
  }, {});
}

export function mergeHistory(
  current: Record<string, SafeHourMovement[]>,
  next: SafeHourMovement[],
) {
  const merged = { ...current };

  for (const movement of next) {
    const tutorMovements = merged[movement.tutor.id] ?? [];
    merged[movement.tutor.id] = sortMovements(
      [...tutorMovements.filter((entry) => entry.id !== movement.id), movement],
    );
  }

  return merged;
}
