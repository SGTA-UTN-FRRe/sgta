"use client";

import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import type {
  SafeHourMovement,
  SafeHourReversalResult,
} from "@/features/hours/hour-service";
import type {
  HoursScreenState,
  HoursStateDetail,
} from "@/features/hours/hours-screen-types";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import {
  StatusBadge,
  type StatusBadgeVariant,
} from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

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

type ActivityKind = NonNullable<SafeHourMovement["category"]["activityKind"]>;
type DirectionFilter = "ALL" | SafeHourMovement["direction"];
type SourceFilter = "ALL" | "MANUAL" | ActivityKind;
type ReversalFilter = "ALL" | SafeHourMovement["reversalState"];

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const selectClassName =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const directionLabels = {
  CREDIT: "Crédito",
  DEBIT: "Débito",
} as const;

const activityKindLabels: Record<ActivityKind, string> = {
  MEETING: "Reunión",
  WORKSHOP: "Taller",
  EXTRAORDINARY: "Extraordinaria",
  RECOVERY: "Recuperación",
};

const reversalLabels: Record<SafeHourMovement["reversalState"], string> = {
  CONFIRMED: "Confirmado",
  REVERSED: "Revertido",
  REVERSAL: "Reversión",
};

const defaultStateDetails: Partial<
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
      "Reintentar para volver a consultar el historial persistido del ciclo.",
    title: "No se pudo cargar el historial",
  },
  loading: {
    description: "Estamos preparando el historial persistido.",
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

const hoursErrorMessages: Record<string, string> = {
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

function getErrorCode(body: unknown) {
  if (typeof body === "object" && body !== null && "error" in body) {
    const code = (body as { error?: unknown }).error;

    if (typeof code === "string") {
      return code;
    }
  }

  return "internal_server_error";
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
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

function getErrorMessage(error: unknown) {
  if (error instanceof MovementHistoryRequestError) {
    return hoursErrorMessages[error.code] ?? hoursErrorMessages.internal_server_error;
  }

  return hoursErrorMessages.internal_server_error;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

function formatDurationMinutes(minutes: number) {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const remainder = Math.abs(minutes) % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function formatSignedDuration(minutes: number) {
  return `${minutes < 0 ? "-" : "+"}${formatDurationMinutes(minutes)}`;
}

function formatActivityKind(kind: ActivityKind) {
  return activityKindLabels[kind];
}

function formatOrigin(movement: SafeHourMovement) {
  return movement.origin === null
    ? "Carga manual"
    : formatActivityKind(movement.origin.kind);
}

function formatCycleStatus(status: SafeAdministrativeCycle["status"]) {
  return status === "OPEN" ? "Abierto" : "Cerrado";
}

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sortMovements(movements: SafeHourMovement[]) {
  return [...movements].sort((left, right) => {
    const createdOrder = right.createdAt.localeCompare(left.createdAt);

    return createdOrder === 0
      ? right.id.localeCompare(left.id)
      : createdOrder;
  });
}

function formatMovementCount(count: number) {
  return `${count} ${count === 1 ? "movimiento" : "movimientos"}`;
}

function getReversalVariant(
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

function ActionLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
      href={href}
    >
      {label}
    </Link>
  );
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
    danger: "border-danger/30 bg-danger-surface/60",
    success: "border-success/30 bg-success-surface/60",
    warning: "border-warning/30 bg-warning-surface/60",
  } as const;
  const iconStyles = {
    danger: "text-danger",
    success: "text-success",
    warning: "text-warning",
  } as const;

  return (
    <div
      aria-live="polite"
      className={cn(
        "mt-6 flex items-start gap-3 rounded-md border p-4",
        styles[tone],
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className={cn("mt-0.5 shrink-0", iconStyles[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-foreground-secondary">
          {description}
        </p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

function HistoryFilters({
  categories,
  categoryId,
  cycles,
  cycleId,
  direction,
  disabled,
  onCategoryChange,
  onClear,
  onCycleChange,
  onDirectionChange,
  onReversalChange,
  onSearchChange,
  onSourceChange,
  onTutorChange,
  reversal,
  search,
  source,
  tutors,
  tutorId,
}: {
  categories: SafeHourMovement["category"][];
  categoryId: string;
  cycles: SafeAdministrativeCycle[];
  cycleId: string;
  direction: DirectionFilter;
  disabled: boolean;
  onCategoryChange: (value: string) => void;
  onClear: () => void;
  onCycleChange: (value: string) => void;
  onDirectionChange: (value: DirectionFilter) => void;
  onReversalChange: (value: ReversalFilter) => void;
  onSearchChange: (value: string) => void;
  onSourceChange: (value: SourceFilter) => void;
  onTutorChange: (value: string) => void;
  reversal: ReversalFilter;
  search: string;
  source: SourceFilter;
  tutors: SafeHourMovement["tutor"][];
  tutorId: string;
}) {
  const hasActiveFilters = Boolean(
    search ||
      categoryId ||
      direction !== "ALL" ||
      reversal !== "ALL" ||
      source !== "ALL" ||
      tutorId,
  );

  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(14rem,1.4fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(10rem,0.8fr)_auto]">
      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground-secondary"
          htmlFor="movement-history-search"
        >
          Buscar
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
          />
          <Input
            className="pl-9"
            disabled={disabled}
            id="movement-history-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar tutor, categoría o nota"
            type="search"
            value={search}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground-secondary"
          htmlFor="movement-history-cycle"
        >
          Ciclo
        </label>
        <select
          className={selectClassName}
          disabled={disabled || cycles.length === 0}
          id="movement-history-cycle"
          onChange={(event) => onCycleChange(event.target.value)}
          value={cycleId}
        >
          {cycles.length === 0 ? (
            <option value="">Sin ciclos disponibles</option>
          ) : (
            cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} · {formatCycleStatus(cycle.status)}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground-secondary"
          htmlFor="movement-history-tutor"
        >
          Tutor
        </label>
        <select
          className={selectClassName}
          disabled={disabled}
          id="movement-history-tutor"
          onChange={(event) => onTutorChange(event.target.value)}
          value={tutorId}
        >
          <option value="">Todos los tutores</option>
          {tutors.map((tutor) => (
            <option key={tutor.id} value={tutor.id}>
              {tutor.formalName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground-secondary"
          htmlFor="movement-history-category"
        >
          Categoría
        </label>
        <select
          className={selectClassName}
          disabled={disabled}
          id="movement-history-category"
          onChange={(event) => onCategoryChange(event.target.value)}
          value={categoryId}
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <Button
          className="w-full xl:w-auto"
          disabled={disabled || !hasActiveFilters}
          onClick={onClear}
          type="button"
          variant="outline"
        >
          Limpiar filtros
        </Button>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground-secondary"
          htmlFor="movement-history-direction"
        >
          Dirección
        </label>
        <select
          className={selectClassName}
          disabled={disabled}
          id="movement-history-direction"
          onChange={(event) =>
            onDirectionChange(event.target.value as DirectionFilter)
          }
          value={direction}
        >
          <option value="ALL">Todas</option>
          <option value="CREDIT">Crédito</option>
          <option value="DEBIT">Débito</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground-secondary"
          htmlFor="movement-history-source"
        >
          Origen
        </label>
        <select
          className={selectClassName}
          disabled={disabled}
          id="movement-history-source"
          onChange={(event) => onSourceChange(event.target.value as SourceFilter)}
          value={source}
        >
          <option value="ALL">Todos los orígenes</option>
          <option value="MANUAL">Carga manual</option>
          <option value="MEETING">Reunión</option>
          <option value="WORKSHOP">Taller</option>
          <option value="EXTRAORDINARY">Extraordinaria</option>
          <option value="RECOVERY">Recuperación</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground-secondary"
          htmlFor="movement-history-reversal"
        >
          Estado
        </label>
        <select
          className={selectClassName}
          disabled={disabled}
          id="movement-history-reversal"
          onChange={(event) =>
            onReversalChange(event.target.value as ReversalFilter)
          }
          value={reversal}
        >
          <option value="ALL">Todos los estados</option>
          <option value="CONFIRMED">Confirmado</option>
          <option value="REVERSED">Revertido</option>
          <option value="REVERSAL">Reversión</option>
        </select>
      </div>
    </div>
  );
}

function MovementRelationship({ movement }: { movement: SafeHourMovement }) {
  if (
    movement.reversalState === "REVERSED" &&
    movement.reversalMovementId !== null
  ) {
    return (
      <p className="mt-4 rounded-sm border border-warning/30 bg-warning-surface/60 p-3 text-xs leading-5 text-foreground-secondary">
        El movimiento original permanece visible como revertido. {" "}
        <a
          className="font-semibold text-foreground underline underline-offset-4"
          href={`#movement-${movement.reversalMovementId}`}
        >
          Ver reversión vinculada
        </a>
      </p>
    );
  }

  if (
    movement.reversalState === "REVERSAL" &&
    movement.reversalOfMovementId !== null
  ) {
    return (
      <p className="mt-4 rounded-sm border border-info/30 bg-info-surface/60 p-3 text-xs leading-5 text-foreground-secondary">
        Esta fila compensa un movimiento anterior y no puede revertirse otra vez. {" "}
        <a
          className="font-semibold text-foreground underline underline-offset-4"
          href={`#movement-${movement.reversalOfMovementId}`}
        >
          Ver movimiento original
        </a>
      </p>
    );
  }

  if (movement.cycle.status === "CLOSED") {
    return (
      <p className="mt-4 rounded-sm border border-border-subtle bg-surface-subtle/60 p-3 text-xs leading-5 text-foreground-secondary">
        El ciclo está cerrado; este movimiento permanece disponible sólo para consulta.
      </p>
    );
  }

  return null;
}

function MovementHistoryRow({
  movement,
  onReverse,
  reverseDisabled,
}: {
  movement: SafeHourMovement;
  onReverse: (movement: SafeHourMovement, trigger: HTMLElement) => void;
  reverseDisabled: boolean;
}) {
  const canReverse =
    movement.reversalState === "CONFIRMED" &&
    movement.cycle.status === "OPEN" &&
    !reverseDisabled;

  return (
    <li
      className={cn(
        "scroll-mt-8 rounded-md border bg-surface p-4 shadow-xs",
        movement.reversalState === "REVERSED"
          ? "border-warning/40"
          : movement.reversalState === "REVERSAL"
            ? "border-info/40"
            : "border-border",
      )}
      data-movement-id={movement.id}
      data-reversal-state={movement.reversalState}
      id={`movement-${movement.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {formatDate(movement.movementDate)} · {movement.category.name}
          </p>
          <p className="mt-1 text-xs leading-5 text-foreground-muted">
            {directionLabels[movement.direction]} · {formatDurationMinutes(movement.durationMinutes)} · {formatOrigin(movement)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusBadge
            label={reversalLabels[movement.reversalState]}
            variant={getReversalVariant(movement.reversalState)}
          />
          {canReverse && (
            <Button
              aria-label={`Revertir movimiento de ${movement.tutor.formalName} del ${formatDate(movement.movementDate)}`}
              onClick={(event) => onReverse(movement, event.currentTarget)}
              size="sm"
              type="button"
              variant="outline"
            >
              <RotateCcw aria-hidden="true" />
              Revertir movimiento
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <dl>
          <dt className="text-xs font-medium text-foreground-muted">Tutor</dt>
          <dd className="mt-1 font-semibold text-foreground">{movement.tutor.formalName}</dd>
          <dd className="mt-1 text-xs text-foreground-muted">{movement.tutor.careerName}</dd>
        </dl>
        <dl>
          <dt className="text-xs font-medium text-foreground-muted">Duración firmada</dt>
          <dd className="mt-1 font-numeric text-xl font-bold tabular-nums text-foreground">
            {formatSignedDuration(movement.signedDurationMinutes)}
          </dd>
          <dd className="mt-1 text-xs text-foreground-muted">
            {directionLabels[movement.direction]} · {formatDurationMinutes(movement.durationMinutes)}
          </dd>
        </dl>
        <dl>
          <dt className="text-xs font-medium text-foreground-muted">Origen</dt>
          <dd className="mt-1 font-semibold text-foreground">{formatOrigin(movement)}</dd>
          {movement.origin !== null && (
            <dd className="mt-1 text-xs leading-5 text-foreground-muted">
              {formatDate(movement.origin.activityDate)} · {formatDurationMinutes(movement.origin.durationMinutes)}
            </dd>
          )}
        </dl>
        <dl>
          <dt className="text-xs font-medium text-foreground-muted">Ciclo y actor</dt>
          <dd className="mt-1 text-foreground-secondary">{movement.cycle.name}</dd>
          <dd className="mt-1 text-xs leading-5 text-foreground-muted">
            {formatCycleStatus(movement.cycle.status)} · {movement.actor.displayName}
          </dd>
        </dl>
      </div>

      <div className="mt-5 grid gap-4 border-t border-border-subtle pt-4 text-sm sm:grid-cols-2">
        <dl>
          <dt className="text-xs font-medium text-foreground-muted">Nota</dt>
          <dd className="mt-1 leading-6 text-foreground-secondary">
            {movement.note ?? "Sin nota"}
          </dd>
        </dl>
        {movement.origin !== null && (
          <dl>
            <dt className="text-xs font-medium text-foreground-muted">Origen registrado por</dt>
            <dd className="mt-1 leading-6 text-foreground-secondary">
              {movement.origin.actor.displayName} · {formatDate(movement.origin.activityDate)}
            </dd>
          </dl>
        )}
      </div>

      <MovementRelationship movement={movement} />
    </li>
  );
}

function LoadingHistory() {
  return (
    <div
      aria-label="Cargando movimientos"
      aria-live="polite"
      className="mt-4 space-y-3"
      role="status"
    >
      {["one", "two", "three"].map((key) => (
        <div className="space-y-4 rounded-md border border-border bg-surface p-5" key={key}>
          <div className="h-5 w-2/3 animate-pulse rounded-sm bg-surface-subtle" />
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="h-10 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="h-10 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="h-10 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="h-10 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        </div>
      ))}
    </div>
  );
}

function useOverlayFocus({
  initialFocusRef,
  onClose,
  open,
  panelRef,
}: {
  initialFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (!open || !panelRef.current) {
      return;
    }

    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      initialFocusRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelector),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [initialFocusRef, onClose, open, panelRef]);
}

function ReversalDialog({
  error,
  onClose,
  onConfirm,
  submitting,
  target,
}: {
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  target: SafeHourMovement | null;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = target !== null;

  useOverlayFocus({
    initialFocusRef: closeButtonRef,
    onClose,
    open,
    panelRef,
  });

  if (!open || target === null) {
    return null;
  }

  return (
    <div
      aria-label="Cerrar confirmación de reversión"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-brand-navy/30 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby="movement-reversal-description"
        aria-labelledby="movement-reversal-title"
        aria-modal="true"
        className="w-full max-w-[34rem] border-border bg-surface shadow-2xl sm:rounded-md sm:border"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-warning">
              Corrección no destructiva
            </p>
            <h2
              className="mt-2 text-xl font-bold tracking-tight text-foreground"
              id="movement-reversal-title"
            >
              Revertir movimiento
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-foreground-secondary"
              id="movement-reversal-description"
            >
              Se agregará un movimiento opuesto y el original permanecerá visible como revertido.
            </p>
          </div>
          <button
            aria-label="Cerrar confirmación de reversión"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {error && (
            <div
              aria-live="assertive"
              className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-surface/60 p-4 text-sm text-danger"
              role="alert"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <dl className="grid gap-4 rounded-md border border-border-subtle bg-surface-subtle/60 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Tutor</dt>
              <dd className="mt-1 font-semibold text-foreground">{target.tutor.formalName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Movimiento</dt>
              <dd className="mt-1 text-foreground-secondary">
                {formatDate(target.movementDate)} · {target.category.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Saldo que compensa</dt>
              <dd className="mt-1 font-numeric font-bold tabular-nums text-foreground">
                {formatSignedDuration(target.signedDurationMinutes)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Origen</dt>
              <dd className="mt-1 text-foreground-secondary">{formatOrigin(target)}</dd>
            </div>
          </dl>

          <p className="text-sm leading-6 text-foreground-secondary">
            El balance se recalculará a partir del movimiento original y su reversión. Esta acción no edita ni elimina el registro confirmado.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border bg-surface px-6 py-4 sm:flex-row sm:justify-end">
          <Button disabled={submitting} onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          <Button disabled={submitting} onClick={onConfirm} type="button" variant="destructive">
            {submitting ? (
              <RefreshCw aria-hidden="true" className="animate-spin" />
            ) : (
              <RotateCcw aria-hidden="true" />
            )}
            Confirmar reversión
          </Button>
        </div>
      </div>
    </div>
  );
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
    const trigger = reversalTriggerRef.current;

    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
        reversalTriggerRef.current = null;
      });
    }
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

  const headerAction = <ActionLink href={backHref} label="Volver a Horas" />;

  return (
    <>
      <div data-slot="movement-history-screen" data-state={screenState}>
        <PageHeader
          action={headerAction}
          breadcrumbs={[
            { href: "/admin/hours", label: "Horas" },
            { label: "Movimientos" },
          ]}
          description={dataDescription}
          title="Movimientos"
        />

        {screenState === "success" && (
          <InlineStateNotice
            description={
              announcement ?? "La reversión se registró y el historial se actualizó."
            }
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            title="Reversión registrada"
            tone="success"
          />
        )}

        {announcement && screenState !== "success" && (
          <div
            aria-live="polite"
            className="mt-6 rounded-md border border-info/30 bg-info-surface/60 p-4 text-sm leading-6 text-foreground"
            role="status"
          >
            {announcement}
          </div>
        )}

        {screenState === "error" && (
          <InlineStateNotice
            action={
              <ActionLink
                href={stateDetail.actionHref ?? "/admin/hours/movements"}
                label={stateDetail.actionLabel ?? "Reintentar"}
              />
            }
            description={requestError ?? stateDetail.description}
            icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
            title={stateDetail.title}
            tone="danger"
          />
        )}

        {screenState === "required-action" && (
          <InlineStateNotice
            action={
              <ActionLink
                href={stateDetail.actionHref ?? "/admin/settings"}
                label={stateDetail.actionLabel ?? "Configurar ciclo"}
              />
            }
            description={stateDetail.description}
            icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
            title={stateDetail.title}
            tone="warning"
          />
        )}

        {screenState !== "error" && screenState !== "required-action" && (
          <>
            {requestError && movements.length > 0 && (
              <InlineStateNotice
                action={
                  <Button
                    onClick={() => void loadCycle(selectedCycleId, true)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Reintentar
                  </Button>
                }
                description={requestError}
                icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
                title="No se pudo actualizar el historial"
                tone="danger"
              />
            )}

            <HistoryFilters
              categories={filterCategories}
              categoryId={selectedCategoryId}
              cycles={cycles}
              cycleId={selectedCycleId}
              direction={direction}
              disabled={isLoading}
              onCategoryChange={setSelectedCategoryId}
              onClear={clearFilters}
              onCycleChange={(nextCycleId) => {
                setSelectedCycleId(nextCycleId);
                syncHistoryUrl(nextCycleId, "", "");
                void loadCycle(nextCycleId, false);
              }}
              onDirectionChange={setDirection}
              onReversalChange={setReversal}
              onSearchChange={setSearch}
              onSourceChange={setSource}
              onTutorChange={setSelectedTutorId}
              reversal={reversal}
              search={search}
              source={source}
              tutors={filterTutors}
              tutorId={selectedTutorId}
            />

            <p aria-live="polite" className="mt-4 text-sm text-foreground-secondary">
              {isLoading
                ? "Consultando movimientos persistidos…"
                : filteredMovements.length === 0 && hasActiveFilters
                  ? "No hay resultados para los filtros actuales."
                  : `Mostrando ${formatMovementCount(filteredMovements.length)}`}
            </p>

            {isLoading && <LoadingHistory />}

            {!isLoading && screenState === "empty" && (
              <div className="mt-4">
                <EmptyState
                  description="Los movimientos registrados en el ciclo seleccionado aparecerán aquí."
                  title="Todavía no hay movimientos"
                />
              </div>
            )}

            {!isLoading && screenState === "search-empty" && (
              <div className="mt-4">
                <EmptyState
                  action={
                    <Button onClick={clearFilters} type="button" variant="outline">
                      Limpiar filtros
                    </Button>
                  }
                  description="Probar con otro filtro o limpiar la búsqueda actual."
                  title="No encontramos movimientos"
                />
              </div>
            )}

            {!isLoading &&
              screenState !== "empty" &&
              screenState !== "search-empty" &&
              filteredMovements.length > 0 && (
                <ol className="mt-4 space-y-3" aria-label="Historial de movimientos">
                  {filteredMovements.map((movement) => (
                    <MovementHistoryRow
                      key={movement.id}
                      movement={movement}
                      onReverse={openReversal}
                      reverseDisabled={reversingMovementId !== null}
                    />
                  ))}
                </ol>
              )}
          </>
        )}
      </div>

      <ReversalDialog
        error={reversalError}
        onClose={closeReversal}
        onConfirm={() => void handleReverse()}
        submitting={reversingMovementId !== null}
        target={reversalTarget}
      />
    </>
  );
}
