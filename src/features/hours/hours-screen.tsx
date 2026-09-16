"use client";

import Link from "next/link";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type MouseEvent,
  type RefObject,
  type ReactNode,
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
import {
  hoursStateFixtures,
  type BalanceRow,
  type BalanceState,
  type HoursScreenData,
  type MovementDirection,
  type MovementHistoryRow,
} from "@/mocks/hours.mock";
import type { ScreenStateFixture } from "@/mocks/screen-state";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import {
  StatusBadge,
  type StatusBadgeVariant,
} from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

export type HoursScreenState =
  | "default"
  | "loading"
  | "empty"
  | "search-empty"
  | "error"
  | "success"
  | "required-action";

export interface HoursScreenProps {
  data: HoursScreenData;
  state?: HoursScreenState;
}

type BalanceFilter = BalanceState | "all";

const selectClassName =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function findStateData(state: HoursScreenState): ScreenStateFixture | undefined {
  if (state === "default" || state === "success") {
    return undefined;
  }

  return hoursStateFixtures.find(
    (stateData) => stateData.state === state,
  );
}

function normalizeSearchValue(value: string) {
  return value
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

function formatDuration(hours: string, minutes: string) {
  const normalizedHours = hours.trim() === "" ? "00" : hours.padStart(2, "0");
  const normalizedMinutes = minutes.trim() === "" ? "00" : minutes.padStart(2, "0");

  return `${normalizedHours}:${normalizedMinutes}`;
}

function balanceStatusVariant(state: BalanceState): StatusBadgeVariant {
  return state === "current" ? "success" : "danger";
}

function balanceSearchText(balance: BalanceRow) {
  return normalizeSearchValue([balance.tutor, balance.cycle].join(" "));
}

function PreviewActionLink({ href, label }: { href: string; label: string }) {
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
  category,
  categoryLabel,
  categories,
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
  category: string;
  categoryLabel: string;
  categories: string[];
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
            <option key={categoryOption} value={categoryOption}>
              {categoryOption}
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

function BalanceStatus({ balance }: { balance: BalanceRow }) {
  return (
    <StatusBadge
      label={balance.stateLabel}
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

function BalanceIdentity({ balance }: { balance: BalanceRow }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{balance.tutor}</p>
      <p className="mt-1 truncate text-xs text-foreground-muted">{balance.cycle}</p>
    </div>
  );
}

function BalanceValue({ balance }: { balance: BalanceRow }) {
  return (
    <div>
      <p
        className={cn(
          "font-numeric text-xl font-bold tabular-nums tracking-tight",
          balance.state === "current" ? "text-success" : "text-danger",
        )}
      >
        {balance.signedBalance}
      </p>
      <p className="mt-1 text-xs text-foreground-muted">Saldo firmado del ciclo</p>
    </div>
  );
}

function BalanceLists({
  balances,
  onHistory,
}: {
  balances: BalanceRow[];
  onHistory: (balance: BalanceRow, trigger: HTMLElement) => void;
}) {
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
              <TableRow key={balance.id}>
                <TableCell>
                  <BalanceIdentity balance={balance} />
                </TableCell>
                <TableCell>
                  <BalanceValue balance={balance} />
                </TableCell>
                <TableCell>
                  <BalanceStatus balance={balance} />
                </TableCell>
                <TableCell className="text-right">
                  <HistoryButton
                    onClick={(event) => onHistory(balance, event.currentTarget)}
                    tutor={balance.tutor}
                  />
                </TableCell>
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
              <TableRow key={balance.id}>
                <TableCell>
                  <BalanceIdentity balance={balance} />
                </TableCell>
                <TableCell>
                  <BalanceValue balance={balance} />
                </TableCell>
                <TableCell>
                  <BalanceStatus balance={balance} />
                </TableCell>
                <TableCell className="text-right">
                  <HistoryButton
                    onClick={(event) => onHistory(balance, event.currentTarget)}
                    tutor={balance.tutor}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y divide-border-subtle md:hidden">
        {balances.map((balance) => (
          <article className="space-y-4 p-4" key={balance.id}>
            <div className="flex items-start justify-between gap-4">
              <BalanceIdentity balance={balance} />
              <BalanceStatus balance={balance} />
            </div>
            <div className="flex items-end justify-between gap-4">
              <BalanceValue balance={balance} />
              <HistoryButton
                onClick={(event) => onHistory(balance, event.currentTarget)}
                tutor={balance.tutor}
              />
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
  onClose,
  open,
}: {
  balance: BalanceRow | null;
  entries: MovementHistoryRow[];
  onClose: () => void;
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
              {balance.tutor}
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-foreground-secondary"
              id="hours-history-description"
            >
              Movimientos del {balance.cycle}. El saldo firmado original no se edita desde este historial.
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
                  {balance.signedBalance}
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

            {entries.length === 0 ? (
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
                          {formatDate(entry.date)} · {entry.category}
                        </p>
                        <p className="mt-1 text-xs text-foreground-muted">
                          {entry.directionLabel} · {entry.duration}
                        </p>
                      </div>
                      <StatusBadge
                        label={entry.reversalLabel}
                        variant={entry.reversalState === "reversed" ? "warning" : "neutral"}
                      />
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium text-foreground-muted">Nota</dt>
                        <dd className="mt-1 leading-6 text-foreground-secondary">{entry.note}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-foreground-muted">Actor</dt>
                        <dd className="mt-1 text-foreground-secondary">{entry.actor}</dd>
                      </div>
                    </dl>

                    {entry.reversalState === "reversed" && (
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
            Este historial es una vista previa local y no modifica movimientos.
          </p>
        </div>
      </div>
    </div>
  );
}

function MovementDialog({
  category,
  date,
  direction,
  durationHours,
  durationMinutes,
  data,
  note,
  onCategoryChange,
  onClose,
  onDateChange,
  onDirectionChange,
  onDurationHoursChange,
  onDurationMinutesChange,
  onNoteChange,
  onSubmit,
  onToggleAll,
  onToggleTutor,
  open,
  selectedTutorIds,
}: {
  category: string;
  date: string;
  direction: MovementDirection;
  durationHours: string;
  durationMinutes: string;
  data: HoursScreenData;
  note: string;
  onCategoryChange: (value: string) => void;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onDirectionChange: (value: MovementDirection) => void;
  onDurationHoursChange: (value: string) => void;
  onDurationMinutesChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleAll: () => void;
  onToggleTutor: (tutorId: string) => void;
  open: boolean;
  selectedTutorIds: string[];
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const eligibleTutors = data.movementDialog.eligibleTutors;
  const allSelected =
    eligibleTutors.length > 0 && selectedTutorIds.length === eligibleTutors.length;
  const hasPartialSelection = selectedTutorIds.length > 0 && !allSelected;
  const hasPositiveDuration =
    Number.parseInt(durationHours || "0", 10) > 0 ||
    Number.parseInt(durationMinutes || "0", 10) > 0;
  const canSubmit = Boolean(category && date && selectedTutorIds.length && hasPositiveDuration);
  const directionLabel =
    data.movementDialog.directionOptions.find((option) => option.value === direction)?.label ??
    direction;
  const summary = `${directionLabel} — ${category || "Sin categoría"} — ${formatDuration(
    durationHours,
    durationMinutes,
  )} — ${formatTutorCount(selectedTutorIds.length)} — ${date ? formatDate(date) : "Sin fecha"}`;

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
        className="flex h-full max-h-[100svh] w-full flex-col border-border bg-surface shadow-2xl sm:h-auto sm:max-h-[calc(100svh-3rem)] sm:max-w-[42rem] sm:rounded-md sm:border"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Vista previa local
            </p>
            <h2
              className="mt-2 text-xl font-bold tracking-tight text-foreground"
              id="hours-movement-title"
            >
              {data.movementDialog.title}
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-foreground-secondary"
              id="hours-movement-description"
            >
              Completar los datos para revisar el resumen antes de una futura integración.
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
            <fieldset>
              <legend className="text-sm font-bold text-foreground">
                {data.movementDialog.directionLabel}
              </legend>
              <div
                aria-label={data.movementDialog.directionLabel}
                className="mt-3 grid grid-cols-2 gap-2"
                role="radiogroup"
              >
                {data.movementDialog.directionOptions.map((option) => {
                  const isSelected = option.value === direction;

                  return (
                    <label
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center justify-center rounded-sm border px-4 text-sm font-semibold transition-colors focus-within:ring-3 focus-within:ring-ring",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-surface text-foreground-secondary hover:bg-surface-subtle",
                      )}
                      key={option.value}
                    >
                      <input
                        checked={isSelected}
                        className="sr-only"
                        name="movement-direction"
                        onChange={() => onDirectionChange(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground" htmlFor="movement-category">
                {data.movementDialog.categoryLabel}
              </label>
              <select
                className={selectClassName}
                id="movement-category"
                onChange={(event) => onCategoryChange(event.target.value)}
                required
                value={category}
              >
                {data.categories.map((categoryOption) => (
                  <option key={categoryOption} value={categoryOption}>
                    {categoryOption}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-foreground">
                {data.movementDialog.durationLabel}
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="movement-hours">
                    Horas
                  </label>
                  <Input
                    id="movement-hours"
                    inputMode="numeric"
                    max="99"
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
                {data.movementDialog.dateLabel}
              </label>
              <div className="relative">
                <CalendarDays
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
                />
                <Input
                  className="pl-9"
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
                {data.movementDialog.noteLabel}
              </label>
              <textarea
                className="min-h-24 w-full resize-y rounded-sm border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground shadow-xs outline-none transition-colors placeholder:text-foreground-muted focus-visible:ring-3 focus-visible:ring-ring"
                id="movement-note"
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Agregar contexto opcional"
                value={note}
              />
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-foreground">
                {data.movementDialog.tutorsLabel}
              </legend>
              <div className="mt-3 rounded-md border border-border-subtle bg-surface-subtle/60">
                <label className="flex items-center gap-3 border-b border-border-subtle px-4 py-3 text-sm font-semibold text-foreground">
                  <input
                    aria-checked={hasPartialSelection ? "mixed" : allSelected}
                    aria-label={data.movementDialog.selectAllLabel}
                    checked={allSelected}
                    className="h-4 w-4 rounded border-border text-primary accent-primary focus-visible:ring-3 focus-visible:ring-ring"
                    onChange={onToggleAll}
                    ref={selectAllRef}
                    type="checkbox"
                  />
                  <span>{data.movementDialog.selectAllLabel}</span>
                  <span className="ml-auto text-xs font-normal text-foreground-muted">
                    {selectedTutorIds.length} de {eligibleTutors.length}
                  </span>
                </label>
                <div aria-live="polite" className="sr-only">
                  {data.movementDialog.selectAllLabel}: {selectedTutorIds.length} de {eligibleTutors.length} tutores seleccionados
                  {hasPartialSelection ? ", selección mixta" : ""}.
                </div>
                <div className="divide-y divide-border-subtle">
                  {eligibleTutors.map((tutor) => {
                    const isSelected = selectedTutorIds.includes(tutor.id);

                    return (
                      <label className="flex cursor-pointer items-start gap-3 px-4 py-3" key={tutor.id}>
                        <input
                          aria-label={`Seleccionar a ${tutor.name}`}
                          checked={isSelected}
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-primary focus-visible:ring-3 focus-visible:ring-ring"
                          onChange={() => onToggleTutor(tutor.id)}
                          type="checkbox"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{tutor.name}</span>
                          <span className="mt-1 block text-xs leading-5 text-foreground-muted">{tutor.career}</span>
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
                Revisar dirección, categoría, duración, fecha y tutores antes de continuar.
              </p>
            </section>
          </div>

          <div className="border-t border-border bg-surface px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={onClose} type="button" variant="outline">
                Cancelar
              </Button>
              <Button disabled={!canSubmit} type="submit">
                <Check aria-hidden="true" />
                {data.movementDialog.submitLabel}
              </Button>
            </div>
            <p className="mt-3 text-center text-xs leading-5 text-foreground-muted sm:text-right">
              La selección y el resumen son locales. No se registraron movimientos en el sistema.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export function HoursScreen({ data, state = "default" }: HoursScreenProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BalanceFilter>("all");
  const [category, setCategory] = useState("");
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [historyBalance, setHistoryBalance] = useState<BalanceRow | null>(null);
  const [selectedTutorIds, setSelectedTutorIds] = useState<string[]>(() =>
    data.movementDialog.eligibleTutors.map((tutor) => tutor.id),
  );
  const [direction, setDirection] = useState<MovementDirection>("credit");
  const [movementCategory, setMovementCategory] = useState(data.categories[0] ?? "");
  const [durationHours, setDurationHours] = useState("01");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [movementDate, setMovementDate] = useState("2026-09-16");
  const [movementNote, setMovementNote] = useState("");
  const movementTriggerRef = useRef<HTMLElement | null>(null);
  const historyTriggerRef = useRef<HTMLElement | null>(null);

  const filteredBalances = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search.trim());

    return data.balances.filter((balance) => {
      const matchesSearch = !normalizedSearch || balanceSearchText(balance).includes(normalizedSearch);
      const matchesStatus = status === "all" || balance.state === status;
      const tutor = data.movementDialog.eligibleTutors.find(
        (eligibleTutor) => eligibleTutor.name === balance.tutor,
      );
      const matchesCategory =
        !category ||
        data.history.some(
          (entry) => entry.tutorId === tutor?.id && entry.category === category,
        );

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [category, data, search, status]);

  const hasActiveFilters = Boolean(search || category || status !== "all");
  const shouldShowSearchEmpty =
    state === "search-empty" ||
    (state === "default" && hasActiveFilters && filteredBalances.length === 0);
  const stateData = findStateData(state);
  const historyEntries = useMemo(
    () =>
      historyBalance
        ? data.history.filter((entry) => {
            const tutor = data.movementDialog.eligibleTutors.find(
              (eligibleTutor) => eligibleTutor.name === historyBalance.tutor,
            );
            return entry.tutorId === tutor?.id;
          })
        : [],
    [data, historyBalance],
  );

  const openMovementDialog = useCallback((trigger: HTMLElement) => {
    movementTriggerRef.current = trigger;
    setMovementDialogOpen(true);
  }, []);

  const closeMovementDialog = useCallback(() => {
    setMovementDialogOpen(false);
    const trigger = movementTriggerRef.current;

    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
        movementTriggerRef.current = null;
      });
    }
  }, []);

  const openHistory = useCallback(
    (balance: BalanceRow, trigger: HTMLElement) => {
      historyTriggerRef.current = trigger;
      setHistoryBalance(balance);
    },
    [],
  );

  const closeHistory = useCallback(() => {
    setHistoryBalance(null);
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
      const eligibleIds = data.movementDialog.eligibleTutors.map((tutor) => tutor.id);
      const allSelected = eligibleIds.length > 0 && currentSelection.length === eligibleIds.length;

      return allSelected ? [] : eligibleIds;
    });
  }, [data.movementDialog.eligibleTutors]);

  const handleToggleTutor = useCallback((tutorId: string) => {
    setSelectedTutorIds((currentSelection) =>
      currentSelection.includes(tutorId)
        ? currentSelection.filter((selectedId) => selectedId !== tutorId)
        : [...currentSelection, tutorId],
    );
  }, []);

  const handlePreviewSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAnnouncement(
        `Vista previa preparada para ${formatTutorCount(selectedTutorIds.length)}. No se registraron movimientos en el sistema.`,
      );
      closeMovementDialog();
    },
    [closeMovementDialog, selectedTutorIds.length],
  );

  const headerAction =
    state === "required-action" ? (
      <PreviewActionLink href="/admin/settings" label="Configurar ciclo" />
    ) : (
      <Button
        disabled={state === "loading"}
        onClick={(event) => openMovementDialog(event.currentTarget)}
        type="button"
      >
        <Plus aria-hidden="true" />
        Registrar movimiento
      </Button>
    );

  return (
    <>
      <div
        aria-hidden={movementDialogOpen || Boolean(historyBalance) ? true : undefined}
        data-slot="hours-screen"
        data-state={state}
      >
        <PageHeader
          action={headerAction}
          description={data.description}
          title="Horas"
        />

        {state === "success" && (
          <InlineStateNotice
            description="La vista está lista para revisión local. No se registraron movimientos ni se modificó un saldo."
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            title="Vista previa lista"
            tone="success"
          />
        )}

        {announcement && (
          <div
            aria-live="polite"
            className="mt-6 flex items-start gap-3 rounded-md border border-info/30 bg-info-surface/60 p-4"
            role="status"
          >
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <p className="text-sm leading-6 text-foreground">{announcement}</p>
          </div>
        )}

        {state === "error" && stateData && (
          <InlineStateNotice
            action={
              <PreviewActionLink
                href="/admin/hours"
                label={stateData.actionLabel ?? "Reintentar"}
              />
            }
            description={stateData.description}
            icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
            title={stateData.title}
            tone="danger"
          />
        )}

        {state === "required-action" && stateData && (
          <InlineStateNotice
            action={
              <PreviewActionLink
                href="/admin/settings"
                label={stateData.actionLabel ?? "Configurar ciclo"}
              />
            }
            description={stateData.description}
            icon={<Settings2 aria-hidden="true" className="h-5 w-5" />}
            title={stateData.title}
            tone="warning"
          />
        )}

        {state !== "error" && state !== "required-action" && (
          <>
            <FilterToolbar
              category={category}
              categoryLabel={data.categoryFilterLabel}
              categories={data.categories}
              disabled={state === "loading" || state === "empty"}
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
              {state === "loading"
                ? "Preparando los saldos del ciclo…"
                : state === "empty"
                  ? "Todavía no hay saldos cargados."
                  : shouldShowSearchEmpty
                    ? "No hay resultados para la búsqueda actual."
                    : `Mostrando ${formatTutorCount(filteredBalances.length)}`}
            </p>

            {state === "loading" && <LoadingBalanceList />}

            {state === "empty" && (
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

            {state !== "loading" &&
              state !== "empty" &&
              !shouldShowSearchEmpty && (
                <BalanceLists balances={filteredBalances} onHistory={openHistory} />
              )}
          </>
        )}
      </div>

      <MovementDialog
        category={movementCategory}
        date={movementDate}
        direction={direction}
        durationHours={durationHours}
        durationMinutes={durationMinutes}
        data={data}
        note={movementNote}
        onCategoryChange={setMovementCategory}
        onClose={closeMovementDialog}
        onDateChange={setMovementDate}
        onDirectionChange={setDirection}
        onDurationHoursChange={setDurationHours}
        onDurationMinutesChange={setDurationMinutes}
        onNoteChange={setMovementNote}
        onSubmit={handlePreviewSubmit}
        onToggleAll={handleToggleAll}
        onToggleTutor={handleToggleTutor}
        open={movementDialogOpen}
        selectedTutorIds={selectedTutorIds}
      />

      <MovementHistorySheet
        balance={historyBalance}
        entries={historyEntries}
        onClose={closeHistory}
        open={Boolean(historyBalance)}
      />
    </>
  );
}
