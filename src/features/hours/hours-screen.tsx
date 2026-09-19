"use client";

import Link from "next/link";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type MouseEvent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  SafeHourBalance,
  SafeHourCategory,
  SafeHourMovement,
  SafeHourBulkMovementResult,
} from "@/features/hours/hour-service";
import type {
  HourMovementOperation,
  HoursScreenData,
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

export interface HoursScreenProps {
  data: HoursScreenData;
  initialErrorMessage?: string;
  state?: HoursScreenState;
  stateDetail?: HoursStateDetail;
}

type BalanceFilter = SafeHourBalance["state"] | "all";
type ActivityKind = NonNullable<SafeHourCategory["activityKind"]>;

const selectClassName =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

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

const defaultStateDetails: Partial<Record<HoursScreenState, HoursStateDetail>> = {
  empty: {
    actionLabel: "Registrar movimiento",
    description: "Registrar el primer movimiento para preparar el balance.",
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

type HourWorkspaceResponse = Pick<
  HoursScreenData,
  "currentCycle" | "balances" | "eligibleTutors" | "categories"
>;

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
    throw new HoursRequestError("internal_server_error");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HoursRequestError(getErrorCode(body));
  }

  return body as T;
}

function getHoursErrorMessage(error: unknown) {
  if (error instanceof HoursRequestError) {
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

function formatTutorCount(count: number) {
  return `${count} ${count === 1 ? "tutor" : "tutores"}`;
}

function formatDurationMinutes(minutes: number) {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const remainder = Math.abs(minutes) % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function formatSignedDuration(minutes: number) {
  return `${minutes < 0 ? "-" : "+"}${formatDurationMinutes(minutes)}`;
}

function parseDurationMinutes(hours: string, minutes: string) {
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

function formatActivityKind(kind: ActivityKind) {
  return activityKindLabels[kind];
}

function firstMovementCategoryId(categories: SafeHourCategory[]) {
  return categories.find((category) => category.activityKind !== "RECOVERY")?.id ?? "";
}

function formatMovementOrigin(movement: SafeHourMovement) {
  return movement.origin === null
    ? "Carga manual"
    : formatActivityKind(movement.origin.kind);
}

function applyMovementsToBalances(
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

function balanceStatusVariant(state: SafeHourBalance["state"]): StatusBadgeVariant {
  return state === "current" ? "success" : "danger";
}

function balanceStatusLabel(state: SafeHourBalance["state"]) {
  return state === "current" ? "Al día" : "Debe horas";
}

function balanceSearchText(balance: SafeHourBalance) {
  return normalizeSearchValue(
    [balance.tutor.formalName, balance.tutor.careerName, balance.cycle.name].join(" "),
  );
}

function normalizeSearchValue(value: string) {
  return value
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sortMovements(movements: SafeHourMovement[]) {
  return [...movements].sort((left, right) => {
    const dateOrder = right.movementDate.localeCompare(left.movementDate);

    return dateOrder === 0
      ? right.createdAt.localeCompare(left.createdAt)
      : dateOrder;
  });
}

function historyByTutor(movements: SafeHourMovement[]) {
  return movements.reduce<Record<string, SafeHourMovement[]>>((result, movement) => {
    const tutorMovements = result[movement.tutor.id] ?? [];
    result[movement.tutor.id] = sortMovements([...tutorMovements, movement]);
    return result;
  }, {});
}

function mergeHistory(
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
        <p className="mt-1 text-sm leading-6 text-foreground-secondary">{description}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

function FilterToolbar({
  categories,
  category,
  categoryLabel,
  disabled,
  onCategoryChange,
  onClear,
  onSearchChange,
  onStatusChange,
  search,
  searchPlaceholder,
  status,
  statusLabel,
}: {
  categories: SafeHourCategory[];
  category: string;
  categoryLabel: string;
  disabled: boolean;
  onCategoryChange: (value: string) => void;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: BalanceFilter) => void;
  search: string;
  searchPlaceholder: string;
  status: BalanceFilter;
  statusLabel: string;
}) {
  const hasActiveFilters = Boolean(search || category || status !== "all");

  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(14rem,1.4fr)_minmax(10rem,0.8fr)_minmax(12rem,1fr)_auto]">
      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground-secondary"
          htmlFor="hours-search"
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
            id="hours-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            type="search"
            value={search}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground-secondary"
          htmlFor="hours-status"
        >
          {statusLabel}
        </label>
        <select
          className={selectClassName}
          disabled={disabled}
          id="hours-status"
          onChange={(event) => onStatusChange(event.target.value as BalanceFilter)}
          value={status}
        >
          <option value="all">Todos</option>
          <option value="current">Al día</option>
          <option value="owes">Debe horas</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold text-foreground-secondary"
          htmlFor="hours-category"
        >
          {categoryLabel}
        </label>
        <select
          className={selectClassName}
          disabled={disabled}
          id="hours-category"
          onChange={(event) => onCategoryChange(event.target.value)}
          value={category}
        >
          <option value="">Todas</option>
          {categories.map((categoryOption) => (
            <option key={categoryOption.id} value={categoryOption.id}>
              {categoryOption.name}
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
    </div>
  );
}

function BalanceStatus({ balance }: { balance: SafeHourBalance }) {
  return (
    <StatusBadge
      label={balanceStatusLabel(balance.state)}
      variant={balanceStatusVariant(balance.state)}
    />
  );
}

function HistoryButton({
  onClick,
  tutor,
}: {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  tutor: string;
}) {
  return (
    <Button
      aria-label={`Ver movimientos de ${tutor}`}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      <Clock3 aria-hidden="true" />
      Ver movimientos
    </Button>
  );
}

function BalanceIdentity({ balance }: { balance: SafeHourBalance }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{balance.tutor.formalName}</p>
      <p className="mt-1 truncate text-xs text-foreground-muted">
        {balance.tutor.careerName} · {balance.cycle.name}
      </p>
    </div>
  );
}

function movementHistoryHref(balance: SafeHourBalance) {
  const params = new URLSearchParams({
    cycleId: balance.cycle.id,
    tutorId: balance.tutor.id,
  });

  return `/admin/hours/movements?${params.toString()}`;
}

function BalanceValue({ balance }: { balance: SafeHourBalance }) {
  return (
    <div>
      <p
        className={cn(
          "font-numeric text-xl font-bold tabular-nums tracking-tight",
          balance.state === "current" ? "text-success" : "text-danger",
        )}
      >
        {formatSignedDuration(balance.signedBalanceMinutes)}
      </p>
      <p className="mt-1 text-xs text-foreground-muted">Saldo firmado del ciclo</p>
    </div>
  );
}

function BalanceLists({
  balances,
  onHistory,
}: {
  balances: SafeHourBalance[];
  onHistory: (balance: SafeHourBalance, trigger: HTMLElement) => void;
}) {
  const renderHistoryButton = (balance: SafeHourBalance) => (
    <HistoryButton
      onClick={(event) => onHistory(balance, event.currentTarget)}
      tutor={balance.tutor.formalName}
    />
  );

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-surface">
      <div className="hidden lg:block">
        <Table className="min-w-[52rem]">
          <TableHeader>
            <TableRow>
              <TableHead>Tutor</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Historial</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((balance) => (
              <TableRow id={`balance-${balance.tutor.id}`} key={balance.tutor.id}>
                <TableCell>
                  <BalanceIdentity balance={balance} />
                </TableCell>
                <TableCell>
                  <BalanceValue balance={balance} />
                </TableCell>
                <TableCell>
                  <BalanceStatus balance={balance} />
                </TableCell>
                <TableCell className="text-right">{renderHistoryButton(balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="hidden md:block lg:hidden">
        <Table className="min-w-[40rem]">
          <TableHeader>
            <TableRow>
              <TableHead>Tutor</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Historial</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((balance) => (
              <TableRow id={`balance-${balance.tutor.id}`} key={balance.tutor.id}>
                <TableCell>
                  <BalanceIdentity balance={balance} />
                </TableCell>
                <TableCell>
                  <BalanceValue balance={balance} />
                </TableCell>
                <TableCell>
                  <BalanceStatus balance={balance} />
                </TableCell>
                <TableCell className="text-right">{renderHistoryButton(balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y divide-border-subtle md:hidden">
        {balances.map((balance) => (
          <article
            className="scroll-mt-8 space-y-4 p-4"
            id={`balance-${balance.tutor.id}`}
            key={balance.tutor.id}
          >
            <div className="flex items-start justify-between gap-4">
              <BalanceIdentity balance={balance} />
              <BalanceStatus balance={balance} />
            </div>
            <div className="flex items-end justify-between gap-4">
              <BalanceValue balance={balance} />
              {renderHistoryButton(balance)}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LoadingBalanceList() {
  const rows = ["one", "two", "three", "four"];

  return (
    <div
      aria-label="Cargando saldos"
      aria-live="polite"
      className="mt-4 overflow-hidden rounded-md border border-border bg-surface"
      role="status"
    >
      <span className="sr-only">Cargando saldos</span>
      <div className="hidden lg:block">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_10rem] gap-4 border-b border-border px-3 py-3">
          {rows.map((key) => (
            <span className="h-3 animate-pulse rounded-sm bg-surface-subtle" key={key} />
          ))}
        </div>
        {rows.map((key) => (
          <div
            className="grid grid-cols-[1.5fr_1fr_1fr_10rem] gap-4 border-b border-border-subtle px-3 py-5 last:border-b-0"
            key={key}
          >
            <span className="h-5 w-36 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-6 w-20 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-6 w-20 animate-pulse rounded-full bg-surface-subtle" />
            <span className="h-8 w-32 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
      <div className="hidden md:block lg:hidden">
        {rows.map((key) => (
          <div
            className="grid grid-cols-[1.4fr_1fr_1fr_9rem] gap-4 border-b border-border-subtle px-3 py-5 last:border-b-0"
            key={key}
          >
            <span className="h-5 w-36 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-6 w-20 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-6 w-20 animate-pulse rounded-full bg-surface-subtle" />
            <span className="h-8 w-28 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-border-subtle md:hidden">
        {rows.map((key) => (
          <div className="space-y-4 p-4" key={key}>
            <div className="h-5 w-36 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="h-6 w-24 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="h-8 w-full animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
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

function MovementHistorySheet({
  balance,
  entries,
  error,
  loading,
  onClose,
  onRetry,
  open,
}: {
  balance: SafeHourBalance | null;
  entries: SafeHourMovement[];
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onRetry: () => void;
  open: boolean;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useOverlayFocus({
    initialFocusRef: closeButtonRef,
    onClose,
    open,
    panelRef,
  });

  if (!open || !balance) {
    return null;
  }

  return (
    <div
      aria-label="Cerrar historial de movimientos"
      className="fixed inset-0 z-[70] flex justify-end bg-brand-navy/30"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby="hours-history-description"
        aria-labelledby="hours-history-title"
        aria-modal="true"
        className="flex h-full w-full max-w-[38rem] flex-col border-l border-border bg-surface shadow-2xl"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Historial contextual
            </p>
            <h2
              className="mt-2 truncate text-xl font-bold tracking-tight text-foreground"
              id="hours-history-title"
            >
              {balance.tutor.formalName}
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-foreground-secondary"
              id="hours-history-description"
            >
              Movimientos del {balance.cycle.name}. El saldo firmado se calcula a partir de los movimientos confirmados.
            </p>
          </div>
          <button
            aria-label="Cerrar historial de movimientos"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-md border border-border-subtle bg-surface-subtle/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
                  Saldo firmado
                </p>
                <p className="mt-2 font-numeric text-3xl font-bold tabular-nums text-foreground">
                  {formatSignedDuration(balance.signedBalanceMinutes)}
                </p>
              </div>
              <BalanceStatus balance={balance} />
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground-secondary">
              El estado se acompaña con texto y no depende solo del color.
            </p>
          </div>

          <section aria-labelledby="hours-history-list-title" className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-foreground" id="hours-history-list-title">
                Movimientos
              </h3>
              <span className="text-xs text-foreground-muted">
                {entries.length} {entries.length === 1 ? "registro" : "registros"}
              </span>
            </div>

            {loading ? (
              <div className="mt-4 rounded-md border border-border-subtle bg-surface-subtle/60 p-4 text-sm text-foreground-secondary" role="status">
                Cargando movimientos…
              </div>
            ) : error ? (
              <InlineStateNotice
                action={
                  <Button onClick={onRetry} size="sm" type="button" variant="outline">
                    Reintentar
                  </Button>
                }
                description={error}
                icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
                title="No se pudo cargar el historial"
                tone="danger"
              />
            ) : entries.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed border-border p-4 text-sm leading-6 text-foreground-secondary">
                Todavía no hay movimientos para este tutor en el ciclo actual.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {entries.map((entry) => (
                  <li
                    className="rounded-md border border-border-subtle bg-surface p-4"
                    key={entry.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {formatDate(entry.movementDate)} · {entry.category.name}
                        </p>
                        <p className="mt-1 text-xs text-foreground-muted">
                          {directionLabels[entry.direction]} · {formatDurationMinutes(entry.durationMinutes)} · {formatMovementOrigin(entry)}
                        </p>
                      </div>
                      <StatusBadge
                        label={
                          entry.reversalState === "REVERSED"
                            ? "Revertido"
                            : entry.reversalState === "REVERSAL"
                              ? "Reversión"
                              : "Confirmado"
                        }
                        variant={entry.reversalState === "REVERSED" ? "warning" : "neutral"}
                      />
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium text-foreground-muted">Nota</dt>
                        <dd className="mt-1 leading-6 text-foreground-secondary">
                          {entry.note ?? "Sin nota"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-foreground-muted">Actor</dt>
                        <dd className="mt-1 text-foreground-secondary">{entry.actor.displayName}</dd>
                      </div>
                    </dl>

                    {entry.origin !== null && (
                      <p className="mt-4 rounded-sm border border-info/30 bg-info-surface/60 p-3 text-xs leading-5 text-foreground-secondary">
                        Origen registrado: {formatActivityKind(entry.origin.kind)} · {formatDate(entry.origin.activityDate)}
                      </p>
                    )}

                    {entry.reversalState === "REVERSED" && (
                      <p className="mt-4 rounded-sm border border-warning/30 bg-warning-surface/60 p-3 text-xs leading-5 text-foreground-secondary">
                        El movimiento original se conserva sin editar y se muestra como revertido.
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="border-t border-border bg-surface px-6 py-4">
          <p className="text-xs leading-5 text-foreground-muted">
            Este historial se consulta desde los movimientos persistidos y no modifica saldos directamente.
          </p>
          <Link
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3")}
            href={movementHistoryHref(balance)}
          >
            Ver historial completo
          </Link>
        </div>
      </div>
    </div>
  );
}

function MovementDialog({
  category,
  data,
  date,
  direction,
  durationHours,
  durationMinutes,
  errorMessage,
  note,
  onCategoryChange,
  onClose,
  onDateChange,
  onDirectionChange,
  onDurationHoursChange,
  onDurationMinutesChange,
  onNoteChange,
  onOperationChange,
  onSubmit,
  onToggleAll,
  onToggleTutor,
  operation,
  open,
  selectedTutorIds,
  submitting,
}: {
  category: string;
  data: HoursScreenData;
  date: string;
  direction: "CREDIT" | "DEBIT";
  durationHours: string;
  durationMinutes: string;
  errorMessage: string | null;
  note: string;
  onCategoryChange: (value: string) => void;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onDirectionChange: (value: "CREDIT" | "DEBIT") => void;
  onDurationHoursChange: (value: string) => void;
  onDurationMinutesChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onOperationChange: (value: HourMovementOperation) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleAll: () => void;
  onToggleTutor: (tutorId: string) => void;
  operation: HourMovementOperation;
  open: boolean;
  selectedTutorIds: string[];
  submitting: boolean;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectedCategory = data.categories.find((option) => option.id === category);
  const availableCategories = data.categories.filter((option) =>
    operation === "RECOVERY"
      ? option.activityKind === "RECOVERY"
      : option.activityKind !== "RECOVERY",
  );
  const allSelected =
    data.eligibleTutors.length > 0 &&
    selectedTutorIds.length === data.eligibleTutors.length;
  const hasPartialSelection = selectedTutorIds.length > 0 && !allSelected;
  const durationTotal = parseDurationMinutes(durationHours, durationMinutes);
  const selectedOrigin = selectedCategory?.activityKind
    ? formatActivityKind(selectedCategory.activityKind)
    : "Carga manual";
  const operationLabel =
    operation === "RECOVERY" ? "Reconocer recuperación" : "Registrar movimiento";
  const canUseDebit = selectedCategory?.activityKind === null || selectedCategory === undefined;
  const canSubmit = Boolean(
    data.currentCycle?.id &&
      category &&
      date &&
      selectedTutorIds.length > 0 &&
      durationTotal > 0 &&
      (operation !== "RECOVERY" || selectedCategory?.activityKind === "RECOVERY"),
  );
  const directionLabel = directionLabels[direction];
  const summary = `${operationLabel} · ${directionLabel} · ${selectedCategory?.name ?? "Sin categoría"} · ${selectedOrigin} · ${formatDurationMinutes(durationTotal)} · ${formatTutorCount(selectedTutorIds.length)} · ${date ? formatDate(date) : "Sin fecha"}`;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasPartialSelection;
    }
  }, [hasPartialSelection]);

  useOverlayFocus({
    initialFocusRef: closeButtonRef,
    onClose,
    open,
    panelRef,
  });

  if (!open) {
    return null;
  }

  return (
    <div
      aria-label="Cerrar diálogo de movimiento"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-brand-navy/30 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby="hours-movement-description"
        aria-labelledby="hours-movement-title"
        aria-modal="true"
        className="flex h-full max-h-[100svh] w-full flex-col border-border bg-surface shadow-2xl sm:h-auto sm:max-h-[calc(100svh-3rem)] sm:max-w-[44rem] sm:rounded-md sm:border"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Transacción atómica
            </p>
            <h2
              className="mt-2 text-xl font-bold tracking-tight text-foreground"
              id="hours-movement-title"
            >
              Registrar movimiento
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-foreground-secondary"
              id="hours-movement-description"
            >
              Revisar el resumen antes de registrar el mismo movimiento para todos los tutores seleccionados.
            </p>
          </div>
          <button
            aria-label="Cerrar diálogo de movimiento"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
            {errorMessage && (
              <div
                aria-live="assertive"
                className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-surface/60 p-4 text-sm text-danger"
                role="alert"
              >
                <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <fieldset>
              <legend className="text-sm font-bold text-foreground">Tipo de registro</legend>
              <div
                aria-label="Tipo de registro"
                className="mt-3 grid grid-cols-2 gap-2"
                role="radiogroup"
              >
                {(
                  [
                    ["MOVEMENT", "Movimiento"],
                    ["RECOVERY", "Reconocer recuperación"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center justify-center rounded-sm border px-4 text-sm font-semibold transition-colors focus-within:ring-3 focus-within:ring-ring",
                      operation === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-foreground-secondary hover:bg-surface-subtle",
                    )}
                    key={value}
                  >
                    <input
                      checked={operation === value}
                      className="sr-only"
                      name="movement-operation"
                      onChange={() => onOperationChange(value)}
                      type="radio"
                      value={value}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-bold text-foreground">Dirección</legend>
              <div aria-label="Dirección" className="mt-3 grid grid-cols-2 gap-2" role="radiogroup">
                {(["CREDIT", "DEBIT"] as const).map((option) => {
                  const isDisabled = option === "DEBIT" && (!canUseDebit || operation === "RECOVERY");
                  const isSelected = option === direction;

                  return (
                    <label
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center justify-center rounded-sm border px-4 text-sm font-semibold transition-colors focus-within:ring-3 focus-within:ring-ring",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-surface text-foreground-secondary hover:bg-surface-subtle",
                        isDisabled && "cursor-not-allowed opacity-50",
                      )}
                      key={option}
                    >
                      <input
                        checked={isSelected}
                        className="sr-only"
                        disabled={isDisabled}
                        name="movement-direction"
                        onChange={() => onDirectionChange(option)}
                        type="radio"
                        value={option}
                      />
                      {directionLabels[option]}
                    </label>
                  );
                })}
              </div>
              {selectedCategory?.activityKind && (
                <p className="mt-2 text-xs leading-5 text-foreground-secondary">
                  Las categorías de {formatActivityKind(selectedCategory.activityKind).toLocaleLowerCase("es-AR")} requieren un crédito.
                </p>
              )}
            </fieldset>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="movement-category">
                Categoría
              </label>
              <select
                className={selectClassName}
                disabled={submitting || availableCategories.length === 0}
                id="movement-category"
                onChange={(event) => onCategoryChange(event.target.value)}
                required
                value={category}
              >
                <option value="">
                  {operation === "RECOVERY" && availableCategories.length === 0
                    ? "No hay categoría de recuperación activa"
                    : "Seleccionar categoría"}
                </option>
                {availableCategories.map((categoryOption) => (
                  <option key={categoryOption.id} value={categoryOption.id}>
                    {categoryOption.name}
                    {categoryOption.activityKind
                      ? ` · ${formatActivityKind(categoryOption.activityKind)}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-foreground">Duración</legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="movement-hours">
                    Horas
                  </label>
                  <Input
                    disabled={submitting}
                    id="movement-hours"
                    inputMode="numeric"
                    max="1666"
                    min="0"
                    onChange={(event) => onDurationHoursChange(event.target.value)}
                    type="number"
                    value={durationHours}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="movement-minutes">
                    Minutos
                  </label>
                  <Input
                    disabled={submitting}
                    id="movement-minutes"
                    inputMode="numeric"
                    max="59"
                    min="0"
                    onChange={(event) => onDurationMinutesChange(event.target.value)}
                    type="number"
                    value={durationMinutes}
                  />
                </div>
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="movement-date">
                Fecha administrativa
              </label>
              <div className="relative">
                <CalendarDays
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
                />
                <Input
                  className="pl-9"
                  disabled={submitting}
                  id="movement-date"
                  onChange={(event) => onDateChange(event.target.value)}
                  required
                  type="date"
                  value={date}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="movement-note">
                Nota
              </label>
              <textarea
                className="min-h-24 w-full resize-y rounded-sm border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground shadow-xs outline-none transition-colors placeholder:text-foreground-muted focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
                id="movement-note"
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Agregar contexto opcional"
                value={note}
              />
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-foreground">Tutores</legend>
              <div className="mt-3 rounded-md border border-border-subtle bg-surface-subtle/60">
                <label className="flex items-center gap-3 border-b border-border-subtle px-4 py-3 text-sm font-semibold text-foreground">
                  <input
                    aria-checked={hasPartialSelection ? "mixed" : allSelected}
                    aria-label="Seleccionar todos"
                    checked={allSelected}
                    className="h-4 w-4 rounded border-border text-primary accent-primary focus-visible:ring-3 focus-visible:ring-ring"
                    disabled={submitting || data.eligibleTutors.length === 0}
                    onChange={onToggleAll}
                    ref={selectAllRef}
                    type="checkbox"
                  />
                  <span>Seleccionar todos</span>
                  <span className="ml-auto text-xs font-normal text-foreground-muted">
                    {selectedTutorIds.length} de {data.eligibleTutors.length}
                  </span>
                </label>
                <div aria-live="polite" className="sr-only">
                  Seleccionar todos: {selectedTutorIds.length} de {data.eligibleTutors.length} tutores seleccionados
                  {hasPartialSelection ? ", selección mixta" : ""}.
                </div>
                <div className="divide-y divide-border-subtle">
                  {data.eligibleTutors.map((tutor) => {
                    const isSelected = selectedTutorIds.includes(tutor.id);

                    return (
                      <label className="flex cursor-pointer items-start gap-3 px-4 py-3" key={tutor.id}>
                        <input
                          aria-label={`Seleccionar a ${tutor.formalName}`}
                          checked={isSelected}
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-primary focus-visible:ring-3 focus-visible:ring-ring"
                          disabled={submitting}
                          onChange={() => onToggleTutor(tutor.id)}
                          type="checkbox"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{tutor.formalName}</span>
                          <span className="mt-1 block text-xs leading-5 text-foreground-muted">{tutor.careerName}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </fieldset>

            <section aria-labelledby="movement-summary-title" className="rounded-md border border-info/30 bg-info-surface/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-info" id="movement-summary-title">
                Resumen explícito
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{summary}</p>
              <p className="mt-2 text-xs leading-5 text-foreground-secondary">
                La transacción se confirma sólo cuando todos los movimientos seleccionados pueden registrarse.
              </p>
            </section>
          </div>

          <div className="border-t border-border bg-surface px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button disabled={submitting} onClick={onClose} type="button" variant="outline">
                Cancelar
              </Button>
              <Button disabled={submitting || !canSubmit} type="submit">
                {submitting ? <RefreshCw aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
                {operation === "RECOVERY" ? "Reconocer recuperación" : "Registrar movimientos"}
              </Button>
            </div>
            <p className="mt-3 text-center text-xs leading-5 text-foreground-muted sm:text-right">
              No se modifica ningún saldo directamente; el balance se deriva de los movimientos registrados.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export function HoursScreen({
  data,
  initialErrorMessage,
  state = "default",
  stateDetail,
}: HoursScreenProps) {
  const [workspace, setWorkspace] = useState<HourWorkspaceResponse>({
    currentCycle: data.currentCycle,
    balances: data.balances,
    eligibleTutors: data.eligibleTutors,
    categories: data.categories,
  });
  const [historyCache, setHistoryCache] = useState<Record<string, SafeHourMovement[]>>(() =>
    historyByTutor(data.history),
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BalanceFilter>("all");
  const [category, setCategory] = useState("");
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [historyBalance, setHistoryBalance] = useState<SafeHourBalance | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mutationSuccess, setMutationSuccess] = useState(false);
  const [selectedTutorIds, setSelectedTutorIds] = useState<string[]>(() =>
    data.eligibleTutors.map((tutor) => tutor.id),
  );
  const [operation, setOperation] = useState<HourMovementOperation>("MOVEMENT");
  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [movementCategory, setMovementCategory] = useState(() =>
    firstMovementCategoryId(data.categories),
  );
  const [durationHours, setDurationHours] = useState("01");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [movementDate, setMovementDate] = useState(data.currentCycle?.startDate ?? "");
  const [movementNote, setMovementNote] = useState("");
  const movementTriggerRef = useRef<HTMLElement | null>(null);
  const historyTriggerRef = useRef<HTMLElement | null>(null);

  const screenState = mutationSuccess && state === "default" ? "success" : state;
  const stateData = stateDetail ?? defaultStateDetails[screenState];
  const history = useMemo(
    () => Object.values(historyCache).flatMap((entries) => entries),
    [historyCache],
  );
  const filteredBalances = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search.trim());

    return workspace.balances.filter((balance) => {
      const matchesSearch =
        !normalizedSearch || balanceSearchText(balance).includes(normalizedSearch);
      const matchesStatus = status === "all" || balance.state === status;
      const matchesCategory =
        !category ||
        history.some(
          (entry) =>
            entry.tutor.id === balance.tutor.id && entry.category.id === category,
        );

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [category, history, search, status, workspace.balances]);
  const hasActiveFilters = Boolean(search || category || status !== "all");
  const shouldShowSearchEmpty =
    screenState === "search-empty" ||
    (screenState === "default" && hasActiveFilters && filteredBalances.length === 0);

  const openMovementDialog = useCallback((trigger: HTMLElement) => {
    movementTriggerRef.current = trigger;
    setAnnouncement(null);
    setMutationSuccess(false);
    setOperationError(null);
    setMovementDialogOpen(true);
  }, []);

  const closeMovementDialog = useCallback(() => {
    setMovementDialogOpen(false);
    setOperationError(null);
    const trigger = movementTriggerRef.current;

    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
        movementTriggerRef.current = null;
      });
    }
  }, []);

  const loadHistory = useCallback(async (balance: SafeHourBalance) => {
    if (balance.cycle.id.length === 0) {
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await requestJson<{ movements: SafeHourMovement[] }>(
        `/api/admin/hours/movements?cycleId=${encodeURIComponent(balance.cycle.id)}&tutorId=${encodeURIComponent(balance.tutor.id)}&limit=200`,
      );
      setHistoryCache((current) => ({
        ...current,
        [balance.tutor.id]: sortMovements(response.movements),
      }));
    } catch (error) {
      setHistoryError(getHoursErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = useCallback(
    (balance: SafeHourBalance, trigger: HTMLElement) => {
      historyTriggerRef.current = trigger;
      setHistoryBalance(balance);
      void loadHistory(balance);
    },
    [loadHistory],
  );

  const closeHistory = useCallback(() => {
    setHistoryBalance(null);
    setHistoryError(null);
    const trigger = historyTriggerRef.current;

    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
        historyTriggerRef.current = null;
      });
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus("all");
    setCategory("");
    setAnnouncement("Los filtros se limpiaron y la selección visible volvió a quedar explícita.");
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedTutorIds((currentSelection) => {
      const eligibleIds = workspace.eligibleTutors.map((tutor) => tutor.id);
      const allSelected =
        eligibleIds.length > 0 && currentSelection.length === eligibleIds.length;

      return allSelected ? [] : eligibleIds;
    });
  }, [workspace.eligibleTutors]);

  const handleToggleTutor = useCallback((tutorId: string) => {
    setSelectedTutorIds((currentSelection) =>
      currentSelection.includes(tutorId)
        ? currentSelection.filter((selectedId) => selectedId !== tutorId)
        : [...currentSelection, tutorId],
    );
  }, []);

  const handleOperationChange = useCallback(
    (nextOperation: HourMovementOperation) => {
      setOperation(nextOperation);

      if (nextOperation === "RECOVERY") {
        setDirection("CREDIT");
        setMovementCategory(
          workspace.categories.find((option) => option.activityKind === "RECOVERY")?.id ?? "",
        );
        return;
      }

      const currentCategory = workspace.categories.find(
        (option) => option.id === movementCategory,
      );
      setMovementCategory(
        currentCategory?.activityKind === "RECOVERY"
          ? firstMovementCategoryId(workspace.categories)
          : movementCategory,
      );
    },
    [movementCategory, workspace.categories],
  );

  const handleCategoryChange = useCallback(
    (nextCategory: string) => {
      setMovementCategory(nextCategory);
      const selected = workspace.categories.find((option) => option.id === nextCategory);

      if (selected?.activityKind) {
        setDirection("CREDIT");
      }
    },
    [workspace.categories],
  );

  const refreshWorkspaceAndHistory = useCallback(async (cycleId: string) => {
    const nextWorkspace = await requestJson<HourWorkspaceResponse>("/api/admin/hours");
    const nextHistory = await requestJson<{ movements: SafeHourMovement[] }>(
      `/api/admin/hours/movements?cycleId=${encodeURIComponent(cycleId)}&limit=200`,
    );
    setWorkspace(nextWorkspace);
    setHistoryCache(historyByTutor(nextHistory.movements));
    setSelectedTutorIds(nextWorkspace.eligibleTutors.map((tutor) => tutor.id));
  }, []);

  const handleMovementSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const cycleId = workspace.currentCycle?.id;

      if (!cycleId || submitting) {
        return;
      }

      setSubmitting(true);
      setOperationError(null);

      const payload = {
        categoryId: movementCategory,
        cycleId,
        direction: operation === "RECOVERY" ? "CREDIT" : direction,
        duration: {
          hours: Number(durationHours),
          minutes: Number(durationMinutes),
        },
        movementDate,
        note: movementNote.trim() === "" ? null : movementNote.trim(),
        operation,
        tutorIds: selectedTutorIds,
      } as const;

      let result: SafeHourBulkMovementResult;

      try {
        result = await requestJson<SafeHourBulkMovementResult>(
          "/api/admin/hours/movements",
          {
            body: JSON.stringify(payload),
            method: "POST",
          },
        );
      } catch (error) {
        setOperationError(`No se registró ningún movimiento. ${getHoursErrorMessage(error)}`);
        setSubmitting(false);
        return;
      }

      setHistoryCache((current) => mergeHistory(current, result.movements));
      setWorkspace((current) => ({
        ...current,
        balances: applyMovementsToBalances(current.balances, result.movements),
      }));

      let refreshWarning: string | null = null;

      try {
        await refreshWorkspaceAndHistory(cycleId);
      } catch {
        refreshWarning =
          "No se pudo actualizar la vista completa; volver a cargar Horas para consultar el saldo actualizado.";
      }

      const selectedCategory = workspace.categories.find(
        (option) => option.id === movementCategory,
      );
      const origin = result.origin
        ? formatActivityKind(result.origin.kind)
        : selectedCategory?.activityKind
          ? formatActivityKind(selectedCategory.activityKind)
          : "Carga manual";
      const affectedCount = result.movements.length;
      const mutationAnnouncement = `Se registraron movimientos para ${formatTutorCount(affectedCount)}. Origen: ${origin}.`;

      setAnnouncement(
        refreshWarning === null
          ? mutationAnnouncement
          : `${mutationAnnouncement} ${refreshWarning}`,
      );
      setMutationSuccess(true);
      setOperation("MOVEMENT");
      setDirection("CREDIT");
      setMovementCategory(firstMovementCategoryId(workspace.categories));
      setDurationHours("01");
      setDurationMinutes("30");
      setMovementDate(workspace.currentCycle?.startDate ?? "");
      setMovementNote("");
      setSubmitting(false);
      closeMovementDialog();
    },
    [
      closeMovementDialog,
      direction,
      durationHours,
      durationMinutes,
      movementCategory,
      movementDate,
      movementNote,
      operation,
      refreshWorkspaceAndHistory,
      selectedTutorIds,
      submitting,
      workspace.categories,
      workspace.currentCycle?.id,
      workspace.currentCycle?.startDate,
    ],
  );

  const currentHistoryEntries = historyBalance
    ? historyCache[historyBalance.tutor.id] ?? []
    : [];
  const headerStateDetail = stateData ?? defaultStateDetails.error!;
  const headerAction =
    screenState === "required-action" ? (
      <ActionLink
        href={headerStateDetail.actionHref ?? "/admin/settings"}
        label={headerStateDetail.actionLabel ?? "Configurar ciclo"}
      />
    ) : (
      <div className="flex flex-wrap gap-2">
        <ActionLink href="/admin/hours/movements" label="Ver movimientos" />
        <Button
          disabled={screenState === "loading" || workspace.categories.length === 0 || workspace.eligibleTutors.length === 0}
          onClick={(event) => openMovementDialog(event.currentTarget)}
          type="button"
        >
          <Plus aria-hidden="true" />
          Registrar movimiento
        </Button>
      </div>
    );

  return (
    <>
      <div
        aria-hidden={movementDialogOpen || Boolean(historyBalance) ? true : undefined}
        data-slot="hours-screen"
        data-state={screenState}
      >
        <PageHeader action={headerAction} description={data.description} title="Horas" />

        {screenState === "success" && (
          <InlineStateNotice
            description={
              announcement ?? "La transacción se completó y el saldo se actualizó."
            }
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            title="Movimiento registrado"
            tone="success"
          />
        )}

        {announcement && screenState !== "success" && (
          <div
            aria-live="polite"
            className="mt-6 flex items-start gap-3 rounded-md border border-info/30 bg-info-surface/60 p-4"
            role="status"
          >
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <p className="text-sm leading-6 text-foreground">{announcement}</p>
          </div>
        )}

        {screenState === "error" && (
          <InlineStateNotice
            action={
              <ActionLink
                href={headerStateDetail.actionHref ?? "/admin/hours"}
                label={headerStateDetail.actionLabel ?? "Reintentar"}
              />
            }
            description={initialErrorMessage ?? headerStateDetail.description}
            icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
            title={headerStateDetail.title}
            tone="danger"
          />
        )}

        {screenState === "required-action" && (
          <InlineStateNotice
            action={
              <ActionLink
                href={headerStateDetail.actionHref ?? "/admin/settings"}
                label={headerStateDetail.actionLabel ?? "Configurar ciclo"}
              />
            }
            description={headerStateDetail.description}
            icon={<Settings2 aria-hidden="true" className="h-5 w-5" />}
            title={headerStateDetail.title}
            tone="warning"
          />
        )}

        {screenState !== "error" && screenState !== "required-action" && (
          <>
            <FilterToolbar
              categories={workspace.categories}
              category={category}
              categoryLabel={data.categoryFilterLabel}
              disabled={screenState === "loading" || screenState === "empty"}
              onCategoryChange={setCategory}
              onClear={clearFilters}
              onSearchChange={setSearch}
              onStatusChange={setStatus}
              search={search}
              searchPlaceholder={data.searchPlaceholder}
              status={status}
              statusLabel={data.statusFilterLabel}
            />

            <p aria-live="polite" className="mt-4 text-sm text-foreground-secondary">
              {screenState === "loading"
                ? "Preparando los saldos del ciclo…"
                : screenState === "empty"
                  ? "Todavía no hay saldos cargados."
                  : shouldShowSearchEmpty
                    ? "No hay resultados para la búsqueda actual."
                    : `Mostrando ${formatTutorCount(filteredBalances.length)}`}
            </p>

            {screenState === "loading" && <LoadingBalanceList />}

            {screenState === "empty" && (
              <div className="mt-4">
                <EmptyState
                  action={
                    <Button
                      onClick={(event) => openMovementDialog(event.currentTarget)}
                      type="button"
                    >
                      <Plus aria-hidden="true" />
                      {stateData?.actionLabel ?? "Registrar movimiento"}
                    </Button>
                  }
                  description={stateData?.description ?? "Registrar el primer movimiento para preparar el balance."}
                  title={stateData?.title ?? "Todavía no hay saldos"}
                />
              </div>
            )}

            {shouldShowSearchEmpty && (
              <div className="mt-4">
                <EmptyState
                  action={
                    <Button onClick={clearFilters} type="button" variant="outline">
                      Limpiar filtros
                    </Button>
                  }
                  description={stateData?.description ?? "Probar con otro nombre o limpiar los filtros."}
                  title={stateData?.title ?? "No encontramos balances"}
                />
              </div>
            )}

            {screenState !== "loading" &&
              screenState !== "empty" &&
              !shouldShowSearchEmpty && (
                <BalanceLists balances={filteredBalances} onHistory={openHistory} />
              )}
          </>
        )}
      </div>

      <MovementDialog
        category={movementCategory}
        data={{ ...data, ...workspace, history: history }}
        date={movementDate}
        direction={direction}
        durationHours={durationHours}
        durationMinutes={durationMinutes}
        errorMessage={operationError}
        note={movementNote}
        onCategoryChange={handleCategoryChange}
        onClose={closeMovementDialog}
        onDateChange={setMovementDate}
        onDirectionChange={setDirection}
        onDurationHoursChange={setDurationHours}
        onDurationMinutesChange={setDurationMinutes}
        onNoteChange={setMovementNote}
        onOperationChange={handleOperationChange}
        onSubmit={handleMovementSubmit}
        onToggleAll={handleToggleAll}
        onToggleTutor={handleToggleTutor}
        open={movementDialogOpen}
        operation={operation}
        selectedTutorIds={selectedTutorIds}
        submitting={submitting}
      />

      <MovementHistorySheet
        balance={historyBalance}
        entries={currentHistoryEntries}
        error={historyError}
        loading={historyLoading}
        onClose={closeHistory}
        onRetry={() => {
          if (historyBalance) {
            void loadHistory(historyBalance);
          }
        }}
        open={Boolean(historyBalance)}
      />
    </>
  );
}
