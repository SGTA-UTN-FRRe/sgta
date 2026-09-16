"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  CircleAlert,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import {
  type FormEvent,
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
  goldenScreenStateFixtures,
  type GoldenStateFixture,
  type TutorGoldenFixture,
  type TutorsGoldenFixture,
  type TutorStatus,
} from "@/features/golden-screens/fixtures";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge, type StatusBadgeVariant } from "@/shared/components/status-badge";
import { cn } from "@/shared/utils";

export type TutorsScreenState =
  | "default"
  | "loading"
  | "empty"
  | "search-empty"
  | "error"
  | "success"
  | "required-action";

export interface TutorsScreenProps {
  fixture: TutorsGoldenFixture;
  state?: TutorsScreenState;
}

type FilterStatus = TutorStatus | "all";
type SheetMode = "add" | "edit" | "view";
type SheetState = { mode: SheetMode; tutor?: TutorGoldenFixture } | null;

const selectClassName =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const stateVariants: Record<TutorStatus, StatusBadgeVariant> = {
  active: "success",
  inactive: "neutral",
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function findStateFixture(state: TutorsScreenState): GoldenStateFixture | undefined {
  if (state === "default" || state === "success") {
    return undefined;
  }

  return goldenScreenStateFixtures.tutors.find(
    (stateFixture) => stateFixture.state === state,
  );
}

function normalizeSearchValue(value: string) {
  return value
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tutorSearchText(tutor: TutorGoldenFixture) {
  return normalizeSearchValue(
    [tutor.name, tutor.career, tutor.scholarship].join(" "),
  );
}

function formatTutorCount(count: number) {
  return `${count} ${count === 1 ? "tutor" : "tutores"}`;
}

function TutorStatus({ tutor }: { tutor: TutorGoldenFixture }) {
  return (
    <StatusBadge
      label={tutor.statusLabel}
      variant={stateVariants[tutor.status]}
    />
  );
}

function TutorIdentity({
  showScholarship,
  tutor,
}: {
  showScholarship?: boolean;
  tutor: TutorGoldenFixture;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{tutor.name}</p>
      <p className="mt-1 truncate text-xs text-foreground-muted">
        {tutor.cycleLabel}
      </p>
      {showScholarship && (
        <p className="mt-1 truncate text-xs text-foreground-secondary">
          Beca: {tutor.scholarship}
        </p>
      )}
    </div>
  );
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

function FilterToolbar({
  career,
  careerLabel,
  careers,
  disabled,
  onCareerChange,
  onClear,
  onSearchChange,
  onStatusChange,
  search,
  searchPlaceholder,
  status,
  statusLabel,
}: {
  career: string;
  careerLabel: string;
  careers: string[];
  disabled: boolean;
  onCareerChange: (value: string) => void;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: FilterStatus) => void;
  search: string;
  searchPlaceholder: string;
  status: FilterStatus;
  statusLabel: string;
}) {
  const hasActiveFilters = Boolean(search || career || status !== "all");

  return (
    <div className="mt-6 rounded-md border border-border-subtle bg-surface-subtle/60 p-4">
      <div className="grid gap-4 md:grid-cols-2 md:items-end xl:grid-cols-[minmax(15rem,1fr)_minmax(12rem,0.7fr)_minmax(12rem,0.7fr)_auto]">
        <div className="space-y-1.5">
          <label
            className="text-xs font-semibold text-foreground-secondary"
            htmlFor="tutor-search"
          >
            Buscar tutor
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
            />
            <Input
              aria-label="Buscar tutor"
              className="pl-9"
              disabled={disabled}
              id="tutor-search"
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
            htmlFor="tutor-career"
          >
            {careerLabel}
          </label>
          <select
            className={selectClassName}
            disabled={disabled}
            id="tutor-career"
            onChange={(event) => onCareerChange(event.target.value)}
            value={career}
          >
            <option value="">Todas las carreras</option>
            {careers.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            className="text-xs font-semibold text-foreground-secondary"
            htmlFor="tutor-status"
          >
            {statusLabel}
          </label>
          <select
            className={selectClassName}
            disabled={disabled}
            id="tutor-status"
            onChange={(event) =>
              onStatusChange(event.target.value as FilterStatus)
            }
            value={status}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <Button
          className="self-end"
          disabled={disabled || !hasActiveFilters}
          onClick={onClear}
          size="sm"
          type="button"
          variant="ghost"
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}

function TutorActionsMenu({
  menuKey,
  onOpenSheet,
  onPreviewAction,
  onToggle,
  openMenuKey,
  tutor,
  view,
}: {
  menuKey: string;
  onOpenSheet: (
    mode: Exclude<SheetMode, "add">,
    tutor: TutorGoldenFixture,
    trigger: HTMLElement,
  ) => void;
  onPreviewAction: (action: string, tutor: TutorGoldenFixture) => void;
  onToggle: (menuKey: string | null) => void;
  openMenuKey: string | null;
  tutor: TutorGoldenFixture;
  view: "compact" | "medium" | "wide";
}) {
  const isOpen = openMenuKey === menuKey;
  const actionLabel = tutor.status === "active" ? "Desactivar tutor" : "Reactivar";
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative flex justify-end">
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Acciones para ${tutor.name}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        onClick={() => onToggle(isOpen ? null : menuKey)}
        ref={menuButtonRef}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          aria-label={`Acciones para ${tutor.name}`}
          className={cn(
            "absolute right-0 top-full z-30 mt-1 min-w-48 rounded-md border border-border bg-surface p-1 shadow-lg",
            view === "compact" && "right-0",
          )}
          role="menu"
        >
          <button
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-none"
            onClick={(event) =>
              onOpenSheet("view", tutor, menuButtonRef.current ?? event.currentTarget)
            }
            role="menuitem"
            type="button"
          >
            <UserRound aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
            Ver detalle
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-none"
            onClick={(event) =>
              onOpenSheet("edit", tutor, menuButtonRef.current ?? event.currentTarget)
            }
            role="menuitem"
            type="button"
          >
            <Pencil aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
            Editar
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-none"
            onClick={(event) =>
              onOpenSheet("view", tutor, menuButtonRef.current ?? event.currentTarget)
            }
            role="menuitem"
            type="button"
          >
            <BookOpen aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
            Ver materias
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-none"
            onClick={() => onPreviewAction(actionLabel, tutor)}
            role="menuitem"
            type="button"
          >
            {tutor.status === "active" ? (
              <Power aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
            ) : (
              <RefreshCw aria-hidden="true" className="h-4 w-4 text-foreground-muted" />
            )}
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function TutorWideTable({
  onOpenSheet,
  onPreviewAction,
  onToggleMenu,
  openMenuKey,
  rows,
}: {
  onOpenSheet: (
    mode: Exclude<SheetMode, "add">,
    tutor: TutorGoldenFixture,
    trigger: HTMLElement,
  ) => void;
  onPreviewAction: (action: string, tutor: TutorGoldenFixture) => void;
  onToggleMenu: (menuKey: string | null) => void;
  openMenuKey: string | null;
  rows: TutorGoldenFixture[];
}) {
  return (
    <div className="hidden overflow-x-auto rounded-md border border-border bg-surface lg:block">
      <Table className="min-w-[62rem]">
        <caption className="sr-only">Lista de tutores</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[24%]" scope="col">
              Tutor
            </TableHead>
            <TableHead className="w-[25%]" scope="col">
              Carrera
            </TableHead>
            <TableHead className="w-[18%]" scope="col">
              Beca
            </TableHead>
            <TableHead className="w-[13%]" scope="col">
              Materias
            </TableHead>
            <TableHead className="w-[14%]" scope="col">
              Estado
            </TableHead>
            <TableHead className="w-12 text-right" scope="col">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tutor) => (
            <TableRow key={tutor.id}>
              <TableCell>
                <TutorIdentity tutor={tutor} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-foreground">{tutor.career}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-foreground-secondary">
                  {tutor.scholarship}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm tabular-nums text-foreground">
                  {tutor.subjectCount} {tutor.subjectCount === 1 ? "materia" : "materias"}
                </span>
              </TableCell>
              <TableCell>
                <TutorStatus tutor={tutor} />
              </TableCell>
              <TableCell className="text-right">
                <TutorActionsMenu
                  menuKey={`wide:${tutor.id}`}
                  onOpenSheet={onOpenSheet}
                  onPreviewAction={onPreviewAction}
                  onToggle={onToggleMenu}
                  openMenuKey={openMenuKey}
                  tutor={tutor}
                  view="wide"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TutorMediumTable({
  onOpenSheet,
  onPreviewAction,
  onToggleMenu,
  openMenuKey,
  rows,
}: {
  onOpenSheet: (
    mode: Exclude<SheetMode, "add">,
    tutor: TutorGoldenFixture,
    trigger: HTMLElement,
  ) => void;
  onPreviewAction: (action: string, tutor: TutorGoldenFixture) => void;
  onToggleMenu: (menuKey: string | null) => void;
  openMenuKey: string | null;
  rows: TutorGoldenFixture[];
}) {
  return (
    <div className="hidden overflow-x-auto rounded-md border border-border bg-surface md:block lg:hidden">
      <Table className="min-w-[40rem]">
        <caption className="sr-only">Lista de tutores</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[31%]" scope="col">
              Tutor
            </TableHead>
            <TableHead className="w-[34%]" scope="col">
              Carrera
            </TableHead>
            <TableHead className="w-[16%]" scope="col">
              Materias
            </TableHead>
            <TableHead className="w-[15%]" scope="col">
              Estado
            </TableHead>
            <TableHead className="w-12 text-right" scope="col">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tutor) => (
            <TableRow key={tutor.id}>
              <TableCell>
                <TutorIdentity showScholarship tutor={tutor} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-foreground">{tutor.career}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm tabular-nums text-foreground">
                  {tutor.subjectCount} {tutor.subjectCount === 1 ? "materia" : "materias"}
                </span>
              </TableCell>
              <TableCell>
                <TutorStatus tutor={tutor} />
              </TableCell>
              <TableCell className="text-right">
                <TutorActionsMenu
                  menuKey={`medium:${tutor.id}`}
                  onOpenSheet={onOpenSheet}
                  onPreviewAction={onPreviewAction}
                  onToggle={onToggleMenu}
                  openMenuKey={openMenuKey}
                  tutor={tutor}
                  view="medium"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TutorCompactList({
  onOpenSheet,
  onPreviewAction,
  onToggleMenu,
  openMenuKey,
  rows,
}: {
  onOpenSheet: (
    mode: Exclude<SheetMode, "add">,
    tutor: TutorGoldenFixture,
    trigger: HTMLElement,
  ) => void;
  onPreviewAction: (action: string, tutor: TutorGoldenFixture) => void;
  onToggleMenu: (menuKey: string | null) => void;
  openMenuKey: string | null;
  rows: TutorGoldenFixture[];
}) {
  return (
    <ul className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border bg-surface md:hidden">
      {rows.map((tutor) => (
        <li className="p-4" key={tutor.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">{tutor.name}</p>
              <p className="mt-1 text-sm leading-6 text-foreground-secondary">
                {tutor.career}
              </p>
            </div>
            <TutorActionsMenu
              menuKey={`compact:${tutor.id}`}
              onOpenSheet={onOpenSheet}
              onPreviewAction={onPreviewAction}
              onToggle={onToggleMenu}
              openMenuKey={openMenuKey}
              tutor={tutor}
              view="compact"
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border-subtle pt-4">
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Beca</dt>
              <dd className="mt-1 truncate text-sm text-foreground">{tutor.scholarship}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-foreground-muted">Materias</dt>
              <dd className="mt-1 text-sm tabular-nums text-foreground">
                {tutor.subjectCount} {tutor.subjectCount === 1 ? "materia" : "materias"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-medium text-foreground-muted">Estado</dt>
              <dd className="mt-1">
                <TutorStatus tutor={tutor} />
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function TutorList({
  onOpenSheet,
  onPreviewAction,
  onToggleMenu,
  openMenuKey,
  rows,
}: {
  onOpenSheet: (
    mode: Exclude<SheetMode, "add">,
    tutor: TutorGoldenFixture,
    trigger: HTMLElement,
  ) => void;
  onPreviewAction: (action: string, tutor: TutorGoldenFixture) => void;
  onToggleMenu: (menuKey: string | null) => void;
  openMenuKey: string | null;
  rows: TutorGoldenFixture[];
}) {
  return (
    <div className="mt-4">
      <TutorWideTable
        onOpenSheet={onOpenSheet}
        onPreviewAction={onPreviewAction}
        onToggleMenu={onToggleMenu}
        openMenuKey={openMenuKey}
        rows={rows}
      />
      <TutorMediumTable
        onOpenSheet={onOpenSheet}
        onPreviewAction={onPreviewAction}
        onToggleMenu={onToggleMenu}
        openMenuKey={openMenuKey}
        rows={rows}
      />
      <TutorCompactList
        onOpenSheet={onOpenSheet}
        onPreviewAction={onPreviewAction}
        onToggleMenu={onToggleMenu}
        openMenuKey={openMenuKey}
        rows={rows}
      />
    </div>
  );
}

function LoadingTutorList() {
  const rows = ["one", "two", "three", "four"];

  return (
    <div
      aria-label="Cargando tutores"
      aria-live="polite"
      className="mt-4 overflow-hidden rounded-md border border-border bg-surface"
      role="status"
    >
      <span className="sr-only">Cargando tutores</span>
      <div className="hidden lg:block">
        <div className="grid grid-cols-[1.3fr_1.4fr_1fr_0.7fr_0.8fr_3rem] gap-4 border-b border-border px-3 py-3">
          {rows.slice(0, 6).map((key) => (
            <span className="h-3 animate-pulse rounded-sm bg-surface-subtle" key={key} />
          ))}
        </div>
        {rows.map((key) => (
          <div
            className="grid grid-cols-[1.3fr_1.4fr_1fr_0.7fr_0.8fr_3rem] gap-4 border-b border-border-subtle px-3 py-5 last:border-b-0"
            key={key}
          >
            <span className="h-4 w-32 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-4 w-44 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-4 w-24 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-4 w-12 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-6 w-16 animate-pulse rounded-full bg-surface-subtle" />
            <span className="h-8 w-8 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
      <div className="hidden md:block lg:hidden">
        {rows.map((key) => (
          <div
            className="grid grid-cols-[1fr_1.2fr_0.6fr_0.7fr_2rem] gap-4 border-b border-border-subtle px-3 py-5 last:border-b-0"
            key={key}
          >
            <span className="h-4 w-32 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-4 w-44 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-4 w-12 animate-pulse rounded-sm bg-surface-subtle" />
            <span className="h-6 w-16 animate-pulse rounded-full bg-surface-subtle" />
            <span className="h-8 w-8 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
      <div className="md:hidden">
        {rows.map((key) => (
          <div className="border-b border-border-subtle p-4 last:border-b-0" key={key}>
            <div className="h-5 w-36 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-2 h-4 w-48 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-5 h-16 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
        ))}
      </div>
    </div>
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

function TutorSheet({
  careers,
  mode,
  onClose,
  onPreviewSaved,
  open,
  tutor,
}: {
  careers: string[];
  mode: SheetMode | null;
  onClose: () => void;
  onPreviewSaved: () => void;
  open: boolean;
  tutor?: TutorGoldenFixture;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !mode || !panelRef.current) {
      return;
    }

    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

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
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode, onClose, open]);

  if (!open || !mode) {
    return null;
  }

  const isView = mode === "view";
  const isAdd = mode === "add";
  const title = isAdd
    ? "Agregar tutor"
    : `${mode === "edit" ? "Editar" : "Detalle de"} ${tutor?.name ?? "tutor"}`;
  const description = isAdd
    ? "Completá la ficha para revisar la estructura del registro."
    : "Consultá el contexto académico y la información vigente del tutor.";
  const [lastName = "", firstName = ""] = tutor?.name
    .split(",")
    .map((part) => part.trim()) ?? [];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPreviewSaved();
    onClose();
  }

  return (
    <div
      aria-label="Cerrar panel de tutor"
      className="fixed inset-0 z-[70] flex justify-end bg-brand-navy/30"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby="tutor-sheet-description"
        aria-labelledby="tutor-sheet-title"
        aria-modal="true"
        className="flex h-full w-full max-w-[36rem] flex-col border-l border-border bg-surface shadow-2xl"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Ficha de tutor
            </p>
            <h2 className="mt-2 truncate text-xl font-bold tracking-tight text-foreground" id="tutor-sheet-title">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground-secondary" id="tutor-sheet-description">
              {description}
            </p>
          </div>
          <button
            aria-label="Cerrar panel de tutor"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <section aria-labelledby="tutor-identity-heading">
              <h3 className="text-sm font-bold text-foreground" id="tutor-identity-heading">
                Identidad
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="tutor-first-name">
                    Nombre
                  </label>
                  <Input
                    defaultValue={firstName}
                    id="tutor-first-name"
                    placeholder="Nombre"
                    readOnly={isView}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="tutor-last-name">
                    Apellido
                  </label>
                  <Input
                    defaultValue={lastName}
                    id="tutor-last-name"
                    placeholder="Apellido"
                    readOnly={isView}
                  />
                </div>
              </div>
            </section>

            <section aria-labelledby="tutor-academic-heading">
              <h3 className="text-sm font-bold text-foreground" id="tutor-academic-heading">
                Contexto académico
              </h3>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground-secondary" htmlFor="tutor-career-sheet">
                    Carrera
                  </label>
                  <select
                    className={selectClassName}
                    defaultValue={tutor?.career ?? ""}
                    disabled={isView}
                    id="tutor-career-sheet"
                  >
                    <option value="">Seleccioná una carrera</option>
                    {careers.map((career) => (
                      <option key={career} value={career}>
                        {career}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section aria-labelledby="tutor-subjects-heading">
              <h3 className="text-sm font-bold text-foreground" id="tutor-subjects-heading">
                Materias
              </h3>
              <div className="mt-4 rounded-md border border-border-subtle bg-surface-subtle/60 p-4">
                <div className="flex items-start gap-3">
                  <BookOpen aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {tutor ? `${tutor.subjectCount} materias asignadas` : "Se completa desde el catálogo"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-foreground-secondary">
                      La relación de materias se deriva del catálogo académico y sus asignaciones vigentes.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="tutor-cycle-heading">
              <h3 className="text-sm font-bold text-foreground" id="tutor-cycle-heading">
                Ciclo y beca
              </h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-border-subtle p-4">
                  <dt className="text-xs font-medium text-foreground-muted">Ciclo</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {tutor?.cycleLabel ?? "2.º cuatrimestre 2026"}
                  </dd>
                </div>
                <div className="rounded-md border border-border-subtle p-4">
                  <dt className="text-xs font-medium text-foreground-muted">Beca</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {tutor?.scholarship ?? "Pendiente de referencia"}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="tutor-status-heading">
              <h3 className="text-sm font-bold text-foreground" id="tutor-status-heading">
                Estado
              </h3>
              <div className="mt-4 flex items-center gap-3">
                {tutor ? (
                  <TutorStatus tutor={tutor} />
                ) : (
                  <StatusBadge label="Nuevo · vista previa" variant="neutral" />
                )}
                <span className="text-sm text-foreground-secondary">
                  {isView ? "Estado actual del registro." : "Se revisa antes de una futura integración."}
                </span>
              </div>
            </section>
          </div>

          <div className="border-t border-border bg-surface px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={onClose} type="button" variant="outline">
                Cerrar
              </Button>
              {!isView && (
                <Button type="submit">
                  Guardar vista previa
                </Button>
              )}
            </div>
            {!isView && (
              <p className="mt-3 text-center text-xs leading-5 text-foreground-muted sm:text-right">
                Este preview no persiste cambios ni modifica tutores reales.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export function TutorsScreen({
  fixture,
  state = "default",
}: TutorsScreenProps) {
  const [search, setSearch] = useState("");
  const [career, setCareer] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const lastSheetTriggerRef = useRef<HTMLElement | null>(null);

  const careers = useMemo(
    () => Array.from(new Set(fixture.rows.map((tutor) => tutor.career))),
    [fixture.rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search.trim());

    return fixture.rows.filter((tutor) => {
      const matchesSearch =
        !normalizedSearch || tutorSearchText(tutor).includes(normalizedSearch);
      const matchesCareer = !career || tutor.career === career;
      const matchesStatus = status === "all" || tutor.status === status;

      return matchesSearch && matchesCareer && matchesStatus;
    });
  }, [career, fixture.rows, search, status]);

  const hasActiveFilters = Boolean(search || career || status !== "all");
  const shouldShowSearchEmpty =
    state === "search-empty" ||
    (state === "default" && hasActiveFilters && filteredRows.length === 0);
  const stateFixture = findStateFixture(state);

  const openSheet = useCallback(
    (
      mode: SheetMode,
      tutor: TutorGoldenFixture | undefined,
      trigger: HTMLElement,
    ) => {
      lastSheetTriggerRef.current = trigger;
      setOpenMenuKey(null);
      setSheet({ mode, tutor });
    },
    [],
  );

  const closeSheet = useCallback(() => {
    setSheet(null);
    const trigger = lastSheetTriggerRef.current;
    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
        lastSheetTriggerRef.current = null;
      });
    }
  }, []);

  const handlePreviewSaved = useCallback(() => {
    setAnnouncement(
      "La ficha se actualizó solo en esta vista previa; no se guardaron datos.",
    );
  }, []);

  const handlePreviewAction = useCallback(
    (action: string, tutor: TutorGoldenFixture) => {
      setOpenMenuKey(null);
      setAnnouncement(
        `${action} para ${tutor.name} queda fuera de este preview. No se modificaron datos.`,
      );
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setCareer("");
    setStatus("all");
  }, []);

  useEffect(() => {
    if (!openMenuKey || sheet) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenMenuKey(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [openMenuKey, sheet]);

  const headerAction =
    state === "required-action" ? (
      <PreviewActionLink href="/admin/configuracion" label="Configurar ciclo" />
    ) : (
      <Button
        disabled={state === "loading"}
        onClick={(event) => openSheet("add", undefined, event.currentTarget)}
        type="button"
      >
        <Plus aria-hidden="true" />
        {fixture.emptyAction}
      </Button>
    );

  const sheetMode = sheet?.mode ?? null;

  return (
    <>
      <div
        aria-hidden={sheet ? true : undefined}
        data-slot="tutors-screen"
        data-state={state}
      >
        <PageHeader
          action={headerAction}
          description={fixture.description}
          title="Tutores"
        />

        {state === "success" && (
          <InlineStateNotice
            description="La vista se actualizó localmente para revisión. No se guardaron cambios en el sistema."
            icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
            title="Vista actualizada"
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

        {state === "error" && stateFixture && (
          <InlineStateNotice
            action={
              <PreviewActionLink
                href="/admin/tutores"
                label={stateFixture.actionLabel ?? "Reintentar"}
              />
            }
            description={stateFixture.description}
            icon={<CircleAlert aria-hidden="true" className="h-5 w-5" />}
            title={stateFixture.title}
            tone="danger"
          />
        )}

        {state === "required-action" && stateFixture && (
          <InlineStateNotice
            action={
              <PreviewActionLink
                href="/admin/configuracion"
                label={stateFixture.actionLabel ?? "Configurar ciclo"}
              />
            }
            description={stateFixture.description}
            icon={<Settings2 aria-hidden="true" className="h-5 w-5" />}
            title={stateFixture.title}
            tone="warning"
          />
        )}

        {state !== "error" && state !== "required-action" && (
          <>
            <FilterToolbar
              career={career}
              careerLabel={fixture.careerFilterLabel}
              careers={careers}
              disabled={state === "loading" || state === "empty"}
              onCareerChange={setCareer}
              onClear={clearFilters}
              onSearchChange={setSearch}
              onStatusChange={setStatus}
              search={search}
              searchPlaceholder={fixture.searchPlaceholder}
              status={status}
              statusLabel={fixture.statusFilterLabel}
            />

            <p
              aria-live="polite"
              className="mt-4 text-sm text-foreground-secondary"
            >
              {state === "loading"
                ? "Preparando la lista de tutores…"
                : state === "empty"
                  ? "Todavía no hay tutores cargados."
                  : shouldShowSearchEmpty
                    ? "No hay resultados para la búsqueda actual."
                : `Mostrando ${formatTutorCount(filteredRows.length)}`}
            </p>

            {state === "loading" && <LoadingTutorList />}

            {state === "empty" && (
              <div className="mt-4">
                <EmptyState
                  action={
                    <Button
                      onClick={(event) =>
                        openSheet("add", undefined, event.currentTarget)
                      }
                      type="button"
                    >
                      <Plus aria-hidden="true" />
                      {fixture.emptyAction}
                    </Button>
                  }
                  description="Agregá el primer tutor para comenzar a organizar la cobertura."
                  title={fixture.emptyTitle}
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
                  description={
                    stateFixture?.description ??
                    "Probá con otro nombre o limpiá los filtros."
                  }
                  title={stateFixture?.title ?? "No encontramos tutores"}
                />
              </div>
            )}

            {state !== "loading" &&
              state !== "empty" &&
              !shouldShowSearchEmpty && (
                <TutorList
                  onOpenSheet={openSheet}
                  onPreviewAction={handlePreviewAction}
                  onToggleMenu={setOpenMenuKey}
                  openMenuKey={openMenuKey}
                  rows={filteredRows}
                />
              )}
          </>
        )}
      </div>

      <TutorSheet
        careers={careers}
        mode={sheetMode}
        onClose={closeSheet}
        onPreviewSaved={handlePreviewSaved}
        open={Boolean(sheet)}
        tutor={sheet?.tutor}
      />
    </>
  );
}
